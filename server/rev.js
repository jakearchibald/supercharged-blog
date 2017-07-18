const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');

const rename = util.promisify(fs.rename);

const glob = util.promisify(require('glob'));
const mkdirp = require('mkdirp');
const through2 = require('through2');

const hashes = new Map();

module.exports.copy = async function copy(cwd, from, to) {
  const paths = await glob(from, {
    cwd,
    nodir: true
  });

  await Promise.all(
    paths.map(async p => {
      const parsedPath = path.parse(p);
      const parsedOutputPath = {
        base: parsedPath.dir ? `${to}/${parsedPath.dir}` : to,
        name: parsedPath.name,
        ext: parsedPath.ext
      };

      const hash = crypto.createHash('md5');
      const input = fs.createReadStream(`${cwd}/${p}`);
      const initialOutputPath = path.format(parsedOutputPath);

      await mkdirp(parsedOutputPath.base);

      await new Promise(resolve => {
        input.pipe(through2((chunk, enc, callback) => {
          hash.update(chunk);
          callback(null, chunk);
        })).pipe(fs.createWriteStream(initialOutputPath)).on('finish', resolve);
      });

      parsedOutputPath.ext = '.' + hash.digest('hex').toString(16).slice(0, 10) + parsedOutputPath.ext;
      const finalPath = path.format(parsedOutputPath);
      hashes.set(p, finalPath);
      await rename(initialOutputPath, finalPath);
    })
  );
}

module.exports.get = function get(key) {
  return hashes.get(key);
};