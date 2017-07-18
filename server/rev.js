const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');

const chokidar = require('chokidar');
const mkdirp = require('mkdirp');
const del = require('del');

const hashes = new Map();

function revCopyWatch(cwd, from, to) {
  const watcher = chokidar.watch(from, {
    ignored: /(^|[\/\\])\../,
    cwd
  });

  async function processPath(p) {
    const parsedPath = path.parse(p);
    const parsedOutputPath = {
      dir: to + parsedPath.dir.slice(from.length),
      name: parsedPath.name,
      ext: parsedPath.ext
    };

    const hash = crypto.createHash('md5');
    const input = fs.createReadStream(`${cwd}/${p}`);
    await mkdirp(`${cwd}/${parsedOutputPath.dir}`);
    const output = fs.createWriteStream(`${cwd}/${parsedOutputPath.dir}/${parsedOutputPath.name}${parsedOutputPath.ext}`);

    input.pipe(output);
  }

  watcher.on('add', processPath);
  watcher.on('change', processPath);
}

del(`${__dirname}/../static-rev`).then(() => {
  revCopyWatch(path.normalize(`${__dirname}/..`), 'static/', `static-rev/`);
});