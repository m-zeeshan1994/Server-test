'use strict';
const cliColor = require('cli-color');
let pool = require('./dbConfig');
const _ = require('lodash');

class DbConnection {
	open ( callBack ) {
		this.connection.connect(callBack);
	}
	
	async getConnection () {
		try {
			let connection = await pool.getConnection();
			connection.releaseTimeout = setTimeout(() => {
				try {
					if ( _.has(connection, 'connection.isReleased') ) {
						if ( !connection.connection.isReleased ) {
							connection.rollback();
							connection.release();
							console.log(cliColor.red('Released Forcefully dbconnection.js->Realspot!!!'));
						}
					}
				} catch ( e ) {
					console.log(e, 'error message in db connection catch 1');
				}
				/* Timeout of 10 sec, if connection not release till 10 sec, it will force terminate the connection */
			}, 10000);
			return Promise.resolve(connection);
		} catch ( e ) {
			console.log(e);
			return Promise.reject(undefined);
		}
		
	}
	
	releaseConnection ( connection, callback ) {
		try {
			connection.release();
			callback(null, 200);
		} catch ( e ) {
			callback('ERR in releasing connection', null);
		}
	}
	
	close () {
		this.connection.end();
	}
	
	beginTransaction ( callBack ) {
		this.connection.beginTransaction(callBack);
	}
	
	executeQuery ( queryText, params, callBack ) {
		this.connection.query(queryText, params, callBack);
	}
	
	commit ( callBack ) {
		this.connection.commit(callBack);
	}
	
	rollback ( callBack ) {
		this.connection.rollback(callBack);
	}
	
	constructor ( dbConfig ) {
	
	}
	
	_invalidParams ( dbParamName ) {
		this.connection = undefined;
		throw new Error(dbParamName + ' is required to establish Database Connection!');
		return undefined;
	}
	
}

module.exports = {
	DbConnection
};
