const MongoClient = require('mongodb').MongoClient;

const dbuser = encodeURIComponent('dbuser');
const dbpassword = encodeURIComponent('dbpassword');

const url = `mongodb+srv://${dbuser}:${dbpassword}@cluster0-fdnyp.mongodb.net/test?retryWrites=true&w=majority`;
const options = {
  autoReconnect: true,
};

let connection = null;

/**
 * @returns {Promise<MongoClient, MongoError>}
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
