const _ = require('underscore');
const Q = require('q');
const https = require('https'); 

const GitHubFileCache = require('../app/lib/github_file_cache');
const cache = new GitHubFileCache(false);

describe('v2 API', () => {
  const jdkVersions = ["openjdk8", "openjdk9", "openjdk10", "openjdk11"];
  const releaseTypes = ["nightly", "releases"];

  const v2 = require('../app/routes/v2')(cache);

  const cacheGetInfoFn = cache.getInfoForVersion;

  afterEach(() => {
    // Restore cache get function in case a test overrides it
    cache.getInfoForVersion = cacheGetInfoFn;
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
      describe('for invalid path params', () => {
        const invalidPathParamRequests = [
          ['request types', mockRequest("admin", "releases", "openjdk8"), 'Unknown request type'],
          ['build types', mockRequest("info", "relish", "openjdk8"), 'Unknown build type'],
        ];

        it.each(invalidPathParamRequests)('for invalid %s', (paramName, request, expectedErrorMsg) => {
          return performRequest(request, (code, msg) => {
            expect(code).toEqual(400);
            expect(msg).toEqual(expectedErrorMsg);
          });
        });
      });

      describe('for invalid query format', () => {
        it.each`
          queryName         | invalidQueryVal
          ${'os'}           | ${'walls!!!'}
          ${'openjdk_impl'} | ${'openj9000'}
          ${'arch'}         | ${'*'}
          ${'type'}         | ${'jre++'}
          ${'heap_size'}    | ${'superSize'}
          ${'release'}      | ${'*!/\\$'}
          `('$queryName=$invalidQueryVal', ({queryName, invalidQueryVal}) => {
          const request = mockRequestWithSingleQuery("info", "releases", "openjdk11", queryName, invalidQueryVal);

          return performRequest(request, (code, res) => {
            expect(code).toEqual(400);
            expect(res).toEqual(`Unknown ${queryName} format "${invalidQueryVal}"`);
          });
        });
      });

      describe('for unsupported queries', () => {
        it('multi-value release query', () => {
          const queryValues = ['latest', 'jdk8u172-b11'];
          const request = mockRequestWithSingleQuery("info", "releases", "openjdk8", "release", queryValues);

          return performRequest(request, (code, res) => {
            expect(code).toEqual(400);
            expect(res).toContain('Multi-value queries not supported for "release"');
          });
        });
      });
    });

    describe('404', () => {
      it('for invalid versions', () => {
        const request = mockRequest("info", "releases", "openjdk50");

        return performRequest(request, (code, msg) => {
          expect(code).toEqual(404);
          expect(msg).toEqual('Not found');
        });
      });

      describe('if missing required path param', () => {
        const missingPathParamRequests = [
          ["request type", mockRequest(undefined, "releases", "openjdk8")],
          ["build type", mockRequest("info", undefined, "openjdk8")],
          ["version", mockRequest("info", "releases", undefined)],
        ];

        it.each(missingPathParamRequests)('%s', (pathParamName, request) => {
          return performRequest(request, (code, msg) => {
            expect(code).toEqual(404);
            expect(msg).toEqual('Not found');
          });
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
            });
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
            });
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
                  });
              }
            });
        });
      });
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
      describe('valid binary properties', () => {
        it.each`
          queryName         | returnedPropertyName | queryValues
          ${'os'}           | ${'os'}              | ${['windows', 'linux']}
          ${'arch'}         | ${'architecture'}    | ${['aarch64', 'x64']}
          ${'type'}         | ${'binary_type'}     | ${['jdk', 'jre']}
          ${'heap_size'}    | ${'heap_size'}       | ${['normal']}
        `('$queryName', ({queryName, returnedPropertyName, queryValues}) => {
          const request = mockRequestWithSingleQuery("info", "releases", "openjdk11", queryName, queryValues);
          return checkBinaryPropertyMultiValueQuery(request, returnedPropertyName, queryValues);
        });
      });

      describe('returns error for invalid property format', () => {
        it.each`
          queryName         | validQueryVal  | invalidQueryVal
          ${'os'}           | ${'windows'}   | ${'walls!!!'}
          ${'openjdk_impl'} | ${'hotspot'}   | ${'openj9000'}
          ${'arch'}         | ${'aarch64'}   | ${'*'}
          ${'type'}         | ${'jdk'}       | ${'jre++'}
          ${'heap_size'}    | ${'normal'}    | ${'superSize'}
        `('$queryName with invalid value "$invalidQueryVal"', ({queryName, validQueryVal, invalidQueryVal}) => {
          const queryValues = [validQueryVal, invalidQueryVal];
          const request = mockRequestWithSingleQuery("info", "releases", "openjdk11", queryName, queryValues);

          return performRequest(request, (code, res) => {
            expect(code).toEqual(400);
            expect(res).toEqual(`Unknown ${queryName} format "${invalidQueryVal}"`);
          });
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
  });

  function getAllPermutations() {
    const permutations = [];
    jdkVersions.forEach(jdkVersion => {
      releaseTypes.forEach(releaseType => {
        permutations.push([jdkVersion, releaseType]);
      });
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
    };
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

  const assertEachPropertyEqualTo = (subjects, propertyName, propertyValue) =>
      subjects.map(subject => expect(subject[propertyName]).toEqual(propertyValue));

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

  const assertEachPropertyIn = (subjects, propertyName, propertyValues) => {
    const actualBinaryPropertyValues = subjects.map(binary => binary[propertyName]);
    expect(actualBinaryPropertyValues).toEqual(expect.arrayContaining(propertyValues));
  };
});
