var exports = module.exports = {};
const request = require('request');
var platforms = [];
var lookup = {};
var i = 0;

function setLookup() {
  // FUNCTIONS FOR GETTING PLATFORM DATA
  // allows us to use, for example, 'lookup["MAC"];'
  for (i = 0; i < platforms.length; i++) {
      lookup[platforms[i].searchableName] = platforms[i];
  }
}

// gets the 'searchableName' when you pass in the full filename.
// If the filename does not match a known platform, returns false. (E.g. if a new or incorrect file appears in a repo)
function getSearchableName(filename) {
  var platform = null;
  platforms.forEach(function(eachPlatform) {
    if(filename.indexOf(eachPlatform.searchableName) >= 0) {
      platform = eachPlatform.searchableName;
    }
  });
  if(platform) {
    return (lookup[platform].searchableName);
  }
  else {
    return null;
  }
}

// gets the OFFICIAL NAME when you pass in 'searchableName'
function getOfficialName(searchableName) {
  return (lookup[searchableName].officialName);
}

// gets the FILE EXTENSION when you pass in 'searchableName'
function getBinaryExt(searchableName) {
  return (lookup[searchableName].binaryExtension);
}

exports.requestJSON = function(repoName, jsonName, req, res, download) {

  request('https://adoptopenjdk.net/dist/json/config.json', function(error, response, body) {
    if (!error && response.statusCode == 200) {
      platforms = JSON.parse(body).platforms;
      setLookup();

      var processedJSON = null;
      request('https://raw.githubusercontent.com/AdoptOpenJDK/'+ repoName +'/master/'+ jsonName +'.json', function(error, response, body) {
        if (!error && response.statusCode == 200) {
          var importedJSON = JSON.parse(body);

          processedJSON = processJSON(importedJSON, req.params.distro, req.params.id);

          if(download === 'binary' && processedJSON.binaries) {
            res.redirect(processedJSON.binaries[0].binary_link);
          }
          else {
            res.send(processedJSON);
          }
        }
        else {
          processedJSON = processUnexpectedResponse();
          res.send(processedJSON);
        }
      });
    }
    else {
      processedJSON = processUnexpectedResponse();
      res.send(processedJSON);
    }
  });
};

function processJSON(importedJSON, distro, id) {
  var exportedJSON = [];

  if(! Array.isArray(importedJSON)) {
    importedJSON = [].concat(importedJSON);
  }

  importedJSON.forEach(function(eachRelease) {
    // if an ID (release number) has been specified, check if it matches this release number...
    if(!id || id === eachRelease.name) {
      var assetArray = [];
      eachRelease.assets.forEach(function(eachAsset) {
        var nameOfFile = (eachAsset.name);
        var uppercaseFilename = nameOfFile.toUpperCase(); // make the name of the asset uppercase
        var thisPlatform = getSearchableName(uppercaseFilename); // get the searchableName, e.g. X64_MAC or X64_LINUX.

        // firstly, check if the platform name is recognised...
        if(thisPlatform) {
          // secondly, if the 'distro' argument has been provided, check if it matches the current asset's searchableName
          if (distro == undefined || distro.toUpperCase() === thisPlatform) {
            // thirdly, check if the file has the expected binary extension for that platform...
            // (this filters out all non-binary attachments, e.g. SHA checksums - these contain the platform name, but are not binaries)
            var thisBinaryExtension = getBinaryExt(thisPlatform); // get the binary extension associated with this platform
            if(uppercaseFilename.indexOf((thisBinaryExtension.toUpperCase())) >= 0) {

              var assetObj = new Object();
              assetObj.platform = getOfficialName(thisPlatform);
              assetObj.binary_name = eachAsset.name;
              assetObj.binary_link = (eachAsset.browser_download_url);
              assetObj.binary_size = (Math.floor((eachAsset.size)/1024/1024)+" MB");
              assetObj.checksum_link = (eachAsset.browser_download_url).replace(thisBinaryExtension, ".sha256.txt");

              assetArray.push(assetObj);
            }
          }
        }
      });

      if(assetArray[0]) {
        var releaseObj = new Object();
        releaseObj.release_name = eachRelease.name;
        releaseObj.timestamp = eachRelease.published_at;
        releaseObj.binaries = assetArray;

        exportedJSON.push(releaseObj);
      }
    }

  });

  if(exportedJSON.length === 0) {
    return "No matches for your query!";
  }
  if(exportedJSON.length === 1) {
    exportedJSON = exportedJSON[0];
  }

  return exportedJSON;
}

function processUnexpectedResponse() {
  var errorObj = new Object();
  errorObj.message =
      'Service unavailable. ' +
      'Try again later and if the problem persists please raise an issue detailing steps to reproduce this error at ' +
      'https://github.com/AdoptOpenJDK/openjdk-api/issues.';
  return JSON.stringify(errorObj);
}
