const express = require('express');
const cors = require('cors');
const mds = require('markdown-serve');
const path = require('path');
const db = require('./app/lib/db.service');
const app = express();

app.use(cors());

const port = 8080;

db.connect()
  .then(() => console.log('Database connected'))
  .then(() => {
    const client = db.get();
    const collection = client.db(db.dbName).collection(db.collectionName);

    // use request route as the primary key (this is a noop if index already exists)
    collection.createIndex({route: 1}, {v: 2, unique: true, background: false})
      .catch(err => console.error(err));
  })
  .then(() => {
    app.listen(port, () => {
      console.log('We are live on port ' + port);
    });
  })
  .catch(e => {
    console.error(e);
  });

// markdown and static content serving
app.set('views', path.resolve(__dirname, './markdown-layouts'));
app.set('view engine', 'pug');
app.use(express.static(path.resolve(__dirname, './markdown-layouts')));

const mdServer = new mds.MarkdownServer(path.resolve(__dirname, ''));
mdServer.resolverOptions.defaultPageName = 'README';
app.get(['/', '/README', '/v2', '/v2/'], (req, res, next) => {
  mdServer.get('/README', (err, result) => {
    if (err) {
      console.error(err);
      return next();
    }
    res.render('layout', {markdownFile: result});
  });
});

app.use((req, res, next) => {
  app.set('json spaces', req.query.pretty === 'false' ? false : 2);
  next();
});

// import all of the 'routes' JS files
const apiRoutes = require('./app/routes');
app.use(apiRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Error - please try again or raise an issue at https://github.com/AdoptOpenJDK/openjdk-api/issues');
});
