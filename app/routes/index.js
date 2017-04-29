const nightly = require('./nightly');
const release = require('./release');

module.exports = function(app) {
  nightly(app);
  release(app);
  // Other route groups could go here, in the future
};
