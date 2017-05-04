// EXAMPLE COMMANDS TO USE THE API:
// curl -H 'accept-version: 1.0.0' api.adoptopenjdk.net/nightly
// curl -H 'accept-version: 1.0.0' api.adoptopenjdk.net/nightly/x64_linux/latest
// curl -H 'accept-version: 1.0.0' api.adoptopenjdk.net/releases/latest?pretty=false

const routesVersioning = require('express-routes-versioning')();
const v1 = require('./v1');
// add future versions here. Also add to the routesVersioning object below.

module.exports = function(app) {

  app.get(['/releases','/releases/latest','/nightly','/nightly/latest','/nightly/:distro','/nightly/:distro/latest'],

    function (req, res, next) {
      app.set('json spaces', 2);
      if(req.query.pretty == "false") {
        app.disable('json spaces')
      }
      next()
    },

    routesVersioning({
    '^1.0.0': v1
    // add future versions here, with a comma ( , ) after the previous line. Also add the require(); above.

  }));

  /*

    if future versions add more routes, create a new 'app.get' here with that route, using either
    the caret ( ^ ) or tilde ( ~ ) symbol (see npm version rules) to only allow usage of certain
    versions when using that route, e.g:

    app.get(['/newroute'], routesVersioning({
      '^8.0.0': v8
    }));

  */
};
