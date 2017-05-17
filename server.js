const express = require('express');
const bodyParser = require('body-parser');
const RateLimit = require('express-rate-limit');
const mds = require('markdown-serve');
const path = require('path');
const app = express();
const fs = require('fs');

require('./app/routes')(app, {});

if(process.env.PRODUCTION) {
  const https = require('https');
  const port = 1234;
  https.createServer({
    key: fs.readFileSync('/home/ubuntu/sslcert/server.key'),
    cert: fs.readFileSync('/home/ubuntu/sslcert/server.crt')
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

const limiter = new RateLimit({
  windowMs: 60*60*1000, // 60 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  delayMs: 0, // disable delaying - full speed until the max limit is reached
  message: "You have exceeded your api usage, you are allowed 100 requests per hour"
});

// apply to all requests
app.use(limiter);
app.use(bodyParser.urlencoded({ extended: true }));

// markdown serving
app.set('views', path.resolve(__dirname, './markdown-layouts'));
app.set('view engine', 'pug');
app.use(express.static(path.resolve(__dirname, './markdown-layouts')));

app.get('/', function(req, res){
  res.redirect('./README');
});

app.use('/', mds.middleware({
  rootDirectory: path.resolve(__dirname, ''),
  view: 'layout'
}));
