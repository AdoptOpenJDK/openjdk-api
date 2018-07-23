const _ = require('underscore');
const cache = require('./github_file_cache');

function filterReleaseBinaries(releases, filterFunction) {
  return _.chain(releases)
    .map(function (release) {
      release.binaries = _.chain(release.binaries)
        .filter(filterFunction)
        .value();
      return release;
    })
    .filter(function (release) {
      return release.binaries.length > 0
    })
    .value();
}

function filterRelease(releases, releaseName) {
  if (releaseName === undefined || releases.length === 0) {
    return releases;
  } else if (releaseName === 'latest') {

    return _.chain(releases)
      .sortBy(function (release) {
        return release.timestamp
      })
      .last()
      .value()

  } else {
    return _.chain(releases)
      .filter(function (release) {
        return release.release_name.toLowerCase() === releaseName.toLowerCase()
      })
      .value();
  }
}

function filterReleaseOnBinaryProperty(releases, propertyName, property) {
  if (property === undefined) {
    return releases;
  }
  property = property.toLowerCase();

  return filterReleaseBinaries(releases, function (binary) {
    return binary[propertyName].toLowerCase() === property;
  })
}

function sendData(data, res) {
  if (data.length === 0) {
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

function sanityCheckParams(res, ROUTErequestType, ROUTEbuildtype, ROUTEversion, ROUTEopenjdkImpl, ROUTEos, ROUTEarch, ROUTErelease, ROUTEtype) {
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

  if (!sanityCheckParams(res, ROUTErequestType, ROUTEbuildtype, ROUTEversion, ROUTEopenjdkImpl, ROUTEos, ROUTEarch, ROUTErelease, ROUTEtype)) {
    return;
  }

  cache.getInfoForVersion(ROUTEversion, ROUTEbuildtype)
    .then(function (data) {

      data = githubDataToAdoptApi(data);


      data = filterReleaseOnBinaryProperty(data, 'openjdk_impl', ROUTEopenjdkImpl);
      data = filterReleaseOnBinaryProperty(data, 'os', ROUTEos);
      data = filterReleaseOnBinaryProperty(data, 'architecture', ROUTEarch);
      data = filterReleaseOnBinaryProperty(data, 'binary_type', ROUTEtype);

      data = filterRelease(data, ROUTErelease);

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

function getNewStyleFileInfo(name) {
  let timestampRegex = '[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}';
  let regex = 'OpenJDK([0-9]+)U?(-jre)?_([0-9a-zA-Z]+)_([0-9a-zA-Z]+)_([0-9a-zA-Z]+).*_(' + timestampRegex + ').(tar.gz|zip)';
  let matched = name.match(new RegExp(regex));

  if (matched != null) {
    return {
      version: matched[1].toLowerCase(),
      binary_type: (matched[2] !== undefined) ? 'jre' : 'jdk',
      arch: matched[3].toLowerCase(),
      os: matched[4].toLowerCase(),
      openjdk_impl: matched[5].toLowerCase(),
      tstamp: matched[6].toLowerCase(),
      extension: matched[7].toLowerCase()
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

  let tstamp = matched[5]
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
    extension: matched[6].toLowerCase()
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
    extension: matched[4]
  };
}

function formBinaryAssetInfo(asset, release) {
  let fileInfo = getNewStyleFileInfo(asset.name);

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
    version: fileInfo.version
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
    binaries: binaries
  }
}

function githubDataToAdoptApi(githubApiData) {

  return _.chain(githubApiData)
    .map(githubReleaseToAdoptRelease)
    .filter(function (release) {
      return release.binaries.length > 0;
    })
    .sortBy(function (release) {
      return release.timestamp
    })
    .value();
}
