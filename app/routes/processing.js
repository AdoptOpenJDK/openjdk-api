var exports = module.exports = {};

var platforms = [
  {
    officialName: "Linux x86-64",
    searchableName: "X64_LINUX",
    logo: "linux.png",
    fileExtension: ".tar.gz",
    requirements: "GLIBC 2.5 and above",
    architecture: "64",
    osDetectionString: "Linux Mint Debian Fedora FreeBSD Gentoo Haiku Kubuntu OpenBSD Red Hat RHEL SuSE Ubuntu Xubuntu hpwOS webOS Tizen"
  },
  {
    officialName: "Linux s390x",
    searchableName: "S390X_LINUX",
    logo: "s390x.png",
    fileExtension: ".tar.gz",
    requirements: "GLIBC 2.5 and above",
    architecture: "64",
    osDetectionString: "not-to-be-detected"
  },
  {
    officialName: "Linux ppc64le",
    searchableName: "PPC64LE_LINUX",
    logo: "ppc64le.png",
    fileExtension: ".tar.gz",
    requirements: "GLIBC 2.5 and above",
    architecture: "64",
    osDetectionString: "not-to-be-detected"
  },
  /*{
    officialName: "Linux arm",
    searchableName: "ARM_LINUX",
    logo: "linux.png",
    fileExtension: ".tar.gz",
    requirements: "GLIBC 2.5 and above",
    architecture: "64",
    osDetectionString: "not-to-be-detected"
  },*/
  /*{
    officialName: "Windows x86-64",
    searchableName: "WIN",
    logo: "windows.png",
    fileExtension: ".zip",
    requirements: "VS 2010 and above",
    architecture: "64",
    osDetectionString: "Windows Win Cygwin"
  }*/
  {
    officialName: "macOS x86-64",
    searchableName: "X64_MAC",
    logo: "mac.png",
    fileExtension: ".tar.gz",
    requirements: "macOS 10.8 and above",
    architecture: "64",
    osDetectionString: "Mac OS X OSX macOS Macintosh"
  }
];

// FUNCTIONS FOR GETTING PLATFORM DATA
// allows us to use, for example, 'lookup["MAC"];'
var lookup = {};
for (var i = 0, len = platforms.length; i < len; i++) {
    lookup[platforms[i].searchableName] = platforms[i];
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
function getFileExt(searchableName) {
  return (lookup[searchableName].fileExtension);
}

exports.processJSON = function(importedJSON, distro) {
  var exportedJSON = [];

  if(! Array.isArray(importedJSON)) {
    importedJSON = [].concat(importedJSON);
  }

  importedJSON.forEach(function(eachRelease) {
    var assetArray = [];
    eachRelease.assets.forEach(function(eachAsset) {
      var nameOfFile = (eachAsset.name);
      var uppercaseFilename = nameOfFile.toUpperCase(); // make the name of the asset uppercase
      var thisPlatform = getSearchableName(uppercaseFilename); // get the searchableName, e.g. X64_MAC or X64_LINUX.

      // firstly, check if the platform name is recognised...
      if(thisPlatform) {
        // secondly, if the 'distro' argument has been provided, check if it matches the current asset's searchableName
        if (distro == undefined || distro !== undefined && distro.toUpperCase() == thisPlatform) {
          // thirdly, check if the file has the expected file extension for that platform...
          // (this filters out all non-binary attachments, e.g. SHA checksums - these contain the platform name, but are not binaries)
          var thisFileExtension = getFileExt(thisPlatform); // get the file extension associated with this platform
          if(uppercaseFilename.indexOf((thisFileExtension.toUpperCase())) >= 0) {

            var assetObj = new Object();
            assetObj.platform = getOfficialName(thisPlatform);
            assetObj.binary_name = eachAsset.name;
            assetObj.binary_link = (eachAsset.browser_download_url);
            assetObj.binary_size = (Math.floor((eachAsset.size)/1024/1024)+" MB");
            assetObj.checksum_link = (eachAsset.browser_download_url).replace(thisFileExtension, ".sha256.txt");

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
  });

  if(exportedJSON.length == 0) {
    return "No matches for your query!";
  }
  if(exportedJSON.length == 1) {
    exportedJSON = exportedJSON[0];
  }

  return exportedJSON;
}
