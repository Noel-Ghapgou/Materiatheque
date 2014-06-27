var socketio = require('socket.io');
var logger = null;
var debug = null;
var config = null;

var clients = {
    list : {},
};

function startServer(httpServer, cfg, loggr, dbg)
{
    logger = loggr;
    debug = dbg;
    config = cfg;
    initSocketIO(httpServer);
}

function initSocketIO(httpServer)
{
    var io = socketio.listen(httpServer);

    io.sockets.on('connection', function(socket)
    {
        var client = {
            socket : socket,
        };

        logger.info(socket.id + ' client connected');

        socket.on('disconnect', function()
        {
            delete clients.list[socket.id];
            logger.info(socket.id + " client disconnected");
        });

        socket.on('request', function(params, callback)
        {
            if (!params || !params.request) {
                // Error
                params = params || {};
                params.error = 'invalid request parameters.';
                logger.error(socket.id + ' request error: ' + params.error);
                callback || callback(params);
                return;
            }

            logger.info(socket.id + ' request ' + params.request);
            try {
                switch(params.request)
                {
                    case 'login':
                        params.status = 'ok';
                        params.data = [{
                            id : 1,
                            desc : "toto____1"
                        }, {
                            id : 2,
                            desc : "tata____1"
                        }, {
                            id : 3,
                            desc : "titi____1"
                        }];
                        break;

                    case 'index':
                        params.status = 'ok';
                        params.data = [{
                            id : 1,
                            desc : "toto____2"
                        }, {
                            id : 2,
                            desc : "tata____2"
                        }, {
                            id : 3,
                            desc : "titi____2"
                        }];
                        break;

                    case 'search':
                        params.status = 'ok';
                        params.data = [{
                            id : 1,
                            desc : "toto____3"
                        }, {
                            id : 2,
                            desc : "tata____3"
                        }, {
                            id : 3,
                            desc : "titi____3"
                        }];
                        break;

                    default:
                        throw "Not implemented request " + params.request;

                }
            }
            catch (e) {
                console.error("socket.io request: " + e.message || e);
                params.error = e.message;
                params.status = 'fail';
            }

            function sendResponse(result)
            {
                if (!result.method || result.method == 'post' || !callback) {
                    socket.emit('response', {
                        result : result
                    });
                }
                else {
                    callback(result);
                }
            }

            sendResponse(params);
        });

        clients.list[socket.id] = client;
    });
}

exports.start = startServer;
