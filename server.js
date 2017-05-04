const express = require('express');
const bodyParser = require('body-parser');
const RateLimit = require('express-rate-limit');
const app = express();
const port = 3000;

var limiter = new RateLimit({
  windowMs: 60*60*1000, // 60 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  delayMs: 0, // disable delaying - full speed until the max limit is reached
  message: "You have exceeded your api usage, you are allowed 100 requests per hour"
});

//  apply to all requests
app.set('json spaces', 2);
app.use(limiter);
app.use(bodyParser.urlencoded({ extended: true }));

require('./app/routes')(app, {});
app.listen(port, () => {
  console.log('We are live on ' + port);
});
