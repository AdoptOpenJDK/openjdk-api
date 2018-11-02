const request = require('request');
const _ = require('underscore');
const fs = require('fs');
const Q = require('q');
const async = require('async');

// This caches data returned by the github api to speed up response time and avoid going over github api rate limiting
module.exports = function () {

  const auth = readAuthCreds();

  const newCache = loadCacheFromDisk("newCache");
  const oldCache = loadCacheFromDisk("oldCache");

  // How many tasks can run in parallel.
  // 3 was chosen for the common 1 new repo, 2 old repo calls, but realistically the queue length
  // will vary over time.
  const QUEUE_WORKER_CONCURRENCY = 3;

  const cacheUpdateQueue = async.queue((task, callback) => {
    request(formRequest(task.url), (error, response, body) => {
      if (error !== null) {
        console.error("Error getting: %s", task.url, error, body);
        if (task.deferred) task.deferred.reject(formErrorResponse(error, response, body));
      } else if (response.statusCode === 200) {
        console.log("Updating cached: %s", task.url);
        console.log("Remaining requests: %d", response.headers['x-ratelimit-remaining']);

        task.cache[task.url].body = JSON.parse(body);
        saveCacheToDisk(task.cacheName, task.cache);

        if (task.deferred) task.deferred.resolve(task.cache[task.url].body)
      } else if (response.statusCode === 403) {
        // Hit the rate limit, just serve up old cache
        console.log("The GitHub API rate limit has been reached.")

        // do a short cooldown on this
        task.cache[task.url].cacheTime = Date.now() + (getCooldown() / 2);

        if (task.deferred) task.deferred.resolve(task.cache[task.url].body)
      } else if (response.statusCode === 404) {
        console.error("Delaying future checks due to 404 Not Found for: %s", task.url);

        // Wait 1 hour before retrying something that returned 404.
        // It's possible a new repo was checked before it existed.
        task.cache[task.url].cacheTime = Date.now() + (60 * 60 * 1000);
        saveCacheToDisk(task.cacheName, task.cache);

        if (task.deferred) task.deferred.reject(formErrorResponse(error, response, body));
      } else {
        console.error("Error (statusCode %d) getting: %s", response.statusCode, task.url, error, body);
        if (task.deferred) task.deferred.reject(formErrorResponse(error, response, body));
      }

      callback();
    });
  }, QUEUE_WORKER_CONCURRENCY);

  function loadCacheFromDisk(cacheName) {
    try {
      console.log("Looking for cache");
      let cache = fs.readFileSync('cache/' + cacheName + '.cache.json');
      console.log("cache found");
      return JSON.parse(cache);
    } catch (e) {
      console.log("No cache found");
      let cache = {};
      saveCacheToDisk(cacheName, cache);
      return cache;
    }
  }

  function saveCacheToDisk(cacheName, cache) {
    if (auth !== undefined && auth !== null && auth.length > 0) {
      // we have auth credentials so there is no real benefit to disk caching
      return
    }

    try {
      if (!fs.existsSync('cache')) {
        fs.mkdirSync('cache');
      }

      fs.writeFile('cache/' + cacheName + '.cache.json', JSON.stringify(cache), function (err) {
        if (err) {
          console.log("cache not saved", err)
        }
      });
    } catch (e) {
      console.log("cache not saved", e)
    }
  }

  function formErrorResponse(error, response, body) {
    return {
      error: error,
      response: response,
      body: body
    };
  }

  function readAuthCreds() {
    try {
      console.log("Reading auth");
      return fs.readFileSync('/home/jenkins/github.auth').toString("ascii").trim();
    } catch (e) {
      console.log("No github creds found");
      return null;
    }
  }

  function getCooldown() {
    if (auth !== undefined && auth !== null && auth.length > 0) {
      // 1 min (in ms)
      return 60000;
    } else {
      // 30 min (in ms)
      return 1800000;
    }
  }

  function formRequest(url) {
    const options = {
      url: url,
      timeout: 15000, // 15 seconds
      headers: {
        'User-Agent': 'adoptopenjdk-admin openjdk-api'
      }
    };

    if (auth !== undefined && auth !== null && auth.length > 0) {
      const authHeader = new Buffer(auth).toString('base64');
      options.headers['Authorization'] = 'Basic ' + authHeader
    }

    return options;
  }


  // Try to get a cached response, and if needed (due to new URL or expired data)
  // asynchronously enqueue a request to fill/update the cache.
  function cachedGet(url, cacheName, cache) {
    let deferred = Q.defer();

    if (cache.hasOwnProperty(url)) {
      if (Date.now() < cache[url].cacheTime) {
        if(cache[url].hasOwnProperty("body")) {
          deferred.resolve(cache[url].body);
        } else {
          deferred = cache[url].deferred;
        }
      } else {
        console.log("Queuing cache update: %s", url);

        let task = {
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
        cache[url].cacheTime = Date.now() + getCooldown();

        cacheUpdateQueue.push(task);
      }
    } else {
      console.log("Cache miss... immediately updating cache: %s", url);

      // Bump the cacheTime to prevent subsequent requests from
      // queuing cache updates.
      cache[url] = {cacheTime: Date.now() + getCooldown()};

      // Store the promise so others can get the result
      cache[url].deferred = deferred;

      cacheUpdateQueue.push({
        url: url,
        cacheName: cacheName,
        cache: cache,
        deferred: deferred
      });
    }
    return deferred.promise
  }

  function getInfoForNewRepo(version) {
    return cachedGet(`https://api.github.com/repos/AdoptOpenJDK/${version}-binaries/releases?per_page=10000`, 'newCache', newCache);
  }

  function getInfoForOldRepo(version, releaseType) {
    let deferred = Q.defer();

    let hotspotPromise = cachedGet(`https://api.github.com/repos/AdoptOpenJDK/${version}-${releaseType}/releases?per_page=10000`, 'oldCache', oldCache);
    let openj9Promise;

    if (version.indexOf('amber') > 0) {
      openj9Promise = Q.fcall(function () {
        return {}
      });
    } else {
      openj9Promise = cachedGet(`https://api.github.com/repos/AdoptOpenJDK/${version}-openj9-${releaseType}/releases?per_page=10000`, 'oldCache', oldCache);
    }

    Q.allSettled([hotspotPromise, openj9Promise])
      .then(function (results) {
        let hotspotResult = results[0];
        let openj9Result = results[1];
        if (hotspotResult.state !== "fulfilled" && openj9Result.state !== "fulfilled") {
          deferred.reject(hotspotResult.reason);
        } else {
          let hotspotData = hotspotResult.state === "fulfilled" ? hotspotResult.value : [];
          let openj9Data = openj9Result.state === "fulfilled" ? openj9Result.value : [];

          const unifiedJson = _.union(hotspotData, openj9Data);
          deferred.resolve(unifiedJson);
        }
      });

    return deferred.promise;
  }

  function markOldReleases(oldReleases) {
    return _.chain(oldReleases)
      .map(function (release) {
        release.oldRepo = true;
        return release;
      })
      .value();
  }


  function getInfoForVersion(version, releaseType) {

    let deferred = Q.defer();

    Q.allSettled([getInfoForOldRepo(version, releaseType), getInfoForNewRepo(version)])
      .then(function (results) {
        let oldData = results[0];
        let newData = results[1];

        if (oldData.state !== "fulfilled" && newData.state !== "fulfilled") {
          deferred.reject(oldData.reason);
        } else {
          let oldD = oldData.state === "fulfilled" ? oldData.value : [];
          let newD = newData.state === "fulfilled" ? newData.value : [];

          oldD = markOldReleases(oldD);

          const unifiedJson = _.union(oldD, newD);
          deferred.resolve(unifiedJson);
        }
      });
    return deferred.promise;
  }

  return {
    getInfoForVersion: getInfoForVersion
  }
};
