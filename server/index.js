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
  const staticRevPath = `${__dirname}/../static-rev`;
  await del(staticRevPath);
  await rev.copyAndRev(`${__dirname}/../static`, '**', staticRevPath);
  await rev.replace(`${__dirname}/../static-rev/**/*.css`);

  app.listen(3000, () => {
    console.log('Example app listening on port 3000!');
  });
})();