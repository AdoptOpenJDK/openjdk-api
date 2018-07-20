const request = require('request');
const _ = require('underscore');
const Q = require('q');

const newCache = {};
const oldCache = {};

function formErrorResponse(error, response, body) {
  return {
    error: error,
    response: response,
    body: body
  };
}

// Get from url, and store the result into a cache
// 1. If last check was < 2 min ago, return last result
// 2. Check if file has been modified
// 3. If file is not modified return cached value
// 4. If modified return new data and add it to the cache
function cachedGet(url, cache) {
  var deferred = Q.defer();

  const options = {
    url: url,
    headers: {
      'User-Agent': 'adoptopenjdk-admin openjdk-api'
    }
  };

  if (cache.hasOwnProperty(options.url) && Date.now() - cache[options.url].cacheTime < 120000) {
    console.log("cache property present")
    // For a given file check at most once every 2 min
    console.log("cache hit cooldown");
    deferred.resolve(cache[options.url].body);
  } else {
    console.log("Checking " + options.url);
    request(options, function (error, response, body) {
      if (error !== null) {
        deferred.reject(formErrorResponse(error, response, body));
        return;
      }

      if (response.statusCode === 200) {
        cache[options.url] = {
          cacheTime: Date.now(),
          body: JSON.parse(body)
        };
        deferred.resolve(cache[options.url].body)
      } else {
        deferred.reject(formErrorResponse(error, response, body));
      }
    });
  }
  return deferred.promise;
}

function getInfoForNewRepo(version, releaseType) {
  return cachedGet(`https://raw.githubusercontent.com/AdoptOpenJDK/${version}-binaries/master/${releaseType}.json`, newCache);
}

function getInfoForOldRepo(version, releaseType) {
  let deferred = Q.defer();

  let hotspotPromise = cachedGet(`https://raw.githubusercontent.com/AdoptOpenJDK/${version}-${releaseType}/master/${releaseType}.json`, oldCache);
  let openj9Promise;

  if (version.indexOf('amber') > 0) {
    openj9Promise = Q.fcall(function () {
      return {}
    });
  } else {
    openj9Promise = cachedGet(`https://raw.githubusercontent.com/AdoptOpenJDK/${version}-openj9-${releaseType}/master/${releaseType}.json`, oldCache);
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


exports.getInfoForVersion = function (version, releaseType) {
  let deferred = Q.defer();

  Q.allSettled([getInfoForOldRepo(version, releaseType), getInfoForNewRepo(version, releaseType)])
    .then(function (results) {
      let oldData = results[0];
      let newData = results[1];

      if (oldData.state !== "fulfilled" && newData.state !== "fulfilled") {
        deferred.reject(oldData.reason);
      } else {
        let oldD = oldData.state === "fulfilled" ? oldData.value : [];
        let newD = newData.state === "fulfilled" ? newData.value : [];

        const unifiedJson = _.union(oldD, newD);
        deferred.resolve(unifiedJson);
      }
    });
  return deferred.promise;
};
