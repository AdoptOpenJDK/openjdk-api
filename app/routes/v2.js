const _ = require('underscore');
const versions = require('./versions')();

const BINARY_ASSET_WHITELIST = [".tar.gz", ".msi", ".pkg", ".zip", ".deb", ".rpm"];

const errorResponse = (statusCode, errorMsg) => {
  return {
    status: statusCode,
    errorMsg: errorMsg,
  }
};

const paramValidator = (queryValue, validatorFn) => {
  return {
    value: queryValue,
    hasValue: () => _.isString(queryValue),
    isValid: () => validatorFn(queryValue),
  }
};

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
  const properties = property instanceof Array ? property.map(prop => prop.toLowerCase()) : [property.toLowerCase()];
  const fnBinaryFilter = (binary) => binary.hasOwnProperty(propertyName) &&
    properties.some(prop => binary[propertyName].toLowerCase() === prop);

  return filterReleaseBinaries(releases, fnBinaryFilter);
}


function filterReleaseOnProperty(releases, propertyName, property) {
  if (property === undefined) {
    return releases;
  }

  const properties = property instanceof Array ? property : [property];
  return releases
    .filter(release => release.hasOwnProperty(propertyName))
    .filter(release => properties.some(prop => release[propertyName] === prop));
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

function sanityCheckPathParams(res, requestType, buildtype, version) {
  if (!requestType || !buildtype || !version) {
    return errorResponse(404, 'Not found');
  }

  const reVersion = /^openjdk(?:\d{1,2}|-amber)$/;
  const formatValidators = {
    request:
      paramValidator(requestType, (self) => ['info', 'binary', 'latestAssets'].includes(self)),
    build:
      paramValidator(buildtype, (self) => ['releases', 'nightly'].includes(self)),
    version:
      paramValidator(version, (self) => reVersion.test(self)),
  };

  for (const [paramName, validator] of Object.entries(formatValidators)) {
    if (!validator.isValid()) {
      return errorResponse(400, `Unknown ${paramName} type`);
    }
  }
}

function sanityCheckQueryParams(res, openjdkImpl, os, arch, release, type, heapSize) {
  const reAlphaNumeric = /^[a-zA-Z0-9]+$/;
  const reReleaseName = /^[a-z0-9_.+-]+$/;

  const formatValidators = {
    openjdk_impl:
      paramValidator(openjdkImpl, (self) => ['hotspot', 'openj9'].includes(self.toLowerCase())),
    os:
      paramValidator(os, (self) => reAlphaNumeric.test(self)),
    arch:
      paramValidator(arch, (self) => reAlphaNumeric.test(self)),
    type:
      paramValidator(type, (self) => ['jdk', 'jre'].includes(self.toLowerCase())),
    heap_size:
      paramValidator(heapSize, (self) => ['large', 'normal'].includes(self.toLowerCase())),
    release:
      paramValidator(release, (self) => reReleaseName.test(self.toLowerCase())),
  };

  for (const [queryName, validator] of Object.entries(formatValidators)) {
    if (validator.hasValue() && !validator.isValid()) {
      return errorResponse(400, `Unknown ${queryName} format "${validator.value}"`);
    }
  }

  if (release instanceof Array) {
    return errorResponse(400, 'Multi-value queries not supported for "release"');
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
      const installer_extensions = ['msi', 'pkg'];
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
    .filter(function (asset) {
      for (const extension of BINARY_ASSET_WHITELIST) {
        if (asset.name.endsWith(extension)) {
          return true;
        }
      }
      return false;
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

function sortReleases(data) {
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

function sortReleasesByVersionAsc(releases, isRelease) {
  if (isRelease) {
    return sortReleases(releases)
  } else {
    return releases
      .sortBy(function(release) {
        return release.timestamp
      });
  }
}

function githubDataToAdoptApi(githubApiData) {
  return githubApiData
    .map(githubReleaseToAdoptRelease)
    .filter(function(release) {
      return release.binaries.length > 0;
    });
}

function performGetRequest(req, res, cache) {
  const ROUTE_requestType = req.params.requestType;
  const ROUTE_buildtype = req.params.buildtype;
  const ROUTE_version = req.params.version;

  const pathParamError = sanityCheckPathParams(res, ROUTE_requestType, ROUTE_buildtype, ROUTE_version);
  if (pathParamError) {
    res.status(pathParamError.status);
    res.send(pathParamError.errorMsg);
    return;
  }

  const QUERY_openjdkImpl = req.query['openjdk_impl'];
  const QUERY_os = req.query['os'];
  const QUERY_arch = req.query['arch'];
  const QUERY_release = req.query['release'];
  const QUERY_type = req.query['type'];
  const QUERY_heapSize = req.query['heap_size'];

  const queryParamError = sanityCheckQueryParams(res, QUERY_openjdkImpl, QUERY_os, QUERY_arch, QUERY_release, QUERY_type, QUERY_heapSize);
  if (queryParamError) {
    res.status(queryParamError.status);
    res.send(queryParamError.errorMsg);
    return;
  }

  cache.getInfoForVersion(ROUTE_version, ROUTE_buildtype)
    .then(function(apiData) {
      const isRelease = ROUTE_buildtype === 'releases';

      let data = _.chain(apiData);

      data = fixPrereleaseTagOnOldRepoData(data, isRelease);
      data = githubDataToAdoptApi(data);
      data = sortReleasesByVersionAsc(data, isRelease);

      data = filterReleasesOnReleaseType(data, isRelease);

      data = filterReleaseOnBinaryProperty(data, 'openjdk_impl', QUERY_openjdkImpl);
      data = filterReleaseOnBinaryProperty(data, 'os', QUERY_os);
      data = filterReleaseOnBinaryProperty(data, 'architecture', QUERY_arch);
      data = filterReleaseOnBinaryProperty(data, 'binary_type', QUERY_type);
      data = filterReleaseOnBinaryProperty(data, 'heap_size', QUERY_heapSize);

      // don't look at only the latest release for the latestAssets call
      if (ROUTE_requestType !== 'latestAssets') {
        data = filterRelease(data, QUERY_release);
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
