const express = require('express');
const bodyParser = require('body-parser');
const RateLimit = require('express-rate-limit');
const mds = require('markdown-serve');
const path = require('path');
const app = express();
const fs = require('fs');

// Production / development setup
if(process.env.PRODUCTION) {
  const https = require('https');
  const port = 1234;
  https.createServer({
    key: fs.readFileSync('/home/jenkins/sslcert/server.key'),
    cert: fs.readFileSync('/home/jenkins/sslcert/server.crt')
  }, app).listen(port, () => {
    console.log('We are live on port ' + port);
  });
}
else {
  const port = 3000;
  app.listen(port, () => {
    console.log('We are live on port ' + port);
  });
}

// limit requests to 600 per hour
const limiter = new RateLimit({
  windowMs: 60*60*1000, // 1 hour
  max: 600, // limit each IP to 600 requests per windowMs
  delayMs: 0, // disable delaying - full speed until the max limit is reached
  message: "You have exceeded your api usage, you are allowed 600 requests per hour"
});

// apply to all requests
app.use(limiter);
app.use(bodyParser.urlencoded({ extended: true }));

// markdown serving
app.set('views', path.resolve(__dirname, './markdown-layouts'));
app.set('view engine', 'pug');
app.use(express.static(path.resolve(__dirname, './markdown-layouts')));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.get('/', function(req, res){
  res.redirect('./README');
});

app.get('/README.v1.md', function(req, res){
  res.redirect('./README.v1');
});

app.use('/', mds.middleware({
  rootDirectory: path.resolve(__dirname, ''),
  view: 'layout'
}));

// import all of the 'routes' JS files
require('./app/routes')(app, {});

// eslint-disable-next-line no-unused-vars
app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Error - please try again or raise an issue at https://github.com/AdoptOpenJDK/openjdk-api/issues.')
});
