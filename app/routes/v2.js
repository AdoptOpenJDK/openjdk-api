const _ = require('underscore');
const cache = require('../lib/github_file_cache')();

function filterReleaseBinaries(releases, filterFunction) {
  return releases
    .map(function (release) {
      release.binaries = _.chain(release.binaries)
        .filter(filterFunction)
        .value();
      return release;
    })
    .filter(function (release) {
      return release.binaries.length > 0
    });
}

function filterRelease(releases, releaseName) {
  if (releaseName === undefined || releases.length === 0) {
    return releases;
  } else if (releaseName === 'latest') {

    return releases
      .sortBy(function (release) {
        return release.timestamp
      })
      .last()

  } else {
    return releases
      .filter(function (release) {
        return release.release_name.toLowerCase() === releaseName.toLowerCase()
      });
  }
}

function filterReleaseOnBinaryProperty(releases, propertyName, property) {
  if (property === undefined) {
    return releases;
  }
  property = property.toLowerCase();

  return filterReleaseBinaries(releases, function (binary) {
    if (binary[propertyName] === undefined) return false;
    return binary[propertyName].toLowerCase() === property;
  })
}


function filterReleaseOnProperty(releases, propertyName, property) {
  if (property === undefined) {
    return releases;
  }

  return releases
    .filter(function (release) {
      return release.hasOwnProperty(propertyName) && release[propertyName] === property
    });
}


function filterReleasesOnReleaseType(data, isRelease) {
  if (isRelease === undefined) {
    return data;
  }

  return filterReleaseOnProperty(data, "release", isRelease)
}

function fixPrereleaseTagOnOldRepoData(data, isRelease) {
  return data
    .map(function (release) {
      if (release.oldRepo) {
        release.prerelease = !isRelease
      }
      return release;
    });
}

function sendData(data, res) {
  if (data === undefined || data.length === 0) {
    res.status(404);
    res.send('Not found');
  } else {
    res.status(200);
    res.json(data);
  }
}

function redirectToBinary(data, res) {
  if (data.constructor === Array) {
    if (data.length === 0) {
      res.status(404);
      res.send('Not found');
      return;
    } else if (data.length > 1) {
      res.status(400);
      res.send('Multiple binaries match request: ' + JSON.stringify(data, null, 2));
      return;
    }
    data = data[0];
  }


  if (data.binaries.length > 1) {
    res.status(400);
    res.send('Multiple binaries match request: ' + JSON.stringify(data.binaries, null, 2));
  } else {
    console.log('Redirecting to ' + data.binaries[0].binary_link);
    res.redirect(data.binaries[0].binary_link);
  }
}


function sanityCheckParams(res, ROUTErequestType, ROUTEbuildtype, ROUTEversion, ROUTEopenjdkImpl, ROUTEos, ROUTEarch, ROUTErelease, ROUTEtype, ROUTEheapSize) {
  let errorMsg = undefined;

  const alNum = /[a-zA-Z0-9]+/;

  if (ROUTErequestType !== 'info' && ROUTErequestType !== 'binary') {
    errorMsg = 'Unknown request type';
  }

  if (ROUTEbuildtype !== 'releases' && ROUTEbuildtype !== 'nightly') {
    errorMsg = 'Unknown build type';
  }

  if (ROUTEversion.match(/openjdk(([0-9]+)|-amber)/) === null) {
    errorMsg = 'Unknown version type';
  }

  if (ROUTEopenjdkImpl !== undefined && (ROUTEopenjdkImpl !== 'hotspot' && ROUTEopenjdkImpl !== 'openj9')) {
    errorMsg = 'Unknown openjdk_impl';
  }

  if (ROUTEos !== undefined && ROUTEos.match(alNum) === null) {
    errorMsg = 'Unknown os format';
  }

  if (ROUTEarch !== undefined && ROUTEarch.match(alNum) === null) {
    errorMsg = 'Unknown architecture format';
  }

  if (ROUTErelease !== undefined && ROUTErelease.match(/[a-zA-Z0-9-]+/) === null) {
    errorMsg = 'Unknown release format';
  }

  if (ROUTEtype !== undefined && (ROUTEtype !== 'jdk' && ROUTEtype !== 'jre')) {
    errorMsg = 'Unknown type format';
  }

  if (ROUTEheapSize !== undefined && (ROUTEheapSize.toLowerCase() !== 'large' && ROUTEheapSize.toLowerCase() !== 'normal')) {
    errorMsg = 'Unknown heap size';
  }

  if (errorMsg !== undefined) {
    res.status(400);
    res.send(errorMsg);
    return false;
  } else {
    return true;
  }
}


module.exports = function (req, res) {
  const ROUTErequestType = req.params.requestType;
  const ROUTEbuildtype = req.params.buildtype;
  const ROUTEversion = req.params.version;

  if (ROUTErequestType === undefined || ROUTEbuildtype === undefined || ROUTEversion === undefined) {
    res.status(404);
    res.send('Not found');
    return;
  }

  const ROUTEopenjdkImpl = req.query['openjdk_impl'];
  const ROUTEos = req.query['os'];
  const ROUTEarch = req.query['arch'];
  const ROUTErelease = req.query['release'];
  const ROUTEtype = req.query['type'];
  const ROUTEheapSize = req.query['heap_size'];

  if (!sanityCheckParams(res, ROUTErequestType, ROUTEbuildtype, ROUTEversion, ROUTEopenjdkImpl, ROUTEos, ROUTEarch, ROUTErelease, ROUTEtype, ROUTEheapSize)) {
    return;
  }

  cache.getInfoForVersion(ROUTEversion, ROUTEbuildtype)
    .then(function (apiData) {
      let isRelease = ROUTEbuildtype.indexOf("releases") >= 0;

      let data = _.chain(apiData);

      data = fixPrereleaseTagOnOldRepoData(data, isRelease);
      data = githubDataToAdoptApi(data);

      data = filterReleasesOnReleaseType(data, isRelease);

      data = filterReleaseOnBinaryProperty(data, 'openjdk_impl', ROUTEopenjdkImpl);
      data = filterReleaseOnBinaryProperty(data, 'os', ROUTEos);
      data = filterReleaseOnBinaryProperty(data, 'architecture', ROUTEarch);
      data = filterReleaseOnBinaryProperty(data, 'binary_type', ROUTEtype);
      data = filterReleaseOnBinaryProperty(data, 'heap_size', ROUTEheapSize);

      data = filterRelease(data, ROUTErelease);

      data = data.value();

      if (ROUTErequestType === 'info') {
        sendData(data, res);
      } else if (ROUTErequestType === 'binary') {
        redirectToBinary(data, res);
      } else {
        res.status(404);
        res.send('Not found');
      }
    })
    .catch(function (err) {

      console.log(err);
      if (err.err) {
        res.status(500);
        res.send('Internal error');
      } else {
        res.status(err.response.statusCode);
        res.send('');
      }
    });
};

function getNewStyleFileInfo(name, release) {
  let timestampRegex = '[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}';

  //                  11 style       | 8 Style        | 9/10 style
  let versionRegex = '[0-9]{2}_[0-9]+|8u[0-9]+-b[0-9]+|[0-9]+.[0-9]+.[0-9]+_[0-9]+';
  let regex = 'OpenJDK([0-9]+)U?(-jre|-jdk)?_([0-9a-zA-Z]+)_([0-9a-zA-Z]+)_([0-9a-zA-Z]+)_?([0-9a-zA-Z]+)?.*_(' + timestampRegex + '|' + versionRegex + ').(tar.gz|zip)';
  let matched = name.match(new RegExp(regex));

  if (matched != null) {

    let heap_size = 'normal';

    if ((matched[6] !== undefined) && matched[6].toLowerCase() === 'linuxxl') {
      heap_size = 'large';
    }

    let timestamp = matched[7].toLowerCase();
    if (timestamp.match(new RegExp(timestampRegex)) == null) {
      timestamp = release.created_at;
    }

    let type = "jdk";
    if (matched[2] !== undefined) {
      type = matched[2].replace("-", "");
    }

    return {
      version: matched[1].toLowerCase(),
      binary_type: type,
      arch: matched[3].toLowerCase(),
      os: matched[4].toLowerCase(),
      openjdk_impl: matched[5].toLowerCase(),
      heap_size: heap_size,
      tstamp: timestamp,
      extension: matched[8].toLowerCase(),
    }
  } else {
    return null;
  }
}

function getOldStyleFileInfo(name, release) {
  let timestampRegex = '[0-9]{4}[0-9]{2}[0-9]{2}[0-9]{2}[0-9]{2}';
  let regex = 'OpenJDK([0-9]+)U?(-[0-9a-zA-Z]+)?_([0-9a-zA-Z]+)_([0-9a-zA-Z]+).*_?(' + timestampRegex + ')?.(tar.gz|zip)';

  let matched = name.match(new RegExp(regex));

  if (matched === null) {
    return null;
  }

  let openjdk_impl = 'hotspot';
  if (matched[2] !== undefined) {
    openjdk_impl = matched[2].replace('-', '');
  }

  let tstamp = matched[5];
  if (tstamp === undefined) {
    tstamp = release.created_at;
  }

  let os = matched[4].toLowerCase();

  if (os === "win") {
    os = 'windows';
  }

  return {
    version: matched[1].toLowerCase(),
    openjdk_impl: openjdk_impl.toLowerCase(),
    binary_type: 'jdk',
    arch: matched[3].toLowerCase(),
    os: os,
    tstamp: tstamp,
    extension: matched[6].toLowerCase(),
    heap_size: 'normal'
  };
}

function getAmberStyleFileInfo(name, release) {
  let timestampRegex = '[0-9]{4}[0-9]{2}[0-9]{2}[0-9]{2}[0-9]{2}';
  let regex = 'OpenJDK-AMBER_([0-9a-zA-Z]+)_([0-9a-zA-Z]+)_(' + timestampRegex + ').(tar.gz|zip)';
  let matched = name.match(new RegExp(regex));

  if (matched === null) {
    return null;
  }

  let versionMatcher = release.tag_name.match(new RegExp('jdk-([0-9]+).*'));

  if (versionMatcher === null) {
    return null;
  }

  return {
    arch: matched[1],
    os: matched[2],
    tstamp: matched[3],
    binary_type: 'jdk',
    openjdk_impl: 'hotspot',
    version: versionMatcher[1],
    extension: matched[4],
    heap_size: 'normal'
  };
}

function formBinaryAssetInfo(asset, release) {
  let fileInfo = getNewStyleFileInfo(asset.name, release);

  if (fileInfo === null) {
    fileInfo = getOldStyleFileInfo(asset.name, release)
  }

  if (fileInfo === null) {
    fileInfo = getAmberStyleFileInfo(asset.name, release)
  }

  if (fileInfo === null) {
    return null;
  }

  const assetName = asset.name
    .replace('.zip', '')
    .replace('.tar.gz', '');

  const checksum_link = _.chain(release.assets)
    .filter(function (asset) {
      return asset.name.endsWith('sha256.txt')
    })
    .filter(function (asset) {
      return asset.name.startsWith(assetName);
    })
    .map(function (asset) {
      return asset.browser_download_url;
    })
    .first();

  return {
    os: fileInfo.os.toLowerCase(),
    architecture: fileInfo.arch.toLowerCase(),
    binary_type: fileInfo.binary_type,
    openjdk_impl: fileInfo.openjdk_impl.toLowerCase(),
    binary_name: asset.name,
    binary_link: asset.browser_download_url,
    binary_size: asset.size,
    checksum_link: checksum_link,
    version: fileInfo.version,
    heap_size: fileInfo.heap_size
  }
}

function githubReleaseToAdoptRelease(release) {
  const binaries = _.chain(release.assets)
    .filter(function (asset) {
      return !asset.name.endsWith('sha256.txt')
    })
    .map(function (asset) {
      return formBinaryAssetInfo(asset, release)
    })
    .filter(function (asset) {
      return asset !== null;
    })
    .value();

  return {
    release_name: release.tag_name,
    timestamp: release.published_at,
    release: !release.prerelease,
    binaries: binaries
  }
}

function githubDataToAdoptApi(githubApiData) {

  return githubApiData
    .map(githubReleaseToAdoptRelease)
    .filter(function (release) {
      return release.binaries.length > 0;
    })
    .sortBy(function (release) {
      return release.timestamp
    });
}
