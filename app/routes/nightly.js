const request = require('request');
const processing = require('./processing');

module.exports = function(app) {
  app.get('/nightly', (req, res) => {
    request('https://raw.githubusercontent.com/AdoptOpenJDK/openjdk-nightly/master/nightly.json', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var importedJSON = JSON.parse(body);
        var processedJSON = processing.processJSON(importedJSON);
        res.json(processedJSON)
      }
    })
  });
  app.get('/nightly/latest', (req, res) => {
    request('https://raw.githubusercontent.com/AdoptOpenJDK/openjdk-nightly/master/latest_nightly.json', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var importedJSON = JSON.parse(body);
        var processedJSON = processing.processJSON(importedJSON);
        res.json(processedJSON)
      }
    })
  });
  app.get('/nightly/:distro', (req, res) => {
    request('https://raw.githubusercontent.com/AdoptOpenJDK/openjdk-nightly/master/nightly.json', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var importedJSON = JSON.parse(body);
        var processedJSON = processing.processJSON(importedJSON, req.params.distro);
        res.json(processedJSON)
      }
    })
  });
  app.get('/nightly/:distro/latest', (req, res) => {
    request('https://raw.githubusercontent.com/AdoptOpenJDK/openjdk-nightly/master/latest_nightly.json', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var importedJSON = JSON.parse(body);
        var processedJSON = processing.processJSON(importedJSON, req.params.distro);
        res.json(processedJSON)
      }
    })
  });
};
