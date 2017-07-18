const express = require('express');
const del = require('del');
const nunjucks = require('nunjucks');
const app = express();

const rev = require('./rev');

app.set('view engine', 'njk');

const nunjucksEnv = nunjucks.configure(__dirname + '/../templates', {
  watch: true,
  express: app
});

require('nunjucks-date-filter').install(nunjucksEnv);
nunjucksEnv.addFilter('rev', str => rev.get(str));

app.use(require('./routes'));

// Rev static files
(async function() {
  await del(`${__dirname}/../static-rev`);
  await rev.copy(`${__dirname}/../static/`, '**', `${__dirname}/../static-rev`);

  app.listen(3000, () => {
    console.log('Example app listening on port 3000!');
  });
})();