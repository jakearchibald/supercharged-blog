const util = require('util');
const fs = require('fs');

const staticModule = require('static-module');
const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
const marked = require('./marked');
const rev = require('./rev');
const Error404 = require('./error404');
const express = require('express');
const wrap = fn => (...args) => fn(...args).catch(args[2]);
const readFileOr404 = (...args) => readFile(...args).catch(err => {
  if (err.code == 'ENOENT') throw new Error404;
  throw err;
});

const router = express.Router();

router.use('/static-rev', express.static(__dirname + '/../static-rev', { maxAge: '1y' }));
router.use('/favicon.ico', express.static(__dirname + '/../static/favicon.ico', { maxAge: '1y' }));

// Set default caching headers
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache');
  next();
});

router.get('/sw.js', (req, res) => {
  const input = fs.createReadStream(`${__dirname}/../client/sw.js`);
  const toCache = [
    '/static/offline.html',
    '/static/css/all.css',
    '/static/imgs/me.jpg',
    '/static/css/imgs/social-icons.png'
  ].map(u => rev.get(u));

  res.set('Content-Type', 'application/javascript');
  input.pipe(
    staticModule({
      'static-to-cache': () => JSON.stringify(toCache, null, '  '),
      'static-rev-get': u => JSON.stringify(rev.get(u))
    })
  ).pipe(res);
});

router.get('/', wrap(async(req, res) => {
  const dir = `${__dirname}/../posts`;
  const slugs = await readdir(dir);

  const posts = (await Promise.all(
    slugs.map(async slug => {
      const itemDir = `${dir}/${slug}`;
      if (!(await stat(itemDir)).isDirectory()) return null;

      const meta = JSON.parse(await readFile(`${itemDir}/meta.json`, 'utf-8'));

      return Object.assign({}, meta, {
        slug,
        summary: marked(meta.summary)
      });
    })
  )).filter(i => i).sort((a, b) => a.posted > b.posted ? -1 : 1);

  res.render('index', {posts});
}));

router.get('/who/', (req, res) => res.render('who'));

router.get('/:year(\\d{4})/:slug/', wrap(async (req, res) => {
  const dir = `${__dirname}/../posts/${req.params.slug}`;
  const contentPromise = readFileOr404(`${dir}/content.md`, 'utf-8');
  const meta = JSON.parse(await readFileOr404(`${dir}/meta.json`, 'utf-8'));

  if (new Date(meta.posted).getFullYear() != Number(req.params.year)) {
    throw new Error404();
  }

  res.render('post', {
    meta,
    year: req.params.year,
    slug: req.params.slug,
    content: rev.replace(marked(await contentPromise))
  });
}));

// Handle errors
router.use((err, req, res, next) => {
  if (!(err instanceof Error404)) {
    next(err)
    return;
  }
  res.status(404).render('404');
});

module.exports = router;