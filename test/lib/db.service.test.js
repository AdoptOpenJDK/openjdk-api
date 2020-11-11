const {MongoClient} = require('mongodb');

describe('DB service', () => {
  let dbService;
  let urlSpy;
  let optionsSpy;

  beforeEach(() => {
    urlSpy = null;
    optionsSpy = null;

    jest.setMock('mongodb', {
      MongoClient: {
        connect: function (url, options, callback) {
          urlSpy = url;
          optionsSpy = options;
          return callback(null, MongoClient.prototype);
        }
      }
    });
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('throws error when attempting to get client before connecting', () => {
    expect.assertions(3);

    dbService = require('../../app/lib/db.service');

    expect(() => dbService.get()).toThrowError();
    return dbService.connect().then(res => {
      expect(() => dbService.get()).not.toThrowError();
      expect(dbService.get()).toEqual(res);
    });
  });

  describe('connection config', () => {
    const dbName = 'some-db-name';
    const dbUser = 'some-db-user';
    const dbPassword = 'some-db-password';
    const dbHost = 'some-db-host';
    const dbPort = 'some-db-port';
    const dbServerSelectionTimeout = 12345;

    beforeEach(() => {
      process.env.MONGODB_DBNAME = dbName;
      process.env.MONGODB_USER = dbUser;
      process.env.MONGODB_PASSWORD = dbPassword;
      process.env.MONGODB_HOST = dbHost;
      process.env.MONGODB_PORT = dbPort;
      process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MILLIS = dbServerSelectionTimeout.toString(10);
    });

    afterEach(() => {
      delete process.env.MONGODB_DBNAME;
      delete process.env.MONGODB_USER;
      delete process.env.MONGODB_PASSWORD;
      delete process.env.MONGODB_HOST;
      delete process.env.MONGODB_PORT;
      delete process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MILLIS;
    });

    it('loads connection info from env vars', () => {
      expect.assertions(2);
      dbService = require('../../app/lib/db.service');

      return dbService.connect().then(() => {
        expect(urlSpy).toEqual(`mongodb://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`);
        expect(optionsSpy).toEqual({
          useUnifiedTopology: true,
        });
      });
    });

    it('defaults to local connection string if no vars are set', () => {
      delete process.env.MONGODB_DBNAME;
      delete process.env.MONGODB_USER;
      delete process.env.MONGODB_PASSWORD;
      delete process.env.MONGODB_HOST;
      delete process.env.MONGODB_PORT;
      delete process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MILLIS;

      expect.assertions(1);
      dbService = require('../../app/lib/db.service');

      return dbService.connect().then(() => {
        expect(urlSpy).toEqual('mongodb://localhost:27017/?serverSelectionTimeoutMS=100');
      });
    });

    it('uses default DB name if not set', () => {
      delete process.env.MONGODB_DBNAME;

      expect.assertions(1);
      dbService = require('../../app/lib/db.service');

      return dbService.connect().then(() => {
        expect(urlSpy).toEqual(`mongodb://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/api-data`);
      });
    });
  });
});
