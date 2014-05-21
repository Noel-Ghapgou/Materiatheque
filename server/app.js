var http = require('http');
var express = require('express');
var ejs = require('ejs');
var config = require('./config');
var server = require("./server");
var log4js = require('log4js');

var debug = true;
var logtofile = true;

var appenders = [{
    type : 'console'
}];

if (logtofile) {
    appenders.push({
        type : 'file',
        filename : 'debug.log',
    });
}

log4js.configure({
    appenders : appenders
});
var logger = log4js.getLogger();

var app = express();
app.set('port', config.listenPort);
app.set('views', config.viewsDir);
app.engine('html', ejs.renderFile);
app.use(log4js.connectLogger(logger, {
    level : log4js.levels.DEBUG
}));
app.set('view engine', 'html');
app.use('/', express.static(config.appDir));
app.use(app.router);
app.use(express.errorHandler());
app.use(function(req, res, next)
{
    res.render('index');
});

var httpServer = app.listen(config.listenPort, function()
{
    logger.info('Http server listening on port ' + config.listenPort);
});

server.start(httpServer, config, logger, debug);

