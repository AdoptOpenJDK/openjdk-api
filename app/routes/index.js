module.exports = function (app) {
  app.use((req, res, next) => {
    app.set('json spaces', req.query.pretty === 'false' ? false : 2);
    next();
  });

  const GitHubFileCache = require('../lib/github_file_cache');
  const cache = new GitHubFileCache(false);

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

  app.get("/v1/*", function(req, res) {
    res.status(400).send("REMOVED: V1 has now been removed, please see https://api.adoptopenjdk.net for the latest version");
  });

  app.get("/v1", function(req, res) {
    res.status(400).send("REMOVED: V1 has now been removed, please see https://api.adoptopenjdk.net for the latest version");
  });
};
