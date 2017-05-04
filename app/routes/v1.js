const express = require('express');
const app = express();
const request = require('request');
const processing = require('./processing');

module.exports = function(req, res) {

  var url = req.url;
  if(url.indexOf('?') >= 0) {
    url = url.slice(0, url.indexOf('?'));
  }

  // RELEASES JSON BEGIN
  if(url == '/releases') {
    request('https://raw.githubusercontent.com/AdoptOpenJDK/openjdk-releases/master/releases.json', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var importedJSON = JSON.parse(body);
        var processedJSON = processing.processJSON(importedJSON);
        res.send(processedJSON)
      }
    });
  }

  else if(url == '/releases/latest')  {
    request('https://raw.githubusercontent.com/AdoptOpenJDK/openjdk-releases/master/latest_release.json', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var importedJSON = JSON.parse(body);
        var processedJSON = processing.processJSON(importedJSON);
        res.json(processedJSON)
      }
    });
  }

  // NIGHTLY JSON BEGIN
  else if(url == '/nightly')  {
    request('https://raw.githubusercontent.com/AdoptOpenJDK/openjdk-nightly/master/nightly.json', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var importedJSON = JSON.parse(body);
        var processedJSON = processing.processJSON(importedJSON);
        res.json(processedJSON)
      }
    });
  }

  else if(url == '/nightly/latest')  {
    request('https://raw.githubusercontent.com/AdoptOpenJDK/openjdk-nightly/master/latest_nightly.json', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var importedJSON = JSON.parse(body);
        var processedJSON = processing.processJSON(importedJSON);
        res.json(processedJSON)
      }
    });
  }

  else if(url == ('/nightly/' + req.params.distro))  {
    request('https://raw.githubusercontent.com/AdoptOpenJDK/openjdk-nightly/master/nightly.json', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var importedJSON = JSON.parse(body);
        var processedJSON = processing.processJSON(importedJSON, req.params.distro);
        res.json(processedJSON)
      }
    });
  }

  else if(url == '/nightly/' + req.params.distro + '/latest')  {
    request('https://raw.githubusercontent.com/AdoptOpenJDK/openjdk-nightly/master/latest_nightly.json', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var importedJSON = JSON.parse(body);
        var processedJSON = processing.processJSON(importedJSON, req.params.distro);
        res.json(processedJSON)
      }
    });
  }

  else {
    res.status(200).send("Error: your query did not match any results.");
  }

};
