/**
 * @author NomanFarooq <nomanfarooq1432@gmail.com>
 * @since 2022-02-25
 */

'use strict';
const _ = require('lodash'),
	emailService = require('../../services/mail/email');

async function confirmMail ( email, token ) {
	//console.log(email, token, 'credentials in mail');
	try {
		let template = emailService.utils.generateContactEmail(email, token);
		let sendEmail = await emailService.sendEmail(email, template);
		if ( sendEmail instanceof Error ) {
			return ({status: 400, detail: sendEmail.message});
		} else {
			return ({status: 200, detail: 'Verification link sent to your registered email address.'});
		}
	} catch ( err ) {
		console.log(err, 'Exception in sending mail');
		return ({status: 400, detail: 'something went wrong...'});
	}
}

module.exports = {
	confirmMail
};
