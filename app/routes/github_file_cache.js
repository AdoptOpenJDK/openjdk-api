const request = require('request');
const _ = require('underscore');

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
  return new Promise(function (resolve, reject) {
    const options = {
      url: url,
      headers: {
        'User-Agent': 'adoptopenjdk-admin openjdk-api'
      }
    };

    if (cache.hasOwnProperty(options.url)) {
      console.log("cache property present")

      if (Date.now() - cache[options.url].cacheTime < 120000) {
        // For a given file check at most once every 2 min
        console.log("cache hit cooldown");
        resolve(cache[options.url].body);
        return
      } else {
        // Ask github to only return data if the file was modified since,
        // if not will return a 304
        options.headers['If-Modified-Since'] = cache[options.url].modifiedTime
      }
    }

    request(options, function (error, response, body) {
      if (error !== null) {
        reject(formErrorResponse(error, response, body));
        return;
      }

      if (response.statusCode === 304) {
        // File has not been modified, return the cached version
        console.log("cache hit " + cache[options.url].modifiedTime);

        // Reset cache cooldown
        cache[options.url].cacheTime = Date.now();

        resolve(cache[options.url].body);
      } else if (response.statusCode === 200) {
        cache[options.url] = {
          cacheTime: Date.now(),
          modifiedTime: response.headers['last-modified'],
          body: JSON.parse(Buffer.from(JSON.parse(body).content, 'base64'))
        };
        resolve(cache[options.url].body)
      } else {
        reject(formErrorResponse(error, response, body));
      }
    });
  });
}

function getInfoForNewRepo(version, releaseType) {
  return cachedGet(`https://api.github.com/repos/AdoptOpenJDK/${version}-binaries/contents/${releaseType}.json`, newCache);
}

function getInfoForOldRepo(version, releaseType) {
  return new Promise(function (resolve, reject) {
    cachedGet(`https://api.github.com/repos/AdoptOpenJDK/${version}-${releaseType}/contents/${releaseType}.json`, oldCache)
      .then(function (hotspotBody) {
        cachedGet(`https://api.github.com/repos/AdoptOpenJDK/${version}-openj9-${releaseType}/contents/${releaseType}.json`, oldCache)
          .then(function (openj9Body) {
            const unifiedJson = _.union(hotspotBody, openj9Body);
            resolve(unifiedJson);
          })
          .catch(function (error) {
            reject(error);
          })
      })
      .catch(function (error) {
        reject(error);
      });
  });
}

exports.getInfoForVersion = function (version, releaseType) {
  return new Promise(function (resolve, reject) {
    getInfoForNewRepo(version, releaseType)
      .then(function (body) {
        resolve(body)
      })
      .catch(function () {
        getInfoForOldRepo(version, releaseType)
          .then(function (body) {
            resolve(body)
          })
          .catch(function (error) {
            reject(error);
          })
      });
  });
};
