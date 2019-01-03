const _ = require('underscore');
const Q = require('q');

describe('v2 API', () => {
  const jdkVersions = ["openjdk8", "openjdk9", "openjdk10", "openjdk11"];
  const releaseTypes = ["nightly", "releases"];

  const cacheMock = require('./mockCache')(jdkVersions, releaseTypes);
  const v2 = require('../app/routes/v2')(cacheMock);

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Returns HTTP status code', () => {
    describe('200', () => {
      describe('for release info', () => {
        it.each(getAllPermutations())('%s %s', (jdk, release) => {
          const request = mockRequest("info", release, jdk);

          return performRequest(request, (code, res) => {
            expect(code).toEqual(200);
            expect(JSON.parse(res)).toBeDefined();
          });
        });
      });
    });

    describe('302', () => {
      describe('for binary redirects', () => {
        it.each(getAllPermutations())('%s %s', (jdk, release) => {
          const request = mockRequest("binary", release, jdk, "hotspot", "linux", "x64", "latest", "jdk");

          return performRequest(request, (code, location) => {
            expect(code).toEqual(302);
            expect(location).toEqual(new URL(location).toString());
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

    describe('for latestAssets requests', () => {
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

    describe('for large heap builds', () => {
      it("does not show linuxlh as an OS", () => {
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
  });

  describe('Filters responses', () => {
    describe('by common properties', () => {
      describe('os', () => {
        it.each(getAllPermutations())('%s %s', (jdk, release) => {
          const request = mockRequestWithSingleQuery("info", release, jdk, 'os', 'windows');
          return checkBinaryProperty(request, 'os', 'windows');
        });
      });

      describe('openjdk_impl', () => {
        it.each(getAllPermutations())('%s %s', (jdk, release) => {
          const request = mockRequestWithSingleQuery("info", release, jdk, 'openjdk_impl', 'hotspot');
          return checkBinaryProperty(request, 'openjdk_impl', 'hotspot');
        });
      });

      describe('arch', () => {
        it.each(getAllPermutations())('%s %s', (jdk, release) => {
          const request = mockRequestWithSingleQuery("info", release, jdk, 'arch', 'x64');
          return checkBinaryProperty(request, 'architecture', 'x64');
        });
      });

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

    describe('by release type', () => {
      it.each(getAllPermutations())('%s %s', (jdk, release) => {
        const request = mockRequest("info", release, jdk, "hotspot", "linux", "x64", undefined, "jdk");
        const isRelease = release.indexOf("releases") >= 0;

        return performRequest(request, (code, data) => {
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

    describe('by heap_size', () => {
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
  });

  describe('sort order is correct', function () {
    function assertSortsCorrectly(data, javaVersion, expectedOrder) {
      let sorted = v2._testExport.sortReleases(javaVersion, _.chain(data)).value();

      let isSorted = _.chain(sorted)
        .map(function (release) {
          return release.release_name;
        })
        .isEqual(expectedOrder)
        .value();

      expect(isSorted).toBe(true);
    }

    it("java 8 is sorted", function () {
      assertSortsCorrectly([
          {"release_name": "jdk8u100-b10", "timestamp": 1},
          {"release_name": "jdk8u100-b2", "timestamp": 2},
          {"release_name": "jdk8u20-b1", "timestamp": 3},
          {"release_name": "jdk8u100-b1_openj9-0.8.0", "timestamp": 4},
          {"release_name": "jdk8u20-b1_openj9-0.8.0", "timestamp": 5}
        ],
        "openjdk8",
        ["jdk8u20-b1", "jdk8u20-b1_openj9-0.8.0", "jdk8u100-b1_openj9-0.8.0", "jdk8u100-b2", "jdk8u100-b10"]);
    });


    it("java 11 is sorted", function () {
      assertSortsCorrectly(
        [
          {"release_name": "jdk-11+100", "timestamp": 1},
          {"release_name": "jdk-11+2", "timestamp": 2},
          {"release_name": "jdk-11.10.1+2", "timestamp": 3},
          {"release_name": "jdk-11.2.1+10", "timestamp": 4},
          {"release_name": "jdk-11.2.1+2", "timestamp": 5},
        ],
        "openjdk11",
        ["jdk-11+2", "jdk-11+100", "jdk-11.2.1+2", "jdk-11.2.1+10", "jdk-11.10.1+2"]);
    })
  });

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

    v2.get(request, res);

    return Q
      .allSettled([codePromise.promise, msgPromise.promise])
      .then(result => {
        const code = result[0].value;
        const msg = result[1].value;
        doAssert(code, msg);
      });
  }
});
