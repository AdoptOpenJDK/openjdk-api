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
        return release.release ? release.release_name : release.timestamp
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

  return filterReleaseOnProperty(data, 'release', isRelease);
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
  if (Array.isArray(data)) {
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


function findLatestAssets(data, res) {
  if (data !== null && data !== undefined) {
    let assetInfo = _
      .chain(data)
      .map(function (release) {
        return _.map(release.binaries, function (binary) {
          binary.timestamp = release.timestamp;
          binary.release_name = release.release_name;
          binary.release_link = release.release_link;
          return binary;
        })
      })
      .flatten()
      .sortBy(function (binary) {
        return binary.timestamp
      })
      .reverse()
      .uniq(false, function (binary) {
        return binary.os + ':' +
          binary.architecture + ':' +
          binary.binary_type + ':' +
          binary.openjdk_impl + ':' +
          binary.version + ':' +
          binary.heap_size;
      })
      .value();

    sendData(assetInfo, res);
  } else {
    res.status(404);
    res.send('Not found');
  }
}


function sanityCheckParams(res, ROUTErequestType, ROUTEbuildtype, ROUTEversion, ROUTEopenjdkImpl, ROUTEos, ROUTEarch, ROUTErelease, ROUTEtype, ROUTEheapSize) {
  let errorMsg = undefined;

  const alNum = /^[a-zA-Z0-9]+$/;

  if (!['info', 'binary', 'latestAssets'].includes(ROUTErequestType)) {
    errorMsg = 'Unknown request type';
  } else if (!['releases', 'nightly'].includes(ROUTEbuildtype)) {
    errorMsg = 'Unknown build type';
  } else if (!/^openjdk(?:\d{1,2}|-amber)$/.test(ROUTEversion)) {
    errorMsg = 'Unknown version type';
  } else if (_.isString(ROUTEopenjdkImpl) && !['hotspot', 'openj9'].includes(ROUTEopenjdkImpl.toLowerCase())) {
    errorMsg = 'Unknown openjdk_impl';
  } else if (_.isString(ROUTEos) && !alNum.test(ROUTEos)) {
    errorMsg = 'Unknown os format';
  } else if (_.isString(ROUTEarch) && !alNum.test(ROUTEarch)) {
    errorMsg = 'Unknown architecture format';
  } else if (_.isString(ROUTErelease) && !/^[a-z0-9_.+-]+$/.test(ROUTErelease.toLowerCase())) {
    // possible release formats, make sure the regex matches these:
    // jdk8u162-b12_openj9-0.8.0
    // jdk8u181-b13_openj9-0.9.0
    // jdk8u192-b13-0.11.0
    // jdk-9.0.4+11
    // jdk-9.0.4+12_openj9-0.9.0
    // jdk-9+181
    // jdk-10.0.1+10
    // jdk-10.0.2+13_openj9-0.9.0
    // jdk-10.0.2+13
    // jdk-11+28
    // jdk-11.0.1+13
    errorMsg = 'Unknown release format';
  } else if (_.isString(ROUTEtype) && !['jdk', 'jre'].includes(ROUTEtype.toLowerCase())) {
    errorMsg = 'Unknown type format';
  } else if (_.isString(ROUTEheapSize) && !['large', 'normal'].includes(ROUTEheapSize.toLowerCase())) {
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
      let isRelease = ROUTEbuildtype === 'releases';

      let data = _.chain(apiData);

      data = fixPrereleaseTagOnOldRepoData(data, isRelease);
      data = githubDataToAdoptApi(data);

      data = filterReleasesOnReleaseType(data, isRelease);

      data = filterReleaseOnBinaryProperty(data, 'openjdk_impl', ROUTEopenjdkImpl);
      data = filterReleaseOnBinaryProperty(data, 'os', ROUTEos);
      data = filterReleaseOnBinaryProperty(data, 'architecture', ROUTEarch);
      data = filterReleaseOnBinaryProperty(data, 'binary_type', ROUTEtype);
      data = filterReleaseOnBinaryProperty(data, 'heap_size', ROUTEheapSize);

      // don't look at only the latest release for the latestAssets call
      if (ROUTErequestType !== 'latestAssets') {
        data = filterRelease(data, ROUTErelease);
      }

      data = data.value();

      switch (ROUTErequestType) {
        case 'info':
          return sendData(data, res);
        case 'binary':
          return redirectToBinary(data, res);
        case 'latestAssets':
          return findLatestAssets(data, res);
        default:
          return res.status(404).send('Not found');
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

  //                  11 style       | 8 Style          | 9/10 style
  let versionRegex = '[0-9]{2}_[0-9]+|8u[0-9]+-?b[0-9X]+|[0-9]+\\.[0-9]+\\.[0-9]+_[0-9]+';

  // IF YOU ARE MODIFYING THIS THEN THE FILE MATCHING IS PROBABLY WRONG, MAKE SURE openjdk-website-backend, Release.sh IS UPDATED TOO
  //                  1) num          2) jre/jdk          3) arch                4) OS               5) impl                6)heap                   7) timestamp/version                                         8) Random suffix               9) extension
  let regex = 'OpenJDK(?<num>[0-9]+)U?(?<type>-jre|-jdk)?_(?<arch>[0-9a-zA-Z-]+)_(?<os>[0-9a-zA-Z]+)_(?<impl>[0-9a-zA-Z]+)_?(?<heap>[0-9a-zA-Z]+)?.*_(?<ts_or_version>' + timestampRegex + '|' + versionRegex + ')(?<rand_suffix>[-0-9A-Za-z\\._]+)?\\.(?<extension>tar\\.gz|zip)';

  let matched = name.match(new RegExp(regex));

  if (matched != null) {
    let heap_size = (matched.groups.heap && matched.groups.heap.toLowerCase() === 'linuxxl') ? 'large' : 'normal';
    let type = matched.groups.type ? matched.groups.type.replace('-', '') : 'jdk';

    let arch = matched.groups.arch.toLowerCase();
    if (arch === 'x86-32') {
      arch = 'x32';
    }

    return {
      version: matched.groups.num,
      binary_type: type,
      arch: arch,
      os: matched.groups.os.toLowerCase(),
      openjdk_impl: matched.groups.impl.toLowerCase(),
      heap_size: heap_size,
      extension: matched.groups.extension.toLowerCase(),
    }
  } else {
    return null;
  }
}

function getOldStyleFileInfo(name) {
  let timestampRegex = '[0-9]{4}[0-9]{2}[0-9]{2}[0-9]{2}[0-9]{2}';
  let regex = 'OpenJDK(?<num>[0-9]+)U?(?<type>-[0-9a-zA-Z]+)?_(?<arch>[0-9a-zA-Z]+)_(?<os>[0-9a-zA-Z]+).*_?(?<ts>' + timestampRegex + ')?.(?<extension>tar.gz|zip)';

  let matched = name.match(new RegExp(regex));
  if (matched === null) {
    return null;
  }

  let openjdk_impl = matched.groups.type ? matched.groups.type.replace('-', '') : 'hotspot';

  let os = matched.groups.os.toLowerCase();
  if (os === 'win') {
    os = 'windows';
  } else if (os === 'linuxlh') {
    os = 'linux';
  }

  let heap_size = name.indexOf('LinuxLH') >= 0 ? 'large' : 'normal';

  return {
    version: matched.groups.num,
    openjdk_impl: openjdk_impl.toLowerCase(),
    binary_type: 'jdk',
    arch: matched.groups.arch.toLowerCase(),
    os: os,
    extension: matched.groups.extension.toLowerCase(),
    heap_size: heap_size
  };
}

function getAmberStyleFileInfo(name, release) {
  let timestampRegex = '[0-9]{4}[0-9]{2}[0-9]{2}[0-9]{2}[0-9]{2}';
  let regex = 'OpenJDK-AMBER_(?<arch>[0-9a-zA-Z]+)_(?<os>[0-9a-zA-Z]+)_(?<ts>' + timestampRegex + ').(?<extension>tar.gz|zip)';

  let matched = name.match(new RegExp(regex));
  if (matched === null) {
    return null;
  }

  let versionMatcher = release.tag_name.match(new RegExp('jdk-(?<num>[0-9]+).*'));
  if (versionMatcher === null) {
    return null;
  }

  return {
    arch: matched.groups.arch,
    os: matched.groups.os,
    binary_type: 'jdk',
    openjdk_impl: 'hotspot',
    version: versionMatcher.groups.num,
    extension: matched.groups.extension,
    heap_size: 'normal'
  };
}

function formBinaryAssetInfo(asset, release) {
  let fileInfo = getNewStyleFileInfo(asset.name) || getOldStyleFileInfo(asset.name) || getAmberStyleFileInfo(asset.name, release);
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
    heap_size: fileInfo.heap_size,
    download_count: asset.download_count
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

  const downloadCount = _.chain(binaries)
    .map(asset => {
      return asset.download_count
    })
    .reduce(function (sum, num) {
      return sum + num;
    }, 0);

  return {
    release_name: release.tag_name,
    release_link: release.html_url,
    timestamp: release.published_at,
    release: !release.prerelease,
    binaries: binaries,
    download_count: downloadCount,
  }
}

function githubDataToAdoptApi(githubApiData) {
  return githubApiData
    .map(githubReleaseToAdoptRelease)
    .filter(function (release) {
      return release.binaries.length > 0;
    })
    .sortBy(function (release) {
      return release.release ? release.release_name : release.timestamp
    });
}
