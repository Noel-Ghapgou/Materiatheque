var path = require('path');
var baseDir = __dirname;
var config = {
    listenPort : 8000,
    baseDir : baseDir,
    viewsDir : path.join(baseDir, '../webapp'),
    appDir : path.join(baseDir, '../webapp'),
};

module.exports = config;
