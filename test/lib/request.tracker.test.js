const {ObjectId, Timestamp} = require('bson');

const RequestTracker = require('../../app/lib/request.tracker');

describe('request tracker', () => {
  const someObjectId = ObjectId.createFromHexString('5e8a9513e547bb0ff078be12');
  const someTimestamp = Timestamp.fromBits(4, 1586212992);

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
});
