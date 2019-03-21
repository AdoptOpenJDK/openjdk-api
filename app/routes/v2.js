const _ = require('underscore');
const versions = require('./versions');


function filterReleaseBinaries(releases, filterFunction) {
  return releases
    .map(function(release) {
      release.binaries = _.chain(release.binaries)
        .filter(filterFunction)
        .value();
      return release;
    })
    .filter(function(release) {
      return release.binaries.length > 0
    });
}

function filterRelease(releases, releaseName) {
  if (releaseName === undefined || releases.value().length === 0) {
    return releases;
  } else if (releaseName === 'latest') {

    return releases
      .sortBy(function(release) {
        return release.release ? release.release_name : release.timestamp
      })
      .last()

  } else {
    return releases
      .filter(function(release) {
        return release.release_name.toLowerCase() === releaseName.toLowerCase()
      });
  }
}

function filterReleaseOnBinaryProperty(releases, propertyName, property) {
  if (property === undefined) {
    return releases;
  }
  property = property.toLowerCase();

  return filterReleaseBinaries(releases, function(binary) {
    if (binary[propertyName] === undefined) return false;
    return binary[propertyName].toLowerCase() === property;
  })
}


function filterReleaseOnProperty(releases, propertyName, property) {
  if (property === undefined) {
    return releases;
  }

  return releases
    .filter(function(release) {
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
    .map(function(release) {
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
    res.redirect(data.binaries[0].binary_link);
  }
}


function findLatestAssets(data, res) {
  if (data !== null && data !== undefined) {
    const assetInfo = _
      .chain(data)
      .map(function(release) {
        return _.map(release.binaries, function(binary) {
          binary.timestamp = binary.updated_at;
          binary.release_name = release.release_name;
          binary.release_link = release.release_link;
          binary.release_version = release.version;
          return binary;
        })
      })
      .flatten()
      .sortBy(function(binary) {
        return binary.timestamp
      })
      .reverse()
      .uniq(false, function(binary) {
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


function sanityCheckParams(res, requestType, buildtype, version, openjdkImpl, os, arch, release, type, heapSize) {
  let errorMsg;

  const reAlNum = /^[a-zA-Z0-9]+$/;

  if (!['info', 'binary', 'latestAssets'].includes(requestType)) {
    errorMsg = 'Unknown request type';
  } else if (!['releases', 'nightly'].includes(buildtype)) {
    errorMsg = 'Unknown build type';
  } else if (!/^openjdk(?:\d{1,2}|-amber)$/.test(version)) {
    errorMsg = 'Unknown version type';
  } else if (_.isString(openjdkImpl) && !['hotspot', 'openj9'].includes(openjdkImpl.toLowerCase())) {
    errorMsg = 'Unknown openjdk_impl';
  } else if (_.isString(os) && !reAlNum.test(os)) {
    errorMsg = 'Unknown os format';
  } else if (_.isString(arch) && !reAlNum.test(arch)) {
    errorMsg = 'Unknown architecture format';
  } else if (_.isString(release) && !/^[a-z0-9_.+-]+$/.test(release.toLowerCase())) {
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
  } else if (_.isString(type) && !['jdk', 'jre'].includes(type.toLowerCase())) {
    errorMsg = 'Unknown type format';
  } else if (_.isString(heapSize) && !['large', 'normal'].includes(heapSize.toLowerCase())) {
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

function getNewStyleFileInfo(name) {
  const timestampRegex = '[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}';

  const version8Regex = '8u[0-9]+-?(?:b[0-9X]+|ga)';
  const version910Regex = '[0-9]+\\.[0-9]+\\.[0-9]+_[0-9]+';
  const version9PatchedRegex = '9_[0-9]+';
  const version11Regex = '[0-9]{2}_[0-9]+';
  const versionRegex = `${version11Regex}|${version8Regex}|${version910Regex}|${version9PatchedRegex}`;

  // IF YOU ARE MODIFYING THIS THEN THE FILE MATCHING IS PROBABLY WRONG, MAKE SURE openjdk-website-backend, Release.sh IS UPDATED TOO
  //                    1) num          2) jre/jdk          3) arch                4) OS               5) impl                6)heap                   7) timestamp/version                                         8) Random suffix               9) extension
  const regex = 'OpenJDK(?<num>[0-9]+)U?(?<type>-jre|-jdk)?_(?<arch>[0-9a-zA-Z-]+)_(?<os>[0-9a-zA-Z]+)_(?<impl>[0-9a-zA-Z]+)_?(?<heap>[0-9a-zA-Z]+)?.*_(?<ts_or_version>' + timestampRegex + '|' + versionRegex + ')(?<rand_suffix>[-0-9A-Za-z\\._]+)?\\.(?<extension>tar\\.gz|zip)';

  const matched = name.match(new RegExp(regex));

  if (matched != null) {

    var heap_size = 'normal';
    const largeHeapNames = ['linuxxl', 'macosxl'];

    if (matched.groups.heap && _.contains(largeHeapNames, matched.groups.heap.toLowerCase())) {
      heap_size = 'large';
    }

    const type = matched.groups.type ? matched.groups.type.replace('-', '') : 'jdk';

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
  const timestampRegex = '[0-9]{4}[0-9]{2}[0-9]{2}[0-9]{2}[0-9]{2}';
  const regex = 'OpenJDK(?<num>[0-9]+)U?(?<type>-[0-9a-zA-Z]+)?_(?<arch>[0-9a-zA-Z]+)_(?<os>[0-9a-zA-Z]+).*_?(?<ts>' + timestampRegex + ')?.(?<extension>tar.gz|zip)';

  const matched = name.match(new RegExp(regex));
  if (matched === null) {
    return null;
  }

  const openjdk_impl = matched.groups.type ? matched.groups.type.replace('-', '') : 'hotspot';

  let os = matched.groups.os.toLowerCase();
  if (os === 'win') {
    os = 'windows';
  } else if (os === 'linuxlh') {
    os = 'linux';
  }

  const heap_size = name.indexOf('LinuxLH') >= 0 ? 'large' : 'normal';

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
  const timestampRegex = '[0-9]{4}[0-9]{2}[0-9]{2}[0-9]{2}[0-9]{2}';
  const regex = 'OpenJDK-AMBER_(?<arch>[0-9a-zA-Z]+)_(?<os>[0-9a-zA-Z]+)_(?<ts>' + timestampRegex + ').(?<extension>tar.gz|zip)';

  const matched = name.match(new RegExp(regex));
  if (matched === null) {
    return null;
  }

  const versionMatcher = release['tag_name'].match(new RegExp('jdk-(?<num>[0-9]+).*'));
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
  const fileInfo = getNewStyleFileInfo(asset.name) || getOldStyleFileInfo(asset.name) || getAmberStyleFileInfo(asset.name, release);
  if (fileInfo === null) {
    return null;
  }

  const assetName = asset.name
    .replace('.zip', '')
    .replace('.tar.gz', '');

  const installer = _.chain(release['assets'])
    .filter(function(asset) {
      // Add installer extensions here
      const installer_extensions = ['msi', 'pkg']
      for (const extension of installer_extensions) {
        if (asset.name.endsWith(extension)) {
          return asset.name.endsWith(extension);
        }
      }
      return false
    })
    .filter(function(asset) {
      return asset.name.startsWith(assetName);
    })
    .first()

  const version = versions.formAdoptApiVersionObject(release.tag_name);
  const installerAsset = installer.value()

  if (installerAsset && installerAsset['name']){
    installer.name = installerAsset['name']
    installer.browser_download_url = installerAsset['browser_download_url']
    installer.size = installerAsset['size']
    installer.download_count = installerAsset['download_count']
    installer.installer_checksum_link = `${installer.browser_download_url}.sha256.txt`
  }

  return {
    os: fileInfo.os.toLowerCase(),
    architecture: fileInfo.arch.toLowerCase(),
    binary_type: fileInfo.binary_type,
    openjdk_impl: fileInfo.openjdk_impl.toLowerCase(),
    binary_name: asset.name,
    binary_link: asset.browser_download_url,
    binary_size: asset.size,
    checksum_link: `${asset.browser_download_url}.sha256.txt`,
    installer_name: installer.name,
    installer_link: installer.browser_download_url,
    installer_size: installer.size,
    installer_checksum_link: installer.installer_checksum_link,
    installer_download_count: installer.download_count,
    version: fileInfo.version,
    version_data: version,
    heap_size: fileInfo.heap_size,
    download_count: asset.download_count,
    updated_at: asset.updated_at,
      }
}

function githubReleaseToAdoptRelease(release) {

  const binaries = _.chain(release['assets'])
    .filter(function(asset) {
      return !asset.name.endsWith('sha256.txt')
    })
    .map(function(asset) {
      return formBinaryAssetInfo(asset, release)
    })
    .filter(function(asset) {
      return asset !== null;
    })
    .value();

  const downloadCount = _.chain(binaries)
    .map(asset => {
      if (asset.installer_download_count) {
        return asset.installer_download_count + asset.download_count
      } else {
        return asset.download_count
      }
    })
    .reduce(function(sum, num) {
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

function hasValidProperty(object, property) {
  if (object !== undefined && object !== null && object.hasOwnProperty(property)) {
    return object[property] !== undefined && object[property] !== null;
  } else {
    return false;
  }
}

function sortByValue(value) {
  return function(release) {
    if (!hasValidProperty(release, value)) {
      return 0
    }
    return release[value];
  }
}

function sortByVersionData(value) {
  const sorter = sortByValue(value);
  return function(release) {
    if (!hasValidProperty(release, 'version_data')) {
      return 0
    }
    return sorter(release.version_data);
  }
}

function sortReleases(javaVersion, data) {
  return data
    .map((release) => {
      release.version_data = versions.parseVersionString(release.release_name);
      return release;
    })
    .sortBy(sortByValue('timestamp'))
    .sortBy(sortByValue('release_name'))
    .sortBy(sortByVersionData('opt'))
    .sortBy(sortByVersionData('build'))
    .sortBy(sortByVersionData('pre'))
    .sortBy(sortByVersionData('security'))
    .sortBy(sortByVersionData('minor'))
    .sortBy(sortByVersionData('major'))
    .map((release) => {
      delete release.version_data;
      return release;
    })

}

function githubDataToAdoptApi(githubApiData, javaVersion, isReleases) {
  const data = githubApiData
    .map(githubReleaseToAdoptRelease)
    .filter(function(release) {
      return release.binaries.length > 0;
    });

  if (isReleases) {
    return sortReleases(javaVersion, data)
  } else {
    return data
      .sortBy(function(release) {
        return release.timestamp
      });
  }
}

function performGetRequest(req, res, cache) {
  const ROUTE_requestType = req.params.requestType;
  const ROUTE_buildtype = req.params.buildtype;
  const ROUTE_version = req.params.version;

  if (ROUTE_requestType === undefined || ROUTE_buildtype === undefined || ROUTE_version === undefined) {
    res.status(404);
    res.send('Not found');
    return;
  }

  const ROUTE_openjdkImpl = req.query['openjdk_impl'];
  const ROUTE_os = req.query['os'];
  const ROUTE_arch = req.query['arch'];
  const ROUTE_release = req.query['release'];
  const ROUTE_type = req.query['type'];
  const ROUTE_heapSize = req.query['heap_size'];

  if (!sanityCheckParams(res, ROUTE_requestType, ROUTE_buildtype, ROUTE_version, ROUTE_openjdkImpl, ROUTE_os, ROUTE_arch, ROUTE_release, ROUTE_type, ROUTE_heapSize)) {
    return;
  }

  cache.getInfoForVersion(ROUTE_version, ROUTE_buildtype)
    .then(function(apiData) {
      const isRelease = ROUTE_buildtype === 'releases';

      let data = _.chain(apiData);

      data = fixPrereleaseTagOnOldRepoData(data, isRelease);
      data = githubDataToAdoptApi(data, ROUTE_version, isRelease);

      data = filterReleasesOnReleaseType(data, isRelease);

      data = filterReleaseOnBinaryProperty(data, 'openjdk_impl', ROUTE_openjdkImpl);
      data = filterReleaseOnBinaryProperty(data, 'os', ROUTE_os);
      data = filterReleaseOnBinaryProperty(data, 'architecture', ROUTE_arch);
      data = filterReleaseOnBinaryProperty(data, 'binary_type', ROUTE_type);
      data = filterReleaseOnBinaryProperty(data, 'heap_size', ROUTE_heapSize);

      // don't look at only the latest release for the latestAssets call
      if (ROUTE_requestType !== 'latestAssets') {
        data = filterRelease(data, ROUTE_release);
      }

      data = data.value();

      switch (ROUTE_requestType) {
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
    .catch(function(err) {
      console.log(err);
      if (err.err) {
        res.status(500);
        res.send('Internal error');
      } else {
        res.status(err.response.statusCode);
        res.send('');
      }
    });
}

console.log("LOADING ROUTE v2")

module.exports = (cache) => {
  return {
    get: function(req, res) {
      return performGetRequest(req, res, cache);
    },
    // Functions exposed for testing
    _testExport: {
      sortReleases: sortReleases
    }
  }
};
