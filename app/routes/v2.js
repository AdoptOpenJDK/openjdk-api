const _ = require('underscore');

const errorResponse = (statusCode, errorMsg) => {
  return {
    status: statusCode,
    errorMsg: errorMsg,
  };
};

const paramValidator = (queryValue, validatorFn) => {
  return {
    value: queryValue,
    hasValue: () => !!queryValue,
    isValid: () => queryValue instanceof Array ? queryValue.every(validatorFn) : validatorFn(queryValue),
    getFirstInvalidValue: () => queryValue instanceof Array ? queryValue.find(v => !validatorFn(v)) : queryValue,
  };
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
      return release.binaries.length > 0;
    });
}

function filterReleaseOnReleaseName(releases, releaseName) {
  if (releaseName === undefined || releases.value().length === 0) {
    return releases;
  } else if (releaseName === 'latest') {
    return releases.first();
  } else {
    return releases
      .filter(function(release) {
        return release.release_name.toLowerCase() === releaseName.toLowerCase();
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
        });
      })
      .flatten()
      .sortBy(function(binary) {
        return binary.timestamp;
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
      return errorResponse(400, `Unknown ${queryName} format "${validator.getFirstInvalidValue()}"`);
    }
  }

  if (release instanceof Array) {
    return errorResponse(400, 'Multi-value queries not supported for "release"');
  }
}

function formBinaryAssetInfo(asset, release) {
  const versionData = {
    openjdk_version: release.versionData.openjdkVersion,
    semver: release.versionData.semver
  }

    let installerName = undefined
    let installerLink = undefined
    let installerSize = undefined
    let installerDownloadCount = undefined
    let installerChecksumLink = undefined

  if (asset.installer && asset.installer.name){
    installerName = asset.installer.name;
    installerLink = asset.installer.link;
    installerSize =  asset.installer.size;
    installerDownloadCount = asset.installer.downloadCount;
    installerChecksumLink = asset.installer.checksumLink;
  }

  return {
    os: asset.os.toLowerCase(),
    architecture: asset.architecture,
    binary_type: asset.imageType,
    openjdk_impl: asset.jvmImpl,
    binary_name: asset.package.name,
    binary_link: asset.package.link,
    binary_size: asset.package.size,
    checksum_link: asset.package.checksumLink,
    installer_name: installerName,
    installer_link: installerLink,
    installer_size: installerSize,
    installer_checksum_link: installerChecksumLink,
    installer_download_count: installerDownloadCount,
    version: release.versionData.major.toString(),
    version_data: versionData,
    heap_size: asset.heapSize,
    download_count: asset.downloadCount,
    updated_at: asset.updatedAt,
  };
}

function githubReleaseToAdoptRelease(release) {
  const binaries = _.chain(release.binaries)
    .map(function(asset) {
      return formBinaryAssetInfo(asset, release);
    })
    .filter(function(asset) {
      return asset !== null;
    })
    .value();

  const downloadCount = release.downloadCount

  return {
    release_name: release.releaseName,
    release_link: release.releaseLink,
    timestamp: release.updatedAt,
    release: !release.prerelease,
    binaries: binaries,
    download_count: downloadCount,
  };
}

function githubDataToAdoptApi(githubApiData, ROUTE_requestType) {
  return githubApiData
    .map(githubReleaseToAdoptRelease)
    .filter(function(release) {
      if ( ROUTE_requestType == "releases" ) {
        release.release = true
      } else {
        release.release = false
      }
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

  const QUERY_openjdkImpl = req.query.openjdk_impl;
  const QUERY_os = req.query.os;
  const QUERY_arch = req.query.arch;
  const QUERY_release = req.query.release;
  const QUERY_type = req.query.type;
  const QUERY_heapSize = req.query.heap_size;

  const queryParamError = sanityCheckQueryParams(res, QUERY_openjdkImpl, QUERY_os, QUERY_arch, QUERY_release, QUERY_type, QUERY_heapSize);
  if (queryParamError) {
    res.status(queryParamError.status);
    res.send(queryParamError.errorMsg);
    return;
  }

  cache.getInfoForVersion(ROUTE_version, ROUTE_buildtype, QUERY_openjdkImpl)
    .then(function(apiData) {
      let data = _.chain(JSON.parse(apiData).data.v3AssetsFeatureReleases);
      data = githubDataToAdoptApi(data, ROUTE_buildtype);
      data = filterReleaseOnBinaryProperty(data, 'os', QUERY_os);
      data = filterReleaseOnBinaryProperty(data, 'architecture', QUERY_arch);
      data = filterReleaseOnBinaryProperty(data, 'binary_type', QUERY_type);
      data = filterReleaseOnBinaryProperty(data, 'heap_size', QUERY_heapSize);

      // don't look at only the latest release for the latestAssets call
      if (ROUTE_requestType !== 'latestAssets') {
        data = filterReleaseOnReleaseName(data, QUERY_release);
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
    }
  };
};
