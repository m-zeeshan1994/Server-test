'use strict';

const ContractApiController = require('./contracts/contractsRoutes');
const login = require('./auth/authRoute');
const auth = require('../services/auth/index');
const apiRoute = require('./api/apiRoute');

function init ( server ) {
	
	// supporting every casing in query parameters
	server.use(function ( req, res, next ) {
		for ( var key in req.query ) {
			req.query[key.toLowerCase()] = req.query[key];
		}
		for ( var key in req.body ) {
			req.body[key.toLowerCase()] = req.body[key];
		}
		next();
	});
	
	server.use('/', function ( req, res, next ) {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Authorization');
		next();
	});
	
	server.get('/', function ( req, res ) {
		res.send('<center>' +
			'<div style="text-align: center; font-family: sans-serif; color: #777; font-size: 30px">Server is Live</div>' +
			'<img src="https://cdn.dribbble.com/users/563824/screenshots/3633228/untitled-5.gif">' +
			'</center>');
	});
	
	server.use('/api/v1', ContractApiController);
	server.use('/auth/api/v1', auth.authUserSession, apiRoute);
	server.use('/auth', login);
	
	/*server.use('/auth/confirm/:hash', ( req, res, next ) => {
		console.log('Getting the page');
		res.render('confirm.ejs');
	});*/
	
}

module.exports = {
	init: init
};
