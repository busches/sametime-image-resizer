'use strict';

var chalk = require('chalk');

var print = function(chalkColor) {
  return function(text) {
    console.log(chalkColor(text));
  };
};

module.exports = {
  error:  function(text) {
    // Yellow is used because I'm color blind and red is a dumb color
    print(chalk.yellow)(text);
  },

  info: function(text) {
    print(chalk.blue)(text);
  },

  success: function(text) {
    print(chalk.green)(text);
  },
};
