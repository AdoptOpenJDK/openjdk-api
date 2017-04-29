const request = require('request');

module.exports = function(app) {
  app.get('/release', (req, res) => {
    request('https://raw.githubusercontent.com/AdoptOpenJDK/openjdk-releases/master/releases.json', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var importedJSON = JSON.parse(body);
        res.send(importedJSON)
      }
    })
  });
  app.get('/release/latest', (req, res) => {
    request('https://raw.githubusercontent.com/AdoptOpenJDK/openjdk-releases/master/latest_release.json', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var importedJSON = JSON.parse(body);
        res.send(importedJSON)
      }
    })
  });
};
