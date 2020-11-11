const {ObjectId, Timestamp} = require('bson');
const cursor = require('mongo-mock/lib/cursor');

const RequestTracker = require('../../app/lib/request.tracker');

describe('request tracker', () => {
  const someObjectId = ObjectId.createFromHexString('5e8a9513e547bb0ff078be12');
  const someTimestamp = Timestamp.fromBits(4, 1586212992);
  const anotherObjectId = ObjectId.createFromHexString('5e8b793de40af1560f2bd2fc');
  const anotherTimestamp = Timestamp.fromBits(1, 1586198887);

  let mockDbClient;
  let mockCollection;
  let collectionSpy;

  let dbService;
  let requestTracker;

  let findResult;
  let findOneResult;
  let findOneAndUpdateResult;

  beforeEach(() => {
    findResult = [];
    findOneResult = {};
    findOneAndUpdateResult = Promise.resolve({
      value: {
        _id: someObjectId,
        hits: 40000,
        route: '/v2/dummy/route',
        updatedAt: someTimestamp
      }
    });

    collectionSpy = {
      find: jest.fn(() => findResult),
      findOne: jest.fn(() => findOneResult),
      findOneAndUpdate: jest.fn(() => findOneAndUpdateResult),
    };
    mockCollection = {collection: () => collectionSpy};
    mockDbClient = {db: () => mockCollection};
    dbService = {get: () => mockDbClient};
    requestTracker = new RequestTracker(dbService);
  });

  describe('hitCounter', () => {
    it('does not interrupt or modify request', () => {
      const req = {baseUrl: '/v2/some/path', path: '/'}, res = {};

      const expected = 'some next function callback response';
      const next = () => expected;

      const result = requestTracker.hitCounter(req, res, next);

      expect(result).toEqual(expected);
      expect(req.path).toEqual('/');
      expect(req.baseUrl).toEqual('/v2/some/path');
    });

    it('upserts document and increments hit counter for given route', () => {
      const req = {baseUrl: '/v2/some/path', path: '/'}, res = {};
      const doc = {
        value: {
          _id: someObjectId,
          route: '/v2/some/path',
          hits: 2,
          updatedAt: someTimestamp,
        }
      }
      findOneAndUpdateResult = Promise.resolve().then(() => doc);

      requestTracker.hitCounter(req, res, jest.fn);

      expect(collectionSpy.findOneAndUpdate).toHaveBeenCalledWith(
        {route: '/v2/some/path'},
        {
          $currentDate: {
            updatedAt: {$type: 'timestamp'},
          },
          $inc: {hits: 1},
        },
        {
          returnOriginal: false,
          upsert: true,
        }
      );
    })
  });

  describe('getAllData', () => {

    let docs;

    beforeEach(() => {
      docs = [
        {
          _id: someObjectId,
          route: '/v2/some/path',
          hits: 2,
          updatedAt: someTimestamp,
        },
        {
          _id: anotherObjectId,
          route: '/v2/another/path',
          hits: 42,
          updatedAt: anotherTimestamp,
        },
      ];
      jest.useFakeTimers();
    })

    it('returns all documents in collection', () => {
      const req = {}, res = {json: jest.fn()};

      findResult = cursor(docs, {
        skip: 0,
        map: true,
        query: {_id: {$exists: true}},
      });

      requestTracker.getAllData(req, res);
      jest.runAllTimers();

      return expect(res.json).toHaveBeenCalledWith([
        {
          _id: someObjectId,
          route: '/v2/some/path',
          hits: 2,
          createdAt: '2020-04-06T02:33:55.000Z',
          updatedAt: '2020-04-06T22:43:12.000Z',
        },
        {
          _id: anotherObjectId,
          route: '/v2/another/path',
          hits: 42,
          createdAt: '2020-04-06T18:47:25.000Z',
          updatedAt: '2020-04-06T18:48:07.000Z',
        },
      ])
    });
  });
});
