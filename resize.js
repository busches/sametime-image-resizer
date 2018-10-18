'use strict';

const path = require('path');

const {execFile} = require('mz/child_process');
const fs = require('mz/fs');
const gifsicle = require('gifsicle');
const prettyHrtime = require('pretty-hrtime');
const tempfile = require('tempfile');

const print = require('./print.js');

const startTime = process.hrtime();

const args = process.argv.slice(2);

if (args.length === 0) {
  throw new Error('No image supplied to resize!');
} else if (args.length > 1) {
  throw new Error('Too many arguments, only expecting 1, received ' + args.length);
}

const input = args[0];
const inputPath = path.parse(input);
let output = 'shrunk_' + inputPath.base;
if (inputPath.dir.length > 0) {
  output = inputPath.dir + '\\' + output;
}
const tempOutput = tempfile('.gif');
const debug = true;

const handleError = err => print.error('Something has gone wrong:\n' + err);

const parseDimensionsFromOutput = stdIn => stdIn.replace('logical screen', '').trim().split('x');

const parseDimensions = function (stdout) {
  return stdout[0].split('\r\n')
    .filter(line => line.indexOf('logical screen') > 0)
    .map(rawDimensions => {
      const dimensions = parseDimensionsFromOutput(rawDimensions);
      if (debug) {
        print.info('Starting size - ' + dimensions[0] + 'x' + dimensions[1]);
      }
      return dimensions[0];
    })
    .reduce((dimensions, dimension, i) => {
      dimensions[i === 0 ? 'x' : 'y'] = dimension;
      return dimensions;
    }, {});
};

const buildArgs = (width, outputFileName, input) => ['--resize-width', width, '-o', outputFileName, input, '-O3'];

const copySuccessful = function () {
  const endTime = process.hrtime(startTime);
  print.success('All done - ' + prettyHrtime(endTime));
};

const copyFile = function (source, target) {
  return fs.readFile(source)
    .then(fs.writeFile.bind(fs, target))
    .then(copySuccessful)
    .catch(handleError);
};

const getStartingWidth = () => execFile(gifsicle, [input, '--size-info']).then(data => parseDimensions(data).x);

const getFileSize = file => fs.stat(file);

// Should be able to split this out further
const resize = function (width, inputFile, initialRun) {
  const idealSize = 5 * 1024 * 1024;
  let newWidth = width;

  getFileSize(inputFile).then(fileData => {
    const {size} = fileData;
    if (debug) {
      print.info('Size is now: ' + size + ' - ' + newWidth);
    }

    if (size > idealSize) {
      if (size > idealSize * 6) {
        newWidth -= 200;
      } else if (size > idealSize * 4) {
        newWidth -= 100;
      } else if (size > idealSize * 2) {
        newWidth -= 50;
      } else if (size > idealSize * 1.5) {
        newWidth -= 25;
      } else if (size > idealSize * 1.1) {
        newWidth -= 10;
      } else if (size > idealSize * 1.05) {
        newWidth -= 5;
      } else {
        newWidth -= 1;
      }
      execFile(gifsicle, buildArgs(width, tempOutput, input)).then(() => resize(newWidth, tempOutput, false));
    } else if (initialRun) {
      print.info('File doesn\'t need resizing!');
      if (input !== output) {
      copyFile(input, output);
      }
    } else {
      copyFile(tempOutput, output);
    }
  });
};

getStartingWidth().then(width => resize(width, input, true)).catch(handleError);
