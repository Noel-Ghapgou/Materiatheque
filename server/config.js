var path = require('path');
var baseDir = __dirname;
var config = {
    listenPort : 8000,
    baseDir : baseDir,
    viewsDir : path.join(baseDir, '../app'),
    appDir : path.join(baseDir, '../app'),
};

module.exports = config;
