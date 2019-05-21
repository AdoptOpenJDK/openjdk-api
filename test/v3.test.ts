import {ApiTest} from "./apiTest"
import V3 from '../app/routes/v3';

describe('v3 API', () => {
  const jdkVersions = ["openjdk8", "openjdk9", "openjdk10", "openjdk11"];
  const releaseTypes = ["nightly", "releases"];

  const cacheMock = require('./mockCache')(jdkVersions, releaseTypes);
  const v3 = new V3(cacheMock);
  const apiEndpoint = new ApiTest(v3);

  describe('Returns HTTP status code', () => {
    describe('404', () => {
      it('for invalid versions', () => {
        const request = apiEndpoint.mockRequest("info", "releases", "openjdk50", "hotspot", undefined, undefined, undefined, undefined, undefined);

        return apiEndpoint.performRequest(request, (code, msg) => {
          expect(code).toEqual(404);
          expect(msg).toEqual('Not found');
        });
      });
    });
  });
});
