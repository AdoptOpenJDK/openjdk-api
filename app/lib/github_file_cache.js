const request = require('request');
const _ = require('underscore');
const fs = require('fs');
const Q = require('q');
const async = require('async');

// How many tasks can run in parallel.
// 3 was chosen for the common 1 new repo, 2 old repo calls, but realistically the queue length
// will vary over time.
const QUEUE_WORKER_CONCURRENCY = 3;
const logger = console;

function readAuthCreds() {
  try {
    logger.log("Reading auth");
    return fs.readFileSync('/home/jenkins/github.auth').toString("ascii").trim();
  } catch (e) {
    logger.log("No github creds found");
    return null;
  }
}

function loadCacheFromDisk(cacheName, auth) {
  try {
    logger.log("Looking for cache");
    const cache = fs.readFileSync('cache/' + cacheName + '.cache.json', {encoding: 'UTF-8'});
    logger.log("cache found");
    const cacheData = JSON.parse(cache);

    // Removed any serialised promises
    for (const cacheEntry in cacheData) {
      if (cacheData.hasOwnProperty(cacheEntry) && cacheData[cacheEntry].hasOwnProperty("deferred")) {
        delete cacheData[cacheEntry].deferred
      }
    }

    return cacheData;

  } catch (e) {
    logger.log("No cache found");
    const cache = {};
    saveCacheToDisk(cacheName, cache, auth);
    return cache;
  }
}

function authIsValid(auth) {
  return auth !== undefined && auth !== null && auth.length > 0;
}

function saveCacheToDisk(cacheName, cache, auth) {
  if (authIsValid(auth)) {
    // we have auth credentials so there is no real benefit to disk caching
    return
  }

  try {
    if (!fs.existsSync('cache')) {
      fs.mkdirSync('cache');
    }

    fs.writeFile('cache/' + cacheName + '.cache.json', JSON.stringify(cache), function (err) {
      if (err) {
        logger.log("cache not saved", err)
      }
    });
  } catch (e) {
    logger.log("cache not saved", e)
  }
}

function getCooldown(auth) {
  if (authIsValid(auth)) {
    // 1 min (in ms)
    return 60000;
  } else {
    // 30 min (in ms)
    return 1800000;
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

function formRequest(url, auth) {
  const options = {
    url: url,
    timeout: 15000, // 15 seconds
    headers: {
      'User-Agent': 'adoptopenjdk-admin openjdk-api'
    }
  };

  if (authIsValid(auth)) {
    const authHeader = new Buffer(auth).toString('base64');
    options.headers['Authorization'] = 'Basic ' + authHeader
  }

  return options;
}

// This caches data returned by the github api to speed up response time and avoid going over github api rate limiting
class GitHubFileCache {

  constructor() {
    this.auth = readAuthCreds();
    this.newCache = loadCacheFromDisk("newCache", this.auth);
    this.oldCache = loadCacheFromDisk("oldCache", this.auth);

    this.cacheUpdateQueue = async.queue((task, callback) => {
      request(formRequest(task.url, this.auth), (error, response, body) => {
        if (error !== null) {
          logger.error("Error getting: %s", task.url, error, body);
          if (task.deferred) task.deferred.reject(formErrorResponse(error, response, body));
        } else if (response.statusCode === 200) {
          logger.log("Updating cached: %s", task.url);
          logger.log("Remaining requests: %d", response.headers['x-ratelimit-remaining']);

          task.cache[task.url].body = JSON.parse(body);
          saveCacheToDisk(task.cacheName, task.cache);

          if (task.deferred) task.deferred.resolve(task.cache[task.url].body)
        } else if (response.statusCode === 403) {
          // Hit the rate limit, just serve up old cache
          logger.log("The GitHub API rate limit has been reached.");

          // do a short cooldown on this
          task.cache[task.url].cacheTime = Date.now() + (getCooldown(this.auth) / 2);

          if (task.deferred) task.deferred.resolve(task.cache[task.url].body)
        } else if (response.statusCode === 404) {
          logger.error("Delaying future checks due to 404 Not Found for: %s", task.url);

          // Wait 1 hour before retrying something that returned 404.
          // It's possible a new repo was checked before it existed.
          task.cache[task.url].cacheTime = Date.now() + (60 * 60 * 1000);
          saveCacheToDisk(task.cacheName, task.cache);

          if (task.deferred) task.deferred.reject(formErrorResponse(error, response, body));
        } else {
          logger.error("Error (statusCode %d) getting: %s", response.statusCode, task.url, error, body);
          if (task.deferred) task.deferred.reject(formErrorResponse(error, response, body));
        }

        callback();
      });
    }, QUEUE_WORKER_CONCURRENCY);
  }

  // Try to get a cached response, and if needed (due to new URL or expired data)
  // asynchronously enqueue a request to fill/update the cache.
  cachedGet(url, cacheName, cache) {
    let deferred = Q.defer();

    let performCacheMiss = false;

    if (cache.hasOwnProperty(url)) {
      if (Date.now() < cache[url].cacheTime) {
        if (cache[url].hasOwnProperty("body")) {
          deferred.resolve(cache[url].body);
        } else if (cache[url].hasOwnProperty("deferred") && cache[url].deferred !== undefined) {
          deferred = cache[url].deferred;
        } else {
          performCacheMiss = true;
        }
      } else {
        logger.log("Queuing cache update: %s", url);

        const task = {
          url: url,
          cacheName: cacheName,
          cache: cache
        };

        // If we're past the cooldown period by some time (e.g. 15m),
        // go ahead and try to get the client the latest content despite
        // introducing a delay.  If we're still within the window, just
        // send the current content as "close enough".  Regardless, queue
        // up a cache update further below.
        if (Date.now() - cache[url].cacheTime > 900000) {
          task.deferred = deferred;
        } else {
          deferred.resolve(cache[url].body);
        }

        // Bump the cacheTime to prevent subsequent requests from
        // queuing cache updates.
        cache[url].cacheTime = Date.now() + getCooldown(this.auth);

        this.cacheUpdateQueue.push(task);
      }
    } else {
      performCacheMiss = true;
    }

    if (performCacheMiss) {
      logger.log("Cache miss... immediately updating cache: %s", url);

      // Bump the cacheTime to prevent subsequent requests from
      // queuing cache updates.
      cache[url] = {cacheTime: Date.now() + getCooldown(this.auth)};

      // Store the promise so others can get the result
      cache[url].deferred = deferred;

      this.cacheUpdateQueue.push({
        url: url,
        cacheName: cacheName,
        cache: cache,
        deferred: deferred
      });
    }
    return deferred.promise
  }

  getInfoForNewRepo(version) {
    return this.cachedGet(`https://api.github.com/repos/AdoptOpenJDK/${version}-binaries/releases?per_page=10000`, 'newCache', this.newCache);
  }

  getInfoForOldRepo(version, releaseType) {
    const deferred = Q.defer();

    const hotspotPromise = this.cachedGet(`https://api.github.com/repos/AdoptOpenJDK/${version}-${releaseType}/releases?per_page=10000`, 'oldCache', this.oldCache);
    let openj9Promise;

    if (version.indexOf('amber') > 0) {
      openj9Promise = Q.fcall(function () {
        return {}
      });
    } else {
      openj9Promise = this.cachedGet(`https://api.github.com/repos/AdoptOpenJDK/${version}-openj9-${releaseType}/releases?per_page=10000`, 'oldCache', this.oldCache);
    }

    Q.allSettled([hotspotPromise, openj9Promise])
    .then(function (results) {
      const hotspotResult = results[0];
      const openj9Result = results[1];
      if (hotspotResult.state !== "fulfilled" && openj9Result.state !== "fulfilled") {
        deferred.reject(hotspotResult.reason);
      } else {
        const hotspotData = hotspotResult.state === "fulfilled" ? hotspotResult.value : [];
        const openj9Data = openj9Result.state === "fulfilled" ? openj9Result.value : [];

        const unifiedJson = _.union(hotspotData, openj9Data);
        deferred.resolve(unifiedJson);
      }
    });

    return deferred.promise;
  }


  getInfoForVersion(version, releaseType) {

    const deferred = Q.defer();

    Q.allSettled([this.getInfoForOldRepo(version, releaseType), this.getInfoForNewRepo(version)])
    .then(function (results) {
      const oldData = results[0];
      const newData = results[1];

      if (oldData.state !== "fulfilled" && newData.state !== "fulfilled") {
        deferred.reject(oldData.reason);
      } else {
        let oldD = oldData.state === "fulfilled" ? oldData.value : [];
        const newD = newData.state === "fulfilled" ? newData.value : [];

        oldD = markOldReleases(oldD);

        const unifiedJson = _.union(oldD, newD);
        deferred.resolve(unifiedJson);
      }
    });
    return deferred.promise;
  }
}

module.exports = GitHubFileCache;
