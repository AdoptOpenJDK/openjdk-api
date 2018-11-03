module.exports = function (app) {
  app.use((req, res, next) => {
    app.set('json spaces', req.query.pretty === 'false' ? false : 2);
    next();
  });

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
  app.get('/v2/:requestType?/:buildtype?/:version?', require('./v2'));

  // Anything else (e.g. v1 routes)
  app.all('*', (req, res) => {
    res.status(404).json({message: 'Not Found', documentation_url: 'https://api.adoptopenjdk.net/'});
  });
};
