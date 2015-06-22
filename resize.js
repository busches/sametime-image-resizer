'use strict';

var execFile = require('child_process').execFile;
var gifsiclePath = require('gifsicle');
var tempfile = require('tempfile');
var fs = require('fs');
var chalk = require('chalk');

var args = process.argv.slice(2);

if (args.length === 0) {
  printError('No image supplied to resize!');
  return;
} else if (args.length > 1) {
  printError('Too many arguments, only expecting 1, received ' + args.length);
  return;
}

var input = args[0];
var output = 'shrunk_' + input;
var tempOutput = tempfile('.gif');

var debug = true;

execFile(gifsiclePath, [input, '--size-info'], function processFileSize(err, stdout) {
  if (err) {
    return handleError(err);
  }

  var dimensions;

  var parseDimensions = function(stdIn) {
    return stdIn.replace('logical screen', '').trim().split('x');
  };

  var parsedStdOut = stdout.split('\r\n');
  for (var lineNum = parsedStdOut.length - 1; lineNum >= 0; lineNum--) {
    if (parsedStdOut[lineNum].indexOf('logical screen') > 0) {
      dimensions = parseDimensions(parsedStdOut[lineNum]);
      if (debug) {
        printInfo(dimensions);
      }
      break;
    }
  }

  var originalWidth = dimensions[0];
  var size;
  fs.stat(input, function(err, stat) {
    if (err) {
      return handleError(err);
    }
    size = stat.size;
  });

  var newWidth = originalWidth;
  var idealSize = 512000;

  var buildArgs = function(width, outputFileName, input) {
    return ['--resize-width', width, '-o', outputFileName, input, '-O3'];
  };

  var validateSize = function(err) {
    if (err) {
      return handleError(err);
    }

    fs.stat(tempOutput, function(err, stat) {
      if (err) {
        return handleError(err);
      }
      size = stat.size;
      if (debug) {
        printInfo('Size is now: ' + size + ' - ' + newWidth);
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
        resize();
      } else {
        copyFile(tempOutput, output, function(err) {
          if (err) {
            return handleError(err);
          }
          printInfo('All done');
        });
      }
    });
  };

  var resize = function() {
    execFile(gifsiclePath, buildArgs(newWidth, tempOutput, input), validateSize);
  };

  resize();
});

function handleError(err) {
  printError('Something has gone wrong:');
  printError(err);
}

function copyFile(source, target, handleError) {
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on('error', function(err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on('error', function(err) {
    done(err);
  });
  wr.on('close', function() {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (!cbCalled) {
      handleError(err);
      cbCalled = true;
    }
  }
}


function printError(text) {
  // Yellow is used because I'm color blind and red is a dumb color
  console.log(chalk.yellow(text));
}

function printInfo(text) {
  console.log(chalk.blue(text));
}
