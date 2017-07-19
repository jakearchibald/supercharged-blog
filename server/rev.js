const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');

const rename = util.promisify(fs.rename);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const glob = util.promisify(require('glob'));
const mkdirp = util.promisify(require('mkdirp'));
const through2 = require('through2');
const escapeStringRegexp = require('escape-string-regexp');

const hashes = new Map();

function hashExtension(extension, hash) {
  return '.' + hash.digest('hex').slice(0, 10) + extension;
}

module.exports.copyAndRev = async function copyAndRev(cwd, from, to) {
  cwd = path.normalize(cwd);
  to = path.normalize(to);

  const paths = await glob(from, {
    cwd,
    nodir: true
  });

  await Promise.all(
    paths.map(async p => {
      const parsedPath = path.parse(p);
      const parsedOutputPath = {
        dir: parsedPath.dir ? `${to}/${parsedPath.dir}` : to,
        name: parsedPath.name,
        ext: parsedPath.ext
      };

      const hash = crypto.createHash('md5');
      const input = fs.createReadStream(`${cwd}/${p}`);
      const initialOutputPath = path.format(parsedOutputPath);

      await mkdirp(parsedOutputPath.dir);

      await new Promise(resolve => {
        input.pipe(through2((chunk, enc, callback) => {
          hash.update(chunk);
          callback(null, chunk);
        })).pipe(fs.createWriteStream(initialOutputPath)).on('finish', resolve);
      });

      parsedOutputPath.ext = hashExtension(parsedOutputPath.ext, hash);

      hashes.set(`/static/${p}`, `/static-rev/${parsedPath.dir}/${parsedOutputPath.name}${parsedOutputPath.ext}`);
      await rename(initialOutputPath, path.format(parsedOutputPath));
    })
  );
}

module.exports.addAndRev = async function addAndRev(p, destination, content) {
  const parsedPath = path.parse(p);
  const newExtension = hashExtension(parsedPath.ext,
    crypto.createHash('md5').update(content)
  );

  let outputPath = `${parsedPath.name}${newExtension}`;
  if (parsedPath.dir) outputPath = `${parsedPath.dir}/` + outputPath;

  hashes.set(`/static/${p}`, `/static-rev/${outputPath}`);
  await writeFile(`${destination}/${outputPath}`, content);
};

module.exports.replaceInFiles = async function replaceInFiles(inGlob) {
  const paths = await glob(inGlob, { nodir: true });

  await Promise.all(
    paths.map(async p => {
      const content = await readFile(p, 'utf8');
      await writeFile(p, replace(content));
    })
  );
};

function replace(content) {
  const re = new RegExp(
    [...hashes.keys()].map(s => escapeStringRegexp(s)).join('|'),
    'g'
  );

  return content.replace(re, match => hashes.get(match));
};

module.exports.replace = replace;

module.exports.get = function get(key) {
  return hashes.get(key);
};