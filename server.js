var fs = require('fs');
var path = require('path');
var Hapi = require('hapi');
var Good = require('good');
var Joi = require('joi');
var sharp = require('sharp');
var levelup = require('level');
var Jobs = require('level-jobs');

var server = new Hapi.Server();
server.connection({ port: 3030 });

var db = levelup('.jobs');

function worker(payload, cb) {
  server.log('info', "Processing file:" + payload.filename);
  sharp(path.join(__dirname, "slides", payload.filename)).metadata(function(err, metadata) {
    console.log(err);
    console.log(metadata);
  });
}

var maxConcurrency = 2;
var queue = Jobs(db, worker, maxConcurrency);

server.route({
    method: 'POST',
    path: '/submit',
    config: {
	validate: { 
          payload: { 
            file: Joi.object().required()
    	}},
        payload: {
	    maxBytes: 2147483648,
            output: 'stream',
            parse: true,
            allow: 'multipart/form-data'
        },
 
        handler: function (request, reply) {
            var data = request.payload;
            if (data.file) {
                var name = data.file.hapi.filename;
		console.log(name);
		console.log(__dirname);
                var filePath = path.join(__dirname, "slides", name);
                var file = fs.createWriteStream(filePath);
 
                file.on('error', function (err) {
                    console.error(err)
                });
 
                data.file.pipe(file);
 
                data.file.on('end', function (err) {
                    var ret = {
                        filename: data.file.hapi.filename,
                        headers: data.file.hapi.headers
                    }
		    var payload = {filename: data.file.hapi.filename};

		    var jobId = queue.push(payload, function(err) {
		      if (err) console.error('Error pushing work into the queue', err.stack);
		    });
                    
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
