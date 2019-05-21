import V3 from './v3';

module.exports = function (app) {
  app.use((req, res, next) => {
    app.set('json spaces', req.query.pretty === 'false' ? false : 2);
    next();
  });

  const GitHubFileCache = require('../lib/github_file_cache');
  const cache = new GitHubFileCache(false);
  const v = new V3(cache);

  app.get('/v3/:requestType?/:buildtype?/:version?', v.get);

  // API version 2
  // Examples:
  //  /v2/info/releases/openjdk8
  //  /v2/info/nightly/openjdk8
  //  /v2/info/nightly/openjdk8?openjdk_impl=hotspot&os=windows&arch=x64
  //  /v2/binary/releases/openjdk8
  //  /v2/binary/nightly/openjdk8
  //
  // Optional query parameters:
  //  openjdk_impl ::= "hotspot" | "openj9"
  //  os ::= "windows" | "linux"
  //  arch ::= "x64" | "x32" | "ppc64"
  //  release ::= "latest"| <jdk_version>
  //  type ::= "jdk" | "jre"
  //
  // curl "http://127.0.0.1:3000/v2/binary/nightly/openjdk8?openjdk_impl=hotspot&os=windows&arch=x64&release=latest&type=jdk"
  // curl "http://127.0.0.1:3000/v2/info/releases/openjdk10?openjdk_impl=hotspot&type=jdk"
  const v2 = require('./v2')(cache);
  app.get('/v2/:requestType?/:buildtype?/:version?', v2.get);

  // API version 1
  app.get([
    '/v1/:variant/:buildtype?/:platform?/:build?/:datatype?',
    '/:variant/:buildtype?/:platform?/:build?/:datatype?' // Maintain backwards compatibility for a while
  ], require('./v1'));
};
