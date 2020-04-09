const GitHubFileCache = require('../lib/github_file_cache');
const cache = new GitHubFileCache(false);
const v2Api = require('./v2');
const v2 = v2Api(cache);
const db = require('../lib/db.service');
const RequestTracker = require('../lib/request.tracker');
const requestTracker = new RequestTracker(db);

const express = require('express');
const router = express.Router();

router.use(requestTracker.hitCounter);

router.get('/v2/:requestType/:buildtype?/:version?', v2.get);

router.get("/v1/*", function (req, res) {
  res.status(400).send("REMOVED: V1 has now been removed, please see https://api.adoptopenjdk.net for the latest version");
});

router.get("/v1", function (req, res) {
  res.status(400).send("REMOVED: V1 has now been removed, please see https://api.adoptopenjdk.net for the latest version");
});

module.exports = router;
