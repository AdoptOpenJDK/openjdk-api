const routesVersioning = require('express-routes-versioning')();
const v1 = require('./v1');
const v2 = require('./v2');

// add future versions here. Also add to the routesVersioning object below.

module.exports = function (app) {

  app.get('/favicon.ico', function (req, res) {
    res.status(204);
  });


  app.get([
      '/v2/:requestType/:buildtype/:version'],

    // Examples:
    //      /info/releases/openjdk8
    //      /info/nightly/openjdk8/openj9

    //      /binary/releases/openjdk8
    //      /binary/nightly/openjdk8

    // optional query parameters:
    //
    //  openjdkImpl := <hotspot|openj9>
    //  os := <windows|linux>
    //  arch := <x64|x32|ppc64>
    //  release := <latest|>
    //  type := <jdk|jre>
    //
    // curl "http://127.0.0.1:3000/v2/binary/nightly/openjdk8?openjdkImpl=hotspot&os=windows&arch=x64&release=latest&type=jdk"
    // curl "http://127.0.0.1:3000/v2/info/releases/openjdk10?openjdkImpl=hotspot&type=jdk"

    function (req, res, next) {
      app.set('json spaces', 2);
      if (req.query.pretty === 'false') {
        app.disable('json spaces')
      }
      next()
    }

    ,

    routesVersioning({
      '^2.0.0': v2
    })
  ).get([
      '/v1/:variant',
      '/v1/:variant/:buildtype',
      '/v1/:variant/:buildtype/:platform',
      '/v1/:variant/:buildtype/:platform/:build',
      '/v1/:variant/:buildtype/:platform/:build/:datatype'],
    function (req, res, next) {
      app.set('json spaces', 2);
      if (req.query.pretty === 'false') {
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
