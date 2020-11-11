const MongoClient = require('mongodb').MongoClient;

const collectionName = 'v2Stats';
const dbName = process.env.MONGODB_DBNAME ? process.env.MONGODB_DBNAME : 'api-data';
const url = createConnectionString();

/** @const {MongoClientOptions} */
const options = {
  useUnifiedTopology: true,
};

/**
 * Generate a connection string from env vars.
 * If no such env vars are set, this will point to localhost:27017 by default.
 *
 * @return {string}
 */
function createConnectionString() {
  const dbUser = process.env.MONGODB_USER ? encodeURIComponent(process.env.MONGODB_USER) : null;
  const dbPassword = process.env.MONGODB_PASSWORD ? encodeURIComponent(process.env.MONGODB_PASSWORD) : null;
  const dbHost = process.env.MONGODB_HOST ? process.env.MONGODB_HOST : 'localhost';
  const dbPort = process.env.MONGODB_PORT ? process.env.MONGODB_PORT : '27017';

  if (dbUser && dbPassword) {
    return `mongodb://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
  } else {
    let dbServerSelectionTimeout = process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MILLIS;
    if (!dbServerSelectionTimeout) {
      dbServerSelectionTimeout = '100';
    }
    return `mongodb://${dbHost}:${dbPort}/?serverSelectionTimeoutMS=${dbServerSelectionTimeout}`
  }
}

/** @type {MongoClient} */
let connection = null;

/**
 * DB service module
 * @module module:DBService
 */
/**
 * Initiate DB connection
 * @returns {Promise<MongoClient>}
 */
module.exports.connect = () => new Promise((resolve, reject) => {
  MongoClient.connect(url, options, function (err, db) {
    if (err) {
      reject(err);
      return;
    }
    resolve(db);
    connection = db;
  });
});

/**
 * Get an active Mongo client
 * @returns {MongoClient}
 */
module.exports.get = () => {
  if (!connection) {
    throw new Error('Must call connect before calling get');
  }

  return connection;
}

module.exports.dbName = dbName;
module.exports.collectionName = collectionName;
