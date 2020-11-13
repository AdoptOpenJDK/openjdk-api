const _ = require('underscore');
const fs = require('fs');
const Q = require('q');
const { Octokit } = require('@octokit/rest');
// This avoid the race conditions when octokit is throttling our api requests
const { retry } = require("@octokit/plugin-retry");
let octokit;
const MyOctokit = Octokit.plugin(retry);
const CronJob = require('cron').CronJob;
const logger = console;

// We only go to 12 as we're encouraging folks to move to v3 API
const LOWEST_JAVA_VERSION = 8;
const HIGHEST_JAVA_VERSION = 12;

function readAuthCreds() {
  try {
    logger.log("Reading auth token");
    var token;

    if (fs.existsSync('/home/jenkins/github.auth')) {
      console.log("Using AUTH from Jenkins github.auth");
      token = fs.readFileSync('/home/jenkins/github.auth').toString("ascii").trim();
    } else if (process.env.GITHUB_TOKEN) {
      console.log("Using AUTH from GITHUB_TOKEN");
      token = process.env.GITHUB_TOKEN;
    }

    if (token !== undefined) {
      console.log("Valid token exists, authenticating via Octokit");
      octokit = new MyOctokit( {auth: token, request: { retries: 3, retryAfter: 1 }} );
      return true;
    }

  } catch (e) {
    // Ignore
    logger.warn("No GitHub credentials found", e);
  }

  console.log("No valid token exists, creating non authenticated Octokit connection");
  octokit = new MyOctokit( {} );

  return false;
}

function getCooldown(auth) {
  if (auth) {
    // 15 min
    //return '0 */15 * * * *';
    // 12 hours - TODO set back to 15 mins once we fix the await/async nature of our refresh
    return '0 0 */12 * * *';
  } else {
    // 60 min
    return '0 */60 * * * *';
  }
}

function markOldReleases(oldReleases) {
  return _.chain(oldReleases)
    .map(function (release) {
      release.oldRepo = true;
      return release;
    })
    .value();
}

function formErrorResponse(error, response, body) {
  return {
    error: error,
    response: response,
    body: body
  };
}

// This caches data returned by the github api to speed up response time and avoid going over github api rate limiting
class GitHubFileCache {

  constructor(disableCron) {
    console.log('Constructing the GitHubFileCache');  
    this.auth = readAuthCreds();
    this.cache = {};
    this.repos = _.chain(_.range(LOWEST_JAVA_VERSION, HIGHEST_JAVA_VERSION + 1))
      .map(num => {
        return [
          `openjdk${num}-openj9-nightly`,
          `openjdk${num}-nightly`,
          `openjdk${num}-binaries`
        ];
      })
      .flatten()
      .values();
    console.log('Repos: ' + this.repos);  

    if (disableCron !== true) {
      console.log('Cron is enabled so scheduling a cache refresh');
      this.scheduleCacheRefresh();
    }
  }

  refreshCache(cache) {
    console.log('Refreshing cache at:', new Date());

    return _.chain(this.repos)
      .map(repo => this.getReleaseDataFromGithub(repo, cache))
      .value();
  }

  scheduleCacheRefresh() {
    const refresh = () => {
      try {
        const cache = {};
        Q.allSettled(this.refreshCache(cache))
          .then(() => {
            this.cache = cache;
            console.log("Cache refreshed at:", new Date());
          });
      } catch (e) {
        console.error(e);
      }
    };

    new CronJob(getCooldown(this.auth), refresh, undefined, true, undefined, undefined, true);
  }

  getReleaseDataFromGithub(repo, cache) {
    return octokit
      .paginate(`GET /repos/AdoptOpenJDK/${repo}/releases`, {
        owner: 'AdoptOpenJDK',
        repo: repo,
        per_page: 100
      })
      .then(data => {
        cache[repo] = data;
        return data;
      });
  }

  cachedGet(repo) {
    const data = this.cache[repo];
    if (data === undefined) {
      return this.getReleaseDataFromGithub(repo, this.cache)
        .catch(error => {
          if (error.request.request.retryCount) {
            console.error(`request failed after ${error.request.request.retryCount} retries`);
          }
          console.error('error: ' + error + ' getting data from repo: ' + repo);
          this.cache[repo] = [];
          return [];
        });
    } else {
      return Q(data);
    }
  }

  getInfoForVersion(version, releaseType) {

    const newRepoPromise = this.cachedGet(`${version}-binaries`);

    const legacyHotspotPromise = this.cachedGet(`${version}-${releaseType}`);
    let legacyOpenj9Promise;

    if (version.indexOf('amber') > 0) {
      legacyOpenj9Promise = Q({});
    } else {
      legacyOpenj9Promise = this.cachedGet(`${version}-openj9-${releaseType}`);
    }

    return Q.allSettled([
      newRepoPromise,
      legacyHotspotPromise,
      legacyOpenj9Promise
    ])
      .catch(error => {
        console.error("failed to get", error);
        return [];
      })
      .spread(function (newData, oldHotspotData, oldOpenJ9Data) {
        if (newData.state === "fulfilled" || oldHotspotData.state === "fulfilled" || oldOpenJ9Data.state === "fulfilled") {
          newData = newData.state === "fulfilled" ? newData.value : [];
          oldHotspotData = oldHotspotData.state === "fulfilled" ? oldHotspotData.value : [];
          oldOpenJ9Data = oldOpenJ9Data.state === "fulfilled" ? oldOpenJ9Data.value : [];

          oldHotspotData = markOldReleases(oldHotspotData);
          oldOpenJ9Data = markOldReleases(oldOpenJ9Data);
          return _.union(newData, oldHotspotData, oldOpenJ9Data);
        } else {
          throw newData.reason;
        }
      });
  }
}

module.exports = GitHubFileCache;
