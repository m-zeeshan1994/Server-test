'use strict';
/**
 * Dependencies of This Application
 */
const
	express = require('express'),
	bodyParser = require('body-parser'),
	routes = require('./routes/appRoutes'),
	ejs = require('ejs');

let server = express(),
	create,
	start;

const logger = require('./logger/index');

const session = require('express-session');

const path = require('path');

create = function ( config ) {
	// Server settings
	server.set('env', config.env);
	server.set('port', config.serverPort);
	server.set('hostname', config.hostname);
	server.set('view engine', 'ejs');
	
	// Returns middleware that parses json
	server.use(bodyParser.json());
	server.use(session({
		secret: 'secret-key',
		saveUninitialized: true,
		resave: false,
	}));
	
	// setup public directory
	server.use(express.static('public'));
	//server.use('/css', express.static(_dirname))
	
	// Set up routes
	routes.init(server);
};

/*
server.get('public', function (req, res) {
	// Render page using renderFile method
	ejs.renderFile('index.ejs', {},
		{}, function (err, template) {
			if (err) {
				throw err;
			} else {
				res.end(template);
			}
		});
});
*/

start = function () {
	let hostname = server.get('hostname'),
		port = server.get('port');
	server.listen(port, function () {
		logger.info(`Starting instance at: ${hostname} : ${port}`);
		console.log(`Starting instance at: ${hostname} : ${port}`);
	});
};

module.exports = {
	create,
	start
};
