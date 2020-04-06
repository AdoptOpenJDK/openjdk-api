const dbName = 'adoptOpenJdkApi';
const collectionName = 'v2Stats';

/**
 * @type {module:DBService}
 */
let db;

class RequestTracker {
  /**
   * @param {module:DBService} dbIn
   */
  constructor(dbIn) {
    db = dbIn;
  }

  /**
   * @param {Request} req
   * @param {Response} res
   * @param {Function} next
   *
   * @type {RequestHandler}
   */
  hitCounter(req, res, next) {
    console.log(req.path);
    const client = db.get();
    const collection = client.db(dbName).collection(collectionName);

    const cursor = collection.find({route: '/v2/info/releases/openjdk8'});
    cursor.forEach(doc => {
      console.log(doc);
    }, error => {
      if (error) console.error(error);
    });
    return next();
  }
}

module.exports = RequestTracker;
