const _ = require('underscore');
const Q = require('q');

export class ApiTest {
  apiEndpoint: any;

  constructor(apiEndpoint) {
    this.apiEndpoint = apiEndpoint
  }

  mockRequest(requestType, buildtype, version, openjdk_impl?, os?, arch?, release?, type?, heap_size?) {
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

  mockRequestWithSingleQuery(requestType, buildtype, version, queryName, queryValue) {
    const request = this.mockRequest(requestType, buildtype, version);
    request.query[queryName] = queryValue;
    return request;
  }

  performRequest(request, doAssert) {
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

    this.apiEndpoint.get(request, res);

    return Q
      .allSettled([codePromise.promise, msgPromise.promise])
      .then(result => {
        const code = result[0].value;
        const msg = result[1].value;
        doAssert(code, msg);
      });
  }
}