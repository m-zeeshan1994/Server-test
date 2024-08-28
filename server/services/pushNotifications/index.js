const config = require('./../../../config/local');
var FCM = require('fcm-node');
var serverKey = config.firebaseCloudMessageSK;
var fcm = new FCM(serverKey);

//console.log(serverKey, 'serverKey');
const sendPushNotify = ( token, title, text, color, count, daysLeft ) => {
	//console.log(token, title, text, count, daysLeft, 'token, title, body');
	var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
		to: token,
		//collapse_key: 'your_collapse_key',
		notification: {
			/*id: daysLeft,*/
			title: title,
			body: text,
			color: color,
			sound: true,
			vibrate: true,
		},
		data: {
			count: count,
			daysLeft: daysLeft,
			/*my_key: 'high',
			my_another_key: 'my another value'*/
		}
	};
	
	fcm.send(message, function ( err, response ) {
		if ( err ) {
			console.log('Something has gone wrong!');
		} else {
			console.log('Successfully sent with response: ', response);
		}
	});
	
};

module.exports = {
	sendPushNotify
};
