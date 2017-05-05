// EXAMPLE COMMANDS TO USE VERSION 1 OF THE API:
// curl -H 'accept-version: 1.0.0' api.adoptopenjdk.net/nightly
// curl -H 'accept-version: 1.0.0' api.adoptopenjdk.net/nightly/x64_linux/latest
// curl -H 'accept-version: 1.0.0' api.adoptopenjdk.net/releases/latest?pretty=false

const express = require('express');
const app = express();
const processing = require('./processing-v1');

module.exports = function(req, res) {

  var url = req.url;
  if(url.indexOf('?') >= 0) {
    url = url.slice(0, url.indexOf('?'));
  }
  if(url.endsWith("/") === true) {
    url = url.slice(0, -1);
  }

  // RELEASES JSON BEGIN
  if(url === '/releases') {
    processing.requestJSON('openjdk-releases', 'releases', req, res);
  }

  else if(url === '/releases/latest') {
    processing.requestJSON('openjdk-releases', 'latest_release', req, res);
  }

  // NIGHTLY JSON BEGIN
  else if(url === '/nightly') {
    processing.requestJSON('openjdk-nightly', 'nightly', req, res);
  }

  else if(url === '/nightly/latest') {
    processing.requestJSON('openjdk-nightly', 'latest_nightly', req, res);
  }

  else if(url === '/nightly/' + req.params.distro) {
    processing.requestJSON('openjdk-nightly', 'nightly', req, res);
  }

  else if(url === '/nightly/' + req.params.distro + '/latest') {
    processing.requestJSON('openjdk-nightly', 'latest_nightly', req, res);
  }

  else {
    // This error should never be returned.
    // It is a failsafe to prevent timeouts in case a mistake is made in the API code.
    res.send("API error. Please raise an issue detailing steps to reproduce this error at https://github.com/AdoptOpenJDK/openjdk-api/issues.");
  }

};
