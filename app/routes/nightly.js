const request = require('request');

module.exports = function(app) {
  app.get('/nightly', (req, res) => {
    request('https://raw.githubusercontent.com/AdoptOpenJDK/openjdk-nightly/master/nightly.json', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var importedJSON = JSON.parse(body);
        res.send(importedJSON)
      }
    })
  });
  app.get('/nightly/latest', (req, res) => {
    request('https://raw.githubusercontent.com/AdoptOpenJDK/openjdk-nightly/master/latest_nightly.json', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var importedJSON = JSON.parse(body);
        res.send(importedJSON)
      }
    })
  });
  app.get('/nightly/:distro', (req, res) => {
    request('https://raw.githubusercontent.com/AdoptOpenJDK/openjdk-nightly/master/nightly.json', function(error, response, body) {
      console.error(req.params.distro)
      if (!error && response.statusCode == 200) {
        var importedJSON = JSON.parse(body);
        res.send(importedJSON)
      }
    })
  });
  app.get('/nightly/:distro/latest', (req, res) => {
    request('https://raw.githubusercontent.com/AdoptOpenJDK/openjdk-nightly/master/nightly.json', function(error, response, body) {
      console.error(req.params.distro)
      if (!error && response.statusCode == 200) {
        var importedJSON = JSON.parse(body);
        res.send(importedJSON)
      }
    })
  });
};
