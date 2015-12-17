var S = require('string');

module.exports = require('require-all')({
  dirname:  __dirname + '/lib',
  map: function (name, path) {
    return S(name).capitalize().s;
  }
});