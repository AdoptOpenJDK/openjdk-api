/**
 * @typedef {Object} RequestCountDocument
 * @property {BSON.ObjectId} _id
 * @property {BSON.String} route
 * @property {BSON.Long} hits
 * @property {Timestamp} updatedAt
 */

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
    const client = db.get();
    const collection = client.db(db.dbName).collection(db.collectionName);

    collection.findOneAndUpdate(
      {route: req.baseUrl}, // query by request path (e.g. /v2/info/releases/openjdk8)
      {
        $currentDate: {
          updatedAt: {$type: 'timestamp'}, // set updatedAt timestamp to current datetime
        },
        $inc: {hits: 1}, // increment hit counter by 1 (or initialize to 1 for new documents)
      },
      {
        returnOriginal: false, // return the updated document
        upsert: true, // create document if one does not exist for route
      }
    )
      .then(result => {
        console.debug(`${result.value.route} - ${result.value.hits} hits
        Created at: ${result.value._id.getTimestamp()}
        Updated at: ${timestampDate(result.value.updatedAt)}`);
      })
      .catch(err => console.error(`Error updating document for ${req.path}: ${err}`));
    return next();
  }

  /**
   * @param {Request} req
   * @param {Response} res
   *
   * @type {RequestHandler}
   */
  getAllData(req, res) {
    const client = db.get();
    const collection = client.db(db.dbName).collection(db.collectionName);

    collection.find()
      .map(normalizeDates)
      .toArray((err, docs) => {
        res.json(docs);
      })
  }
}

/**
 * @param {RequestCountDocument} doc
 * @returns {{_id: BSON.ObjectId, route: BSON.String, hits: BSON.Long, createdAt: number, updatedAt: number}}
 */
const normalizeDates = (doc) => {
  return {
    _id: doc._id,
    route: doc.route,
    hits: doc.hits,
    createdAt: doc._id.getTimestamp().getTime(),
    updatedAt: timestampDate(doc.updatedAt).getTime(),
  };
}

/**
 * @param {Timestamp} timestamp
 * @returns {Date}
 */
const timestampDate = (timestamp) => new Date(timestamp.getHighBits() * 1000);

module.exports = RequestTracker;
