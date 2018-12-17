const fs = require('fs');
const _ = require('underscore');
const Q = require('q');

const GitHubFileCache = require('../app/lib/github_file_cache');

describe('v2 API', () => {
  const jdkVersions = ["openjdk8", "openjdk9", "openjdk10", "openjdk11"];
  const releaseTypes = ["nightly", "releases"];
  const apiDataStore = loadMockApiData();

  let v2;
  let cacheMock;
  let cachedGetMock;

  beforeAll(() => {
    cacheMock = new GitHubFileCache();
  });

  beforeEach(() => {
    expect(Object.keys(apiDataStore)).toHaveLength(20);

    cachedGetMock = jest.fn((url) => {
      const urlRe = new RegExp(/https:\/\/api.github.com\/repos\/AdoptOpenJDK\/(\w*)-(openj9)?(?:-)?(\w*)\/releases\?per_page=10000/);
      const urlVars = urlRe.exec(url);

      const version = urlVars[1];
      const openJ9Str = urlVars[2];
      const releaseType = urlVars[3];

      const isOpenJ9 = !!openJ9Str;
      const releaseStr = isOpenJ9 ? `${version}-${openJ9Str}-${releaseType}` : `${version}-${releaseType}`;

      const deferred = Q.defer();
      const apiData = apiDataStore[releaseStr];
      if (apiData) {
        deferred.resolve(apiData);
      } else {
        return deferred.reject(`Could not match release string '${releaseStr}' for URL '${url}'`);
      }

      return deferred.promise;
    });

    cacheMock.cachedGet = cachedGetMock;

    return v2 = require('../app/routes/v2')(cacheMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('returns HTTP status code', () => {
    describe('200', () => {
      describe('for release info', () => {
        it.each(getAllPermutations())('%s %s', (jdk, release) => {
          const request = mockRequest("info", release, jdk);

          return performRequest(request, (code, msg) => {
            expect(code).toEqual(200);
          });
        });
      });
    });

    describe('302', () => {
      describe('for binary redirects', () => {
        it.each(getAllPermutations())('%s %s', (jdk, release) => {
          const request = mockRequest("binary", release, jdk, "hotspot", "linux", "x64", "latest", "jdk");

          return performRequest(request, (code, msg) => {
            expect(code).toEqual(302);
          });
        });
      });
    });

    describe('404', () => {
      it('for invalid versions', () => {
        const request = mockRequest("info", "releases", "openjdk50", "hotspot", undefined, undefined, undefined, undefined, undefined);
        return performRequest(request, (code, msg) => {
          expect(code).toEqual(404);
          expect(msg).toEqual('Not found');
        });
      });
    });
  });

  // request http://localhost:3000/info/release/openjdk8
  describe('Returns expected properties', () => {
    describe('for binary assets', () => {
      const expectedBinaryProperties = [
        "architecture",
        "binary_link",
        "binary_name",
        "binary_size",
        "binary_type",
        "heap_size",
        "openjdk_impl",
        "os",
        "version",
      ];

      it.each(getAllPermutations())('%s %s', (jdk, release) => {
        const request = mockRequest("info", release, jdk);
        return performRequest(request, (code, msg) => {
          expect(code).toEqual(200);

          let releases;
          try {
            releases = JSON.parse(msg);
          } catch (e) {
            throw Error(`Failed to read: ${msg}. Exception: ${e}`);
          }

          _.chain(releases)
          .map(release => release.binaries)
          .flatten()
          .each(binary => {
            _.chain(expectedBinaryProperties)
            .each(property => {
              expect(binary).toHaveProperty(property);
            });
          })
        });
      });
    });
  });

  describe('can filter by properties', () => {
    // request http://localhost:3000/info/release/openjdk8?os=windows
    describe('os', () => {
      it.each(getAllPermutations())('%s %s', (jdk, release) => {
        const request = mockRequestWithSingleQuery("info", release, jdk, 'os', 'windows');
        return checkBinaryProperty(request, 'os', 'windows');
      });
    });

    // request http://localhost:3000/info/release/openjdk8?openjdk_impl=hotspot
    describe('openjdk_impl', () => {
      it.each(getAllPermutations())('%s %s', (jdk, release) => {
        const request = mockRequestWithSingleQuery("info", release, jdk, 'openjdk_impl', 'hotspot');
        return checkBinaryProperty(request, 'openjdk_impl', 'hotspot');
      });
    });

    // request http://localhost:3000/info/release/openjdk8?arch=x64
    describe('arch', () => {
      it.each(getAllPermutations())('%s %s', (jdk, release) => {
        const request = mockRequestWithSingleQuery("info", release, jdk, 'arch', 'x64');
        return checkBinaryProperty(request, 'architecture', 'x64');
      });
    });

    // request http://localhost:3000/info/release/openjdk8?type=jdk
    describe('type', () => {
      it.each(getAllPermutations())('%s %s', (jdk, release) => {
        const request = mockRequestWithSingleQuery("info", release, jdk, 'type', 'jdk');
        return checkBinaryProperty(request, 'binary_type', 'jdk');
      });
    });

    function checkBinaryProperty(request, returnedPropertyName, propertyValue) {
      return performRequest(request, (code, msg) => {
        expect(code).toEqual(200);

        const releases = JSON.parse(msg);
        _.chain(releases)
        .map(release => release.binaries)
        .flatten()
        .each(binary => {
          expect(binary[returnedPropertyName]).toEqual(propertyValue);
        });
      });
    }
  });

  describe('filters releases correctly', () => {
    it.each(getAllPermutations())('%s %s', (jdk, release) => {
      const request = mockRequest("info", release, jdk, "hotspot", "linux", "x64", undefined, "jdk");
      const isRelease = release.indexOf("releases") >= 0;

      return performRequest(request, (code, data) => {
        console.log(data);
        const releases = JSON.parse(data);
        _.chain(releases)
        .each(release => {
          if (release.hasOwnProperty('binaries')) {
            _.chain(releases.binaries)
            .each(binary => {
              const isNightlyRepo = binary.binary_link.indexOf("-nightly") >= 0;
              const isBinaryRepo = binary.binary_link.indexOf("-binaries") >= 0;
              if (isRelease) {
                expect(isNightlyRepo).toBe(false);
              } else {
                expect(isNightlyRepo || isBinaryRepo).toBe(true);
              }
            });
          }

          expect(release.release).toEqual(isRelease);
        });
      });
    });
  });

  describe('filters heap_size', () => {
    const request = mockRequest("info", "nightly", "openjdk8", undefined, undefined, undefined, undefined, undefined, "large");
    it('only large heaps are returned', () => {
      return performRequest(request, (code, data) => {
        const releases = JSON.parse(data);
        _.chain(releases)
        .each(release => {
          if (release.hasOwnProperty('binaries')) {
            _.chain(releases.binaries)
            .each(binary => {
              expect(binary.binary_link).toContain("linuxXL");
              expect(binary.heap_size).toEqual("large");
            })
          }
        })
      })
    });
  });

  describe('does not show linuxlh as an os', () => {
    it("is not linuxlh", () => {
      const request = mockRequest("info", "releases", "openjdk8", "openj9", undefined, undefined, undefined, undefined, undefined);
      return performRequest(request, (code, data) => {
        const releases = JSON.parse(data);
        _.chain(releases)
        .each(release => {
          if (release.hasOwnProperty('binaries')) {
            _.chain(releases.binaries)
            .each(binary => {
              expect(binary.os.toLowerCase()).not.toEqual("linuxlh");
            })
          }
        })
      });
    })
  });

  describe('latestAssets returns correct results', () => {
    it.each(getAllPermutations())('%s %s', (jdk, release) => {
      const request = mockRequest("latestAssets", release, jdk, "hotspot", "linux", "x64", undefined, undefined, undefined);

      return performRequest(request, (code, data) => {
        const binaries = JSON.parse(data);
        _.chain(binaries)
        .each(binary => {
          expect(binary.openjdk_impl).toEqual("hotspot");
          expect(binary.os).toEqual("linux");
          expect(binary.architecture).toEqual("x64");
        })
      });
    });
  });

  function loadMockApiData() {
    const newRepoReleaseStrs = [];
    const oldRepoReleaseStrs = [];

    jdkVersions.forEach(version => {
      newRepoReleaseStrs.push(`${version}-binaries`);
      releaseTypes.forEach(type => {
        oldRepoReleaseStrs.push(`${version}-${type}`);
        oldRepoReleaseStrs.push(`${version}-openj9-${type}`);
      });
    });

    const apiDataStore = {};

    newRepoReleaseStrs.forEach(releaseStr => {
      const path = `./test/asset/githubApiMocks/newRepo/${releaseStr}.json`;
      apiDataStore[releaseStr] = JSON.parse(fs.readFileSync(path, {encoding: 'UTF-8'}))
    });

    oldRepoReleaseStrs.forEach(releaseStr => {
      const path = `./test/asset/githubApiMocks/oldRepo/${releaseStr}.json`;
      apiDataStore[releaseStr] = JSON.parse(fs.readFileSync(path, {encoding: 'UTF-8'}))
    });

    return apiDataStore;
  }

  function getAllPermutations() {
    const permutations = [];
    jdkVersions.forEach(jdkVersion => {
      releaseTypes.forEach(releaseType => {
        permutations.push([jdkVersion, releaseType]);
      })
    });
    return permutations;
  }

  function mockRequest(requestType, buildtype, version, openjdk_impl, os, arch, release, type, heap_size) {
    return {
      params: {
        requestType: requestType,
        buildtype: buildtype,
        version: version,
      },

      query: {
        openjdk_impl: openjdk_impl,
        os: os,
        arch: arch,
        release: release,
        type: type,
        heap_size: heap_size,
      }
    }
  }

  function mockRequestWithSingleQuery(requestType, buildtype, version, queryName, queryValue) {
    const request = mockRequest(requestType, buildtype, version);
    request.query[queryName] = queryValue;
    return request;
  }

  function performRequest(request, doAssert) {
    const codePromise = Q.defer();
    const msgPromise = Q.defer();
    const res = {
      status: (code) => {
        codePromise.resolve(code);
      },
      send: (msg) => {
        msgPromise.resolve(msg);
      },
      json: (msg) => {
        msgPromise.resolve(JSON.stringify(msg));
      },
      redirect: (url) => {
        codePromise.resolve(302);
        msgPromise.resolve(url);
      }
    };

    v2(request, res);

    return Q
    .allSettled([codePromise.promise, msgPromise.promise])
    .then(result => {
      const code = result[0].value;
      const msg = result[1].value;
      doAssert(code, msg);
    });
  }
});