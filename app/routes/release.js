const request = require('request');
const processing = require('./processing');

module.exports = function(app) {
  app.get('/releases', (req, res) => {
    request('https://raw.githubusercontent.com/AdoptOpenJDK/openjdk-releases/master/releases.json', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var importedJSON = JSON.parse(body);
        var processedJSON = processing.processJSON(importedJSON);
        res.json(processedJSON)
      }
    })
  });
  app.get('/releases/latest', (req, res) => {
    request('https://raw.githubusercontent.com/AdoptOpenJDK/openjdk-releases/master/latest_release.json', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var importedJSON = JSON.parse(body);
        var processedJSON = processing.processJSON(importedJSON);
        res.json(processedJSON)
      }
    })
  });
};
