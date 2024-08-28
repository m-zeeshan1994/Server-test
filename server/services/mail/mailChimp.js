const axios = require('axios');

const config = {
	headers: {
		'Content-type': 'application/json',
		'Authorization': 'auth d30627f6d734808763245fa3c52a8c59-us6',
	},
};
const subscribeMailChimp = async ( data ) => {
	//console.log(data, 'data i got');
	//status: 'pending'
	/*const mailchimpData = {
		'email_address': 'riz@co.com',
		'merge_fields': {
			'FNAME': 'riz',
			'LNAME': 'wan'
		},
		'status': 'subscribed'
	};*/
	const mailchimpData = {
		email_address: data.emailId,
		merge_fields: {FNAME: data.firstName, LNAME: data.lastName},
		status: 'subscribed'
	};
	
	const mailchimpUrl = 'https://us6.api.mailchimp.com/3.0/lists/502a937cca/members';
	const mailchimpDataPost = JSON.stringify(mailchimpData);
	
	return await axios.post(mailchimpUrl, mailchimpDataPost, config).then(( res ) => {
		//console.log(res.status, 'status');
		return res.status;
	}).catch(err => {
		//console.log(err.response.data.status, 'error in mail chimp subscription');
		return err.response.status;
	});
};
module.exports = {
	subscribeMailChimp
};
