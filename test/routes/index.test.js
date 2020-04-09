jest.mock('../../app/lib/db.service');

require('../../app/lib/github_file_cache');
jest.mock('../../app/lib/github_file_cache', () => {
  return jest.fn().mockImplementation(() => {
    return {};
  });
});

require('../../app/routes/v2');
jest.mock('../../app/routes/v2', () => jest.fn(() => {
  return {
    get: function (req, res) {
      res.status(200).json({responseStubbedBy: 'v2 data module'});
    }
  }
}));

require('../../app/lib/request.tracker');
let mockHits = 0;
jest.mock('../../app/lib/request.tracker', () => jest.fn(() => {
  return {
    hitCounter: function (req, res, next) {
      mockHits++;
      next()
    }
  }
}));

describe('primary router module', () => {
  const express = jest.requireActual('express');
  const request = require('supertest');
  const app = express();

  const router = require('../../app/routes/index');
  app.use(router);

  afterEach(() => {
    mockHits = 0;
  })

  describe('GET v2 API endpoint', () => {
    describe('forwards request to v2.get', () => {
      const reqPaths = [
        '/v2/info/releases/openjdk8',
        '/v2/binaries/nightlies/openjdk11',
        '/v2/latestAssets/releases/openjdk14',
      ];

      it.each(reqPaths)('%s', (path) => {
        expect.assertions(2);
        return request(app)
          .get(path)
          .then((res) => {
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual({responseStubbedBy: 'v2 data module'});
          });
      });

      it('increments hit counter', () => {
        expect.assertions(1);
        return Promise.all(
          reqPaths.map(reqPath => request(app).get(reqPath))
        ).then(() => {
          expect(mockHits).toEqual(3);
        });
      });
    });
  });

  describe('GET v1 API endpoint', () => {
    describe('returns 400', () => {
      const reqPaths = [
        '/v1',
        '/v1/',
        '/v1/openjdk8/releases/x64_linux/latest/binary'
      ];
      const expectedErrMsg = 'REMOVED: V1 has now been removed, please see https://api.adoptopenjdk.net for the latest version';

      it.each(reqPaths)('%s', (reqPath) => {
        expect.assertions(2);
        return request(app)
          .get(reqPath)
          .then((res) => {
            expect(res.statusCode).toEqual(400);
            expect(res.text).toEqual(expectedErrMsg);
          });
      });
    });
  });
});
