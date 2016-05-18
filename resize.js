'use strict';

var Promise = require('bluebird');

var execFile = Promise.promisify(require('child_process').execFile);
var fs = require('fs');
Promise.promisifyAll(fs);
var gifsicle = require('gifsicle');
var prettyHrtime = require('pretty-hrtime');
var print = require('./print.js');
var startTime = process.hrtime();
var tempfile = require('tempfile');

var args = process.argv.slice(2);

if (args.length === 0) {
  print.error('No image supplied to resize!');
  process.exit(1);
} else if (args.length > 1) {
  print.error('Too many arguments, only expecting 1, received ' + args.length);
  process.exit(2);
}

var input = args[0];
var output = 'shrunk_' + input;
var tempOutput = tempfile('.gif');
var debug = true;

var handleError = function(err) {
  print.error('Something has gone wrong:');
  print.error(err);
};

var parseDimensionsFromOutput = function(stdIn) {
  return stdIn.replace('logical screen', '').trim().split('x');
};

var parseDimensions = function(stdout) {
  var parsedStdOut = stdout.split('\r\n');
  for (var lineNum = parsedStdOut.length - 1; lineNum >= 0; lineNum--) {
    if (parsedStdOut[lineNum].indexOf('logical screen') > 0) {
      var dimensions = parseDimensionsFromOutput(parsedStdOut[lineNum]);
      if (debug) {
        print.info('Starting size - ' + dimensions[0] + 'x' + dimensions[1]);
      }
      return dimensions;
    }
  }
};

var buildArgs = function(width, outputFileName, input) {
  return ['--resize-width', width, '-o', outputFileName, input, '-O3'];
};

var copySuccessful = function() {
  var endTime = process.hrtime(startTime);
  print.success('All done - ' + prettyHrtime(endTime));
};

var copyFile = function(source, target) {
  return fs.readFileAsync(source)
    .then(fs.writeFileAsync.bind(fs, target))
    .then(copySuccessful)
    .catch(handleError);
};

var getStartingWidth = function() {
  return execFile(gifsicle, [input, '--size-info']).then(function(data) {
    return parseDimensions(data)[0];
  });
};

var getFileSize = function(file) {
  return fs.statAsync(file);
};

// Should be able to split this out further
var resize = function(width, inputFile) {
  var idealSize = 512000;
  var newWidth = width;

  getFileSize(inputFile).then(function(fileData) {
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
      execFile(gifsicle, buildArgs(width, tempOutput, input)).then(function() {
        resize(newWidth, tempOutput);
      });
    } else {
      copyFile(tempOutput, output);
    }
  });
};

getStartingWidth().then(function(width) {
  resize(width, input);
}).catch(handleError);
