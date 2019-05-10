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

    describe('400', () => {
      describe('for invalid queries', () => {
        it('invalid release string', () => {
          const request = mockRequest("info", "releases", "openjdk8", undefined, undefined, undefined, "*!/\\$", undefined);

          return performRequest(request, (code, res) => {
            expect(code).toEqual(400);
            expect(res).toEqual('Unknown release format');
          });
        });
      });

      describe('for unsupported queries', () => {
        it('multi-value release query', () => {
          const queryValues = ['latest', 'jdk8u172-b11'];
          const request = mockRequest("info", "releases", "openjdk8", undefined, undefined, undefined, queryValues, undefined);

          return performRequest(request, (code, res) => {
            expect(code).toEqual(400);
            expect(res).toContain('Multi-value queries not supported for "release"');
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
    });

    describe('by multiple property values', () => {
      describe('binary properties', () => {
        it('os', () => {
          const queryValues = ['windows', 'linux'];
          const request = mockRequestWithSingleQuery("info", "releases", "openjdk11", 'os', queryValues);
          return checkBinaryPropertyMultiValueQuery(request, 'os', queryValues);
        });

        it('openjdk_impl', () => {
          const queryValues = ['hotspot', 'openj9'];
          const request = mockRequestWithSingleQuery("info", "releases", "openjdk11", 'openjdk_impl', queryValues);
          return checkBinaryPropertyMultiValueQuery(request, 'openjdk_impl', queryValues);
        });

        it('arch', () => {
          const queryValues = ['aarch64', 'x64'];
          const request = mockRequestWithSingleQuery("info", "releases", "openjdk11", 'arch', queryValues);
          return checkBinaryPropertyMultiValueQuery(request, 'architecture', queryValues);
        });

        it('type', () => {
          const queryValues = ['jdk', 'jre'];
          const request = mockRequestWithSingleQuery("info", "releases", "openjdk11", 'type', queryValues);
          return checkBinaryPropertyMultiValueQuery(request, 'binary_type', queryValues);
        });

        it('heap_size', () => {
          const queryValues = ['normal', 'large'];
          const request = mockRequestWithSingleQuery("info", "releases", "openjdk11", 'heap_size', queryValues);
          return checkBinaryPropertyMultiValueQuery(request, 'heap_size', queryValues);
        });
      });
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

    describe('by release name', () => {
      it('returns array containing matching release', () => {
        const releaseName = 'jdk8u181-b13_openj9-0.9.0';
        const request = mockRequest("info", "releases", "openjdk8", undefined, undefined, undefined, releaseName, undefined, undefined);
        return performRequest(request, (code, data) => {
          const release = JSON.parse(data);
          expect(release).toBeInstanceOf(Array);
          expect(release).toHaveLength(1);
          expect(release[0].release_name).toEqual(releaseName);
        });
      });

      describe('"latest" returns single most recent release', () => {
        const versionBuildExpectedResults = [
            ['openjdk8', 'releases', 'jdk8u181-b13_openj9-0.9.0'],
            ['openjdk8', 'nightly', 'jdk8u-2018-12-16-12-17'],
            ['openjdk11', 'releases', 'jdk-11.0.1+13'],
            ['openjdk11', 'nightly', 'jdk11u-2018-12-16-04-46'],
        ];

        it.each(versionBuildExpectedResults)('%s %s', (version, buildtype, expectedReleaseName) => {
          const request = mockRequest("info", buildtype, version, undefined, undefined, undefined, "latest", undefined, undefined);
          return performRequest(request, (code, data) => {
            const release = JSON.parse(data);
            expect(release).not.toBeInstanceOf(Array);
            expect(release.release_name).toEqual(expectedReleaseName);
          });
        });
      });
    });
  });

  describe('sort order is correct', function () {
    function assertSortsCorrectly(data, expectedOrder) {
      let sorted = v2._testExport.sortReleases(_.chain(data)).value();

      sorted = _.chain(sorted)
        .map(function (release) {
          return release.release_name;
        })
        .value();

      expect(sorted).toEqual(expectedOrder);

    }

    it("java 8 is sorted", function () {
      assertSortsCorrectly([
          {"release_name": "jdk8u100-b10", "timestamp": 1},
          {"release_name": "jdk8u100-b2", "timestamp": 2},
          {"release_name": "jdk8u20-b1", "timestamp": 3},
          {"release_name": "jdk8u100-b1_openj9-0.8.0", "timestamp": 4},
          {"release_name": "jdk8u20-b1_openj9-0.8.0", "timestamp": 5}
        ],
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
        ["jdk-11+2", "jdk-11+100", "jdk-11.2.1+2", "jdk-11.2.1+10", "jdk-11.10.1+2"]);
    });
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

  function checkBinaryProperty(request, returnedPropertyName, propertyValue, assertFn = assertEachPropertyEqualTo) {
    return performRequest(request, (code, msg) => {
      expect(code).toEqual(200);
      const releases = JSON.parse(msg);
      const binaries = _.chain(releases)
        .map(release => release.binaries)
        .flatten()
        .value();

      expect(binaries.length).toBeGreaterThan(0);
      assertFn(binaries, returnedPropertyName, propertyValue);
    });
  }

  function checkBinaryPropertyMultiValueQuery(request, returnedPropertyName, propertyValues) {
    return checkBinaryProperty(request, returnedPropertyName, propertyValues, assertEachPropertyIn);
  }

  const assertEachPropertyEqualTo = (subjects, propertyName, propertyValue) =>
      subjects.map(subject => expect(subject[propertyName]).toEqual(propertyValue));

  const assertEachPropertyIn = (subjects, propertyName, propertyValues) => {
    const actualBinaryPropertyValues = subjects.map(binary => binary[propertyName]);
    expect(actualBinaryPropertyValues).toEqual(expect.arrayContaining(propertyValues))
  };
});
