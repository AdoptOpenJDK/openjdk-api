const request = require('request');
const _ = require('underscore');

function getInfoForVersion(version, releaseType) {
  return new Promise(function (resolve, reject) {
    request(`https://raw.githubusercontent.com/AdoptOpenJDK/${version}-binaries/master/${releaseType}.json`, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        resolve(githubDataToAdoptApi(JSON.parse(body)))
      } else {
        request(`https://raw.githubusercontent.com/AdoptOpenJDK/${version}-${releaseType}/master/${releaseType}.json`, function (error, response, hotspotBody) {
          if (!error && response.statusCode === 200) {
            request(`https://raw.githubusercontent.com/AdoptOpenJDK/${version}-openj9-${releaseType}/master/${releaseType}.json`, function (error, response, openj9Body) {
              if (!error && response.statusCode === 200) {
                resolve(githubDataToAdoptApi(_.union(JSON.parse(hotspotBody), JSON.parse(openj9Body))));
              } else {
                reject({
                  error: error,
                  response: response,
                  body: body
                });
              }
            })
          } else {
            reject({
              error: error,
              response: response,
              body: body
            });
          }
        });
      }
    });
  });
}

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
  if (releaseName === undefined) {
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
    const json = JSON.stringify(data, null, 2);
    res.send(json);
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
    console.log("Redirecting to " + data.binaries[0].binary_link);
    res.redirect(data.binaries[0].binary_link);
  }
}

module.exports = function (req, res) {
  const ROUTErequestType = req.params.requestType;
  const ROUTEbuildtype = req.params.buildtype;
  const ROUTEversion = req.params.version;

  const ROUTEopenjdkImpl = req.query['openjdkImpl'];
  const ROUTEos = req.query['os'];
  const ROUTEarch = req.query['arch'];
  const ROUTErelease = req.query['release'];
  const ROUTEtype = req.query['type'];

  getInfoForVersion(ROUTEversion, ROUTEbuildtype)
    .then(function (data) {
      data = filterReleaseOnBinaryProperty(data, 'openjdk_impl', ROUTEopenjdkImpl);
      data = filterReleaseOnBinaryProperty(data, 'os', ROUTEos);
      data = filterReleaseOnBinaryProperty(data, 'architecture', ROUTEarch);
      data = filterReleaseOnBinaryProperty(data, 'binaryType', ROUTEtype);
      data = filterRelease(data, ROUTErelease);

      if (ROUTErequestType === 'info') {
        sendData(data, res);
      } else if (ROUTErequestType === 'binary') {
        redirectToBinary(data, res);
      } else {
        res.status(404);
        res.send('Not found');
      }
    }, function (err) {
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
      version: matched[1],
      binaryType: (matched[2] !== undefined) ? 'jre' : 'jdk',
      arch: matched[3],
      os: matched[4],
      openjdk_impl: matched[5],
      tstamp: matched[6],
      extension: matched[7]
    }
  } else {
    return null;
  }
}

function getOldStyleFileInfo(name) {
  timestampRegex = '[0-9]{4}[0-9]{2}[0-9]{2}[0-9]{2}[0-9]{2}';
  regex = 'OpenJDK([0-9]+)U?(\-[0-9a-zA-Z]+)?_([0-9a-zA-Z]+)_([0-9a-zA-Z]+).*_(' + timestampRegex + ').(tar.gz|zip)';

  matched = name.match(new RegExp(regex));

  if (matched === null) {
    return null;
  }

  openjdk_impl = 'hotspot';
  if (matched[2] !== undefined) {
    openjdk_impl = openjdk_impl.replace('-', '');
  }

  return {
    version: matched[1],
    openjdk_impl: openjdk_impl,
    binaryType: 'jdk',
    arch: matched[3],
    os: matched[4],
    tstamp: matched[5],
    extension: matched[6]
  };
}

function formBinaryAssetInfo(asset) {
  fileInfo = getNewStyleFileInfo(asset.name);

  if (fileInfo == null) {
    fileInfo = getOldStyleFileInfo(asset.name)
  }

  if (fileInfo == null) {
    return null;
  }

  return {
    os: fileInfo.os.toLowerCase(),
    architecture: fileInfo.arch.toLowerCase(),
    binaryType: fileInfo.binaryType,
    openjdk_impl: fileInfo.openjdk_impl.toLowerCase(),
    binary_name: asset.name,
    binary_link: asset.browser_download_url,
    binary_size: asset.size,
    checksum_link: asset.browser_download_url + '.sha256.txt'
  }
}

function githubReleaseToAdoptRelease(release) {
  const binaries = _.chain(release.assets)
    .filter(function (asset) {
      return !asset.name.endsWith('sha256.txt')
    })
    .map(formBinaryAssetInfo)
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
    .value();
}
