'use strict';

var chalk = require('chalk');

var print = function (chalkColor, text) {
  console.log(chalkColor(text));
};

module.exports = {
  // Yellow is used because I'm color blind and red is a dumb color
  error: print.bind(null, chalk.yellow),
  info: print.bind(null, chalk.blue),
  success: print.bind(null, chalk.green)
};
