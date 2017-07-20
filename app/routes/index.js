const routesVersioning = require('express-routes-versioning')();
const v1 = require('./v1');

// add future versions here. Also add to the routesVersioning object below.

module.exports = function(app) {

  app.get('/favicon.ico', function(req, res) {
    res.status(204);
  });

  app.get(['/:variant','/:variant/:buildtype','/:variant/:buildtype/:platform','/:variant/:buildtype/:platform/:build','/:variant/:buildtype/:platform/:build/:datatype'],

    function(req, res, next) {
      app.set('json spaces', 2);
      if(req.query.pretty === 'false') {
        app.disable('json spaces')
      }
      next()
    },

    routesVersioning({
      '^1.0.0': v1
      // add future versions here, with a comma ( , ) after the previous line. Also add the require(); above.
    })
  );

  /*

    if future versions add more routes, create a new 'app.get' here with that route, using either
    the caret ( ^ ) or tilde ( ~ ) symbol (see npm version rules) to only allow usage of certain
    versions when using that route, e.g:

    app.get(['/newroute'], routesVersioning({
      '^8.0.0': v8
    }));

  */
};
