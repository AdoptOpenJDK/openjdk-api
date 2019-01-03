const _ = require('underscore');
const Q = require('q');
const rimraf = require("rimraf");
const request = require('sync-request');
const stringify = require('json-stable-stringify');

const GitHubFileCache = require('../../app/lib/github_file_cache');
const cache = new GitHubFileCache();
const v2 = require('../../app/routes/v2')(cache);


/*
    If nop changes are being made to the API this can confirm that there are no changes compared to the current
     public api.

    Can be run with :
      npm run test:regression | tee test.log 2>&1

    Note this test does make real web hits and may take a long time.
 */

describe('v2 API regression test', () => {

  beforeAll(() => {
    rimraf.sync("./cache");
  });

  const TEST_COUNT_LIMIT = 500;

  function deepOmit(obj, iteratee) {
    var r = _.omit(obj, iteratee);

    _.each(r, function (val, key) {
      if (typeof (val) === "object")
        r[key] = deepOmit(val, iteratee);
    });

    return r;
  }

  function removeDownloadCount(obj) {
    return deepOmit(obj, 'download_count')
  }

  const currentApiUrl = "https://api.adoptopenjdk.net/v2";
  console.log("num requests: " + getAllPermutations().length);

  describe('Returns the same as existing', () => {
    _.chain(getAllPermutations())
      .first(TEST_COUNT_LIMIT)
      .each(perm => {
        it(`Request: ${JSON.stringify(perm)}`, async () => {
          jest.setTimeout(10000);
          await doCompare(
            perm.requestType,
            perm.releaseType,
            perm.jdkVersion,
            perm.openjdk_impl,
            perm.os,
            perm.arch,
            perm.release,
            perm.type,
            perm.heap_size,
          );
        })
      });

  });

  function stabiliseObject(obj) {
    // run through json-stable-stringify to stabilise
    return removeDownloadCount(JSON.parse(stringify(JSON.parse(obj))));
  }

  async function doCompare(requestType, buildtype, version, openjdk_impl, os, arch, release, type, heap_size) {

    const url = formUrl(requestType, buildtype, version, openjdk_impl, os, arch, release, type, heap_size);
    const response = request('GET', url);

    const result = await performRequest(requestType, buildtype, version, openjdk_impl, os, arch, release, type, heap_size);

    const code = result[0].value;
    const msg = result[1].value;

    if (response.statusCode === 200 || response.statusCode === 302) {
      expect(response.statusCode).toEqual(code);

      const expectedBody = stabiliseObject(response.getBody('utf8'));
      const actualBody = stabiliseObject(msg);

      expect(expectedBody).toEqual(actualBody);
    } else {
      expect(response.statusCode).toEqual(code);
    }
  }


  function formUrl(requestType, buildtype, version, openjdk_impl, os, arch, release, type, heap_size) {

    var url = `${currentApiUrl}/${requestType}/${buildtype}/${version}?`;

    if (openjdk_impl !== undefined) url += `openjdk_impl=${openjdk_impl}&`;
    if (os !== undefined) url += `os=${os}&`;
    if (arch !== undefined) url += `arch=${arch}&`;
    if (release !== undefined) url += `release=${release}&`;
    if (type !== undefined) url += `type=${type}&`;
    if (heap_size !== undefined) url += `heap_size=${heap_size}&`;

    return url;
  }


  function getAllPermutations() {
    /*
      Careful of combinatorial explosion here

       this is a full list but makes 1020 hits:

        const requestType = ["info", 'binary', 'latestAssets'];
        const jdkVersions = ["openjdk8", "openjdk9", "openjdk10", "openjdk11"];
        const releaseTypes = ["nightly", "releases"];


        const impls = [undefined, 'hotspot', 'openj9'];
        const oss = [undefined, 'windows', 'linux', 'mac'];
        const archs = [undefined, 'x64', 'x32'];
        const types = [undefined, 'jdk', 'jre'];
        const sizes = [undefined, 'large', 'normal'];
      */

    const requestType = ["info", 'binary', 'latestAssets'];
    const jdkVersions = ["openjdk8", "openjdk9", "openjdk10", "openjdk11"];
    const releaseTypes = ["nightly", "releases"];


    const impls = [undefined, 'hotspot'];
    const oss = [undefined, 'linux'];
    const archs = [undefined, 'x64'];
    const types = [undefined, 'jdk'];
    const sizes = [undefined, 'normal'];

    const permutations = [];
    requestType.forEach(requestType => {
      releaseTypes.forEach(releaseType => {
        jdkVersions.forEach(jdkVersion => {
          permutations.push({
            requestType: requestType,
            releaseType: releaseType,
            jdkVersion: jdkVersion,
            openjdk_impl: undefined,
            os: undefined,
            arch: undefined,
            release: undefined,
            type: undefined,
            heap_size: undefined
          });
        })
      })
    });

    requestType.forEach(requestType => {
      impls.forEach(impl => {
        oss.forEach(os => {
          archs.forEach(arch => {
            types.forEach(type => {
              sizes.forEach(size => {
                permutations.push({
                  requestType: requestType,
                  releaseType: "nightly",
                  jdkVersion: "openjdk8",
                  openjdk_impl: impl,
                  os: os,
                  arch: arch,
                  release: undefined,
                  type: type,
                  heap_size: size
                });
              })
            })
          })
        })
      })
    });
    return permutations;
  }

  function performRequest(requestType, buildtype, version, openjdk_impl, os, arch, release, type, heap_size) {
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

    const request = {
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

    v2(request, res);

    return Q
      .allSettled([codePromise.promise, msgPromise.promise]);
  }
});
