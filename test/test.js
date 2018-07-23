const assert = require('assert');
const _ = require('underscore');
const v2 = require('../app/routes/v2');
const Q = require('q');

function mockRequest(requestType, buildtype, version, openjdkImpl, os, arch, release, type) {
  return {
    params: {
      requestType: requestType,
      buildtype: buildtype,
      version: version,
    },

    query: {
      openjdkImpl: openjdkImpl,
      os: os,
      arch: arch,
      release: release,
      type: type,
    }
  };
}

function performRequest(request, doAssert) {
  var codePromise = Q.defer();
  var msgPromise = Q.defer();
  var res = {
    status: function (code) {
      codePromise.resolve(code);
    },
    send: function (msg) {
      msgPromise.resolve(msg);
    }
  };

  v2(request, res);

  return Q
    .allSettled([codePromise.promise, msgPromise.promise])
    .then(function (result) {
      var code = result[0].value;
      var msg = result[1].value;
      doAssert(code, msg);
    });
}


function forAllPermutations(doTest) {
  _
    .chain(["openjdk8", "openjdk9", "openjdk10"])
    .each(function (jdk) {
      _
        .chain(["nightly", "releases"])
        .each(function (release) {
          if (jdk === "openjdk9" && release === "releases") {
            return;
          }
          doTest(jdk, release);

        })
    });
}


/*

TODO: uncomment when fixed
describe('dinoguns binary request works', function () {
  it("works", function () {
    const request = mockRequest("binary", "nightly", "openjdk8", "hotspot", "linux", "aarch64", "latest", "jdk");
    return performRequest(request, function (code, msg) {
      assert.equal(302, code);
    });
  })
});
*/

describe('200 for simple case', function () {
  forAllPermutations(function (jdk, release) {
    it(jdk + ' ' + release, function () {
      const request = mockRequest("info", release, jdk);
      return performRequest(request, function (code, msg) {
        assert.equal(200, code);
      });
    })
  });
});



describe('has all expected properties on binary assets', function () {
  forAllPermutations(function (jdk, release) {
    it(jdk + ' ' + release, function () {
      const request = mockRequest("info", release, jdk);
      return performRequest(request, function (code, msg) {
        assert.equal(200, code);
        let releases = JSON.parse(msg);
        _.chain(releases)
          .map(function (release) {
            return release.binaries;
          })
          .flatten()
          .each(function (binary) {

            _.chain([
              "os",
              "architecture",
              "binaryType",
              "openjdk_impl",
              "binary_name",
              "checksum_link",
              "binary_link",
              "binary_size",
              "checksum_link",
              "version"])
              .each(function (property) {
                assert.equal(true, binary.hasOwnProperty(property), "failed for: " + JSON.stringify(binary));
              });
          })
      });
    })
  });
});


describe('can filter by os', function () {
  forAllPermutations(function (jdk, release) {
    it(jdk + ' ' + release, function () {
      const request = mockRequest("info", release, jdk, undefined, "windows");
      return performRequest(request, function (code, msg) {
        assert.equal(200, code);
        let releases = JSON.parse(msg);
        _.chain(releases)
          .map(function (release) {
            return release.binaries;
          })
          .flatten()
          .each(function (binary) {
            assert.equal("windows", binary.os);
          })
      });
    })
  });
});