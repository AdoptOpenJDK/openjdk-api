const _ = require('underscore');
const fs = require('fs');
const Q = require('q');
const octokit = require('@octokit/rest')();
var CronJob = require('cron').CronJob;

// How many tasks can run in parallel.
// 3 was chosen for the common 1 new repo, 2 old repo calls, but realistically the queue length
// will vary over time.
const logger = console;

function readAuthCreds() {
  try {
    logger.log("Reading auth");
    var token;


    if (fs.existsSync('/home/jenkins/github.auth')) {
      token = fs.readFileSync('/home/jenkins/github.auth').toString("ascii").trim();
    } else if (fs.existsSync('auth/github.auth')) {
      token = fs.readFileSync('auth/github.auth').toString("ascii").trim();
    }

    if (token !== undefined) {
      octokit.authenticate({
        type: 'token',
        token: token
      });
    }

  } catch (e) {
    //ignore
  }

  logger.log("No github creds found");
  return null;
}

function authIsValid(auth) {
  return auth !== undefined && auth !== null && auth.length > 0;
}


function getCooldown(auth) {
  if (authIsValid(auth)) {
    // 5 min (in ms)
    return '0 */5 * * * *';
  } else {
    // 30 min (in ms)
    return '0 */30 * * * *';
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
    this.auth = readAuthCreds();
    this.cache = {};
    this.repos = _.chain(_.range(8, 12))
      .map(num => {
        return [
          `openjdk${num}-openj9-nightly`,
          `openjdk${num}-nightly`,
          `openjdk${num}-binaries`
        ]
      })
      .flatten()
      .values();

    if (disableCron !== true) {
      this.scheduleCacheRefresh();
    }
  }

  refreshCache() {
    console.log('Refresh at:', new Date());

    return _.chain(this.repos)
      .map(repo => this.getDataFromGithub(repo, false))
      .value();
  }

  scheduleCacheRefresh() {

    const refresh = () => {
      try {
        Q.allSettled(this.refreshCache())
          .then(function () {
            console.log("Cache refreshed")
          })
      } catch (e) {
        console.error(e)
      }
    };

    new CronJob(getCooldown(this.auth), refresh, undefined, true, undefined, undefined, true);
  }

  getDataFromGithub(repo) {
    const cache = this.cache;


    return octokit
      .paginate(`GET /repos/AdoptOpenJDK/${repo}/releases`, {
        owner: 'AdoptOpenJDK',
        repo: repo
      })
      .then(data => {
        cache[repo] = data;
        return data;
      });
  }

  cachedGet(repo) {
    const data = this.cache[repo];

    if (data === undefined) {
      return this.getDataFromGithub(repo)
        .catch(error => {
          return [];
        })
    } else {
      const deferred = Q.defer();
      deferred.resolve(data)
      return deferred.promise
    }
  }

  getInfoForVersion(version, releaseType) {

    const newHotspotPromise = this.cachedGet(`${version}-binaries`);

    const hotspotPromise = this.cachedGet(`${version}-${releaseType}`);
    let openj9Promise;

    if (version.indexOf('amber') > 0) {
      openj9Promise = Q.fcall(function () {
        return {}
      });
    } else {
      openj9Promise = this.cachedGet(`${version}-openj9-${releaseType}`);
    }

    return Q.allSettled([
      newHotspotPromise,
      hotspotPromise,
      openj9Promise
    ])
      .catch(error => {
        console.error("failed to get", error);
        return [];
      })
      .spread(function (newData, oldHotspotData, oldOpenJ9Data) {
        if (newData.state !== "fulfilled" && oldHotspotData.state !== "fulfilled" && oldOpenJ9Data.state !== "fulfilled") {
          throw newData.reason;
        } else {
          newData = newData.state === "fulfilled" ? newData.value : [];
          oldHotspotData = oldHotspotData.state === "fulfilled" ? oldHotspotData.value : [];
          oldOpenJ9Data = oldOpenJ9Data.state === "fulfilled" ? oldOpenJ9Data.value : [];

          oldHotspotData = markOldReleases(oldHotspotData);
          oldOpenJ9Data = markOldReleases(oldOpenJ9Data);
          return _.union(newData, oldHotspotData, oldOpenJ9Data);
        }
      });
  }
}

module.exports = GitHubFileCache;
