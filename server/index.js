const express = require('express');
const app = express();

app.set('views', __dirname + '/../templates');
app.set('view engine', 'njk');

const nunjucks = require('express-nunjucks')(app, { watch: true });
require('nunjucks-date-filter').install(nunjucks.env);

app.use(require('./routes'));

app.listen(3000, () => {
  console.log('Example app listening on port 3000!');
});