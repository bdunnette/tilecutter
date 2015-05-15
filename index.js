var fs = require('fs');
var Hapi = require('hapi');
var Good = require('good');

var server = new Hapi.Server();
server.connection({ port: 3000 });

server.route({
    method: 'POST',
    path: '/submit',
    config: {
 
        payload: {
            output: 'stream',
            parse: true,
            allow: 'multipart/form-data'
        },
 
        handler: function (request, reply) {
            var data = request.payload;
            if (data.file) {
                var name = data.file.hapi.filename;
                var path = __dirname + "/uploads/" + name;
                var file = fs.createWriteStream(path);
 
                file.on('error', function (err) { 
                    console.error(err) 
                });
 
                data.file.pipe(file);
 
                data.file.on('end', function (err) { 
                    var ret = {
                        filename: data.file.hapi.filename,
                        headers: data.file.hapi.headers
                    }
                    reply(JSON.stringify(ret));
                })
            }
 
        }
    }
});

server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
        reply('Hello, world!');
    }
});

server.route({
    method: 'GET',
    path: '/{name}',
    handler: function (request, reply) {
        reply('Hello, ' + encodeURIComponent(request.params.name) + '!');
    }
});

server.register({
    register: Good,
    options: {
        reporters: [{
            reporter: require('good-console'),
            events: {
                response: '*',
                log: '*'
            }
        }]
    }
}, function (err) {
    if (err) {
        throw err; // something bad happened loading the plugin
    }

    server.start(function () {
        server.log('info', 'Server running at: ' + server.info.uri);
    });
});
