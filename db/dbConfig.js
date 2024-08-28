const clc = require('cli-color');
const mysql = require('promise-mysql');

const pool = mysql.createPool({
	connectionLimit: 100,
	port: '3306',
	
	/*host: `localhost`,
	user: `root`,
	password: ``,
	database: `demorealspot_eu`,*/
	
	host: 'database-realspot.cd1m2wwmojfk.us-east-2.rds.amazonaws.com',
	user: 'admin',
	password: 'realSpot&45!',
	database: 'indxr_live',
	//database: 'realspot_eu',
	
	charset: 'utf8mb4',
	timezone: 'PKT',
	timeout: 4000
});

pool.on('connection', ( connection ) => {
	console.log('Connection Acquired from Pool with ID: ', connection.threadId);
	connection.isReleased = false;
	connection.releaseTimeout = setTimeout(() => {
		try {
			if ( !connection.isReleased ) {
				connection.release();
				console.log(clc.red('Connection Forcefully Released --', connection.threadId));
				
			}
		} catch ( e ) {
			console.log(clc.red('DATA-ACCESS Exception --', e));
		}
		/* Timeout of 10 sec, if connection not release till 10 sec, it will force terminate the connection */
	}, 10000);
});

pool.on('release', ( connection ) => {
	connection.commit();
	connection.isReleased = true;
	console.log(clc.yellow('Connection Released Normally ', connection.threadId));
});

module.exports = pool;

