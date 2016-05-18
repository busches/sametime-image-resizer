'use strict';

var fs = require('fs');
var childProcess = require('child_process');
var gifsicle = require('gifsicle');
var prettyHrtime = require('pretty-hrtime');
var tempfile = require('tempfile');

var Promise = require('bluebird');
var execFile = Promise.promisify(childProcess.execFile);
Promise.promisifyAll(fs);

var startTime = process.hrtime();

var print = require('./print.js');
var args = process.argv.slice(2);

if (args.length === 0) {
  throw new Error('No image supplied to resize!');
} else if (args.length > 1) {
  throw new Error('Too many arguments, only expecting 1, received ' + args.length);
}

var input = args[0];
var output = 'shrunk_' + input;
var tempOutput = tempfile('.gif');
var debug = true;

var handleError = function (err) {
  print.error('Something has gone wrong:');
  print.error(err);
};

var parseDimensionsFromOutput = function (stdIn) {
  return stdIn.replace('logical screen', '').trim().split('x');
};

var parseDimensions = function (stdout) {
  return stdout.split('\r\n')
    .filter(function (line) {
      return line.indexOf('logical screen') > 0;
    })
    .map(function (rawDimensions) {
      var dimensions = parseDimensionsFromOutput(rawDimensions);
      if (debug) {
        print.info('Starting size - ' + dimensions[0] + 'x' + dimensions[1]);
      }
      return dimensions[0];
    }
  );
};

var buildArgs = function (width, outputFileName, input) {
  return ['--resize-width', width, '-o', outputFileName, input, '-O3'];
};

var copySuccessful = function () {
  var endTime = process.hrtime(startTime);
  print.success('All done - ' + prettyHrtime(endTime));
};

var copyFile = function (source, target) {
  return fs.readFileAsync(source)
    .then(fs.writeFileAsync.bind(fs, target))
    .then(copySuccessful)
    .catch(handleError);
};

var getStartingWidth = function () {
  return execFile(gifsicle, [input, '--size-info']).then(function (data) {
    return parseDimensions(data)[0];
  });
};

var getFileSize = function (file) {
  return fs.statAsync(file);
};

// Should be able to split this out further
var resize = function (width, inputFile, initialRun) {
  var idealSize = 512000;
  var newWidth = width;

  getFileSize(inputFile).then(function (fileData) {
    var size = fileData.size;
    if (debug) {
      print.info('Size is now: ' + size + ' - ' + newWidth);
    }

    if (size > idealSize) {
      if (size > 1024000) {
        newWidth -= 50;
      } else if (size > 768000) {
        newWidth -= 10;
      } else if (size > 563200) {
        newWidth -= 5;
      } else {
        newWidth -= 1;
      }
      execFile(gifsicle, buildArgs(width, tempOutput, input)).then(function () {
        resize(newWidth, tempOutput, false);
      });
    } else if (initialRun) {
      print.info('File doesn\'t need resizing!');
      copyFile(input, output);
    } else {
      copyFile(tempOutput, output);
    }
  });
};

getStartingWidth().then(function (width) {
  resize(width, input, true);
}).catch(handleError);
