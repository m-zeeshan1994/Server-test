'use strict';

module.exports = {
	environment: 'LOCAL',
	hostname: 'localhost',
	serverPort: 5000,
	sessionSecret: '',
	localServer: 'http://localhost:5000',
	liveServer: 'http://indxr.app',
	jwtSecret: 'kjh513%%!151e1523521423',
	/*simplelogicx key*/
	//firebaseCloudMessageSK: 'AAAANZrV7zM:APA91bEOATIrfPlu5-dz65mTothh_m1utEPNrXxF9NFPJi8iJhP7Fw5ENwvs7ua2B2J6Wo5onTwvmoGnXrOu_iG5NWU-r-fi7sMnMoSEYpi3veE0rCXdWYEvVjZco3zt3nrKv-4vwXHf',
	/*indxr-app key*/
	firebaseCloudMessageSK : 'AAAAzx_d93Q:APA91bEHIqFxRv67T0qFdsgj3vlngqlDOTCCha3nSXjZOX6kkg296auRZtb5B_U1pH92yQRlLF4XU6ziHlP_lq330n_YLTThaMowEB7OCx1CfF3SxsmMil0sWMJGfuis4lFokrKBfCml',
	debug: true,
	SMTPConfig: {
		pool: true,
		host: 'send.one.com',
		port: 465,
		secure: true,
		auth: {
			user: 'registratie@indxr.be',
			pass: '3VztTrPmxGtGJcX5'
		},
		tls: {
			rejectUnauthorized: false
		}
	},
};
