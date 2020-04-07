const {MongoClient} = require('mongodb');

describe('DB service', () => {
  let dbService;

  beforeEach(() => {
    jest.setMock('mongodb', {
      MongoClient: {
        connect: function (url, options, callback) {
          return callback(null, MongoClient.prototype);
        }
      }
    });
    dbService = require('../../app/lib/db.service');
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('throws error when attempting to get client before connecting', () => {
    expect.assertions(3);

    expect(() => dbService.get()).toThrowError();
    return dbService.connect().then(res => {
      expect(() => dbService.get()).not.toThrowError();
      expect(dbService.get()).toEqual(res);
    });
  });
});
