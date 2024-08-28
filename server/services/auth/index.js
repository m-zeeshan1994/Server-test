'use strict';

const _ = require('lodash');
const config = require('./../../../config/local');
const DbConnection = require('../../../db/dbConnection').DbConnection;
const md5 = require('md5');
const jwt = require('jsonwebtoken');
const moment = require('moment');

/*
const redis = require('redis');
const client = redis.createClient();
*/

const {subscribeMailChimp} = require('./../mail/mailChimp');
const {confirmMail} = require('./../../services/auth/helper');

const activeSessionStatus = 1;
const deletedSessionStatus = 0;

/*
(async () => {
	client.on('error', ( err ) => console.log('Redis Client Error', err));
	await client.connect();
	console.log('redis is working');
})();
*/

const mailVerificationToken = async ( email, pass ) => {
	return jwt.sign({email, pass}, config.jwtSecret, {expiresIn: '24h'});
};

/**
 * @param { mail } email - contact
 * @param {  int } status - contact
 * @returns {Promise<Object>}
 */
const verifyUser = async ( email, status ) => {
	let connection;
	connection = await new DbConnection().getConnection();
	try {
		if ( connection ) {
			return await connection.query(`SELECT *
										   from contact
										   Where
											   email_add = ? AND
											   status_id = ?`, [email, status]);
		} else {
			console.log(400, failedToGetDatabaseConnection.description);
		}
	} catch ( e ) {
		//res.send({status: 400, detail: 'Something went wrong updating fcm token'});
		console.log('Exception in update fcm token: ', e);
	} finally {
		connection && connection.release();
	}
};

/**
 * @param { int } id - user id
 * @returns {Promise<Object>}
 */
const getFcmToken = async ( id ) => {
	let connection;
	connection = await new DbConnection().getConnection();
	try {
		if ( connection ) {
			return await connection.query(`SELECT
											   fcm_token
										   from contact
										   Where
											   id = ?`, [id]);
		} else {
			console.log(400, failedToGetDatabaseConnection.description);
		}
	} catch ( e ) {
		//res.send({status: 400, detail: 'Something went wrong updating fcm token'});
		console.log('Exception in update fcm token: ', e);
	} finally {
		connection && connection.release();
	}
};

const updateFcmToken = async ( token, email ) => {
	console.log(token, email, 'update token');
	let connection;
	connection = await new DbConnection().getConnection();
	try {
		if ( connection ) {
			return await connection.query(`UPDATE contact
										   SET fcm_token = ?
										   WHERE
											   email_add = ?`, [token, email]);
		} else {
			console.log(400, failedToGetDatabaseConnection.description);
		}
	} catch ( e ) {
		//res.send({status: 400, detail: 'Something went wrong updating fcm token'});
		console.log('Exception in update fcm token: ', e);
	} finally {
		connection && connection.release();
	}
};

async function authUserSession ( req, res, next ) {
	let authToken = req.headers.authorization;
	let sessionHash = null;
	if ( !authToken ) {
		res.send({status: 440, detail: 'No authorization token with api request'});
		res.end();
		return;
	}
	let connection;
	try {
		var decodedToken = jwt.verify(authToken, config.jwtSecret);
		sessionHash = decodedToken.sessionHash;
		if ( !sessionHash ) {
			res.send({status: 440, detail: 'Could not authenticate, Invalid auth token'});
			res.end();
			return;
		}
		
		connection = await new DbConnection().getConnection();
		if ( connection ) {
			let dbRes = await connection.query(`SELECT
													id,
													hash,
													user_id,
													created_at,
													status
												FROM user_sessions
												where
													hash = ? and
													status = ?`, [sessionHash, activeSessionStatus]);
			if ( _.has(dbRes, '[0].id') ) {
				if ( _.has(dbRes, '[0].id') ) {
					if ( dbRes[0].hash == sessionHash ) {
						req.userId = dbRes[0].user_id;
						req.sessionId = sessionHash;
						next();
					} else throw 'Session record found not matching with provided session hash';
				} else {
					res.send({status: 440, detail: 'No session saved'});
					res.end();
				}
			} else {
				res.send({status: 440, detail: 'Your session has been expired'});
				res.end();
			}
		} else {
			res.send({status: 440, detail: 'Could not authenticate at the moment'});
			res.end();
		}
	} catch ( e ) {
		console.log('Exception: ', e);
		res.send({status: 440, detail: 'Something went wrong while authenticating session'});
		res.end();
	} finally {
		if ( connection ) {
			connection.release();
		}
	}
}

async function userConfirm ( req, res, next ) {
	console.log(req.params.hash, 'see received data here');
	let connection;
	connection = await new DbConnection().getConnection();
	try {
		if ( connection ) {
			const token = req.params.hash;
			if ( token ) {
				jwt.verify(token, config.jwtSecret, async ( err, decode ) => {
					if ( err ) {
						//res.status(400).json({error: 'Incorrect or Expired link'});
						res.render('confirm.ejs', {response: {status: 400, detail: `Incorrect or Expired link`}});
						//res.send({status: 400, detail: `Incorrect or Expired link`});
						res.end();
						return;
					}
					//const {emailId, passwordApp} = decode;
					if ( decode.email ) {
						const verifyContact = await verifyUser(decode.email, 1);
						if ( verifyContact.length > 0 ) {
							let updatedContactVerified = await connection.query(`UPDATE contact
																				 SET verified_app = ?
																				 WHERE
																					 email_add = ?`, [1, decode.email]);
							if ( _.has(updatedContactVerified, 'affectedRows') ) {
								//console.log('User verified successfully');
								//console.log(verifyContact[0], 'updatedContactVerified');
								const request = {
									firstName: verifyContact[0].first_name,
									lastName: verifyContact[0].last_name,
									emailId: verifyContact[0].email_add,
								};
								const respMailChimp = await subscribeMailChimp(request);
								console.log(respMailChimp, 'respMailChimp');
								//res.status(200).json({status: '200', details: 'User verified successfully'});
								res.render('confirm.ejs', {response: {status: 200, detail: `Account verified successfully`}});
								res.end();
								//res.send({status: 200, detail: `Account verified successfully`});
							}
						}
					}
				});
			}
		} else {
			res.send({status: 400, detail: failedToGetDatabaseConnection.description});
		}
	} catch ( e ) {
		res.send({status: 400, detail: 'something went wrong while trying to register'});
		console.log('Exception: ', e);
	} finally {
		if ( connection ) {
			connection.release();
		}
	}
}

async function userRegister ( req, res ) {
	console.log(req.body, 'register is hit');
	const request = req.body.formData;
	
	let connection;
	try {
		let emailId = request.emailId;
		let firstName = request.firstName;
		let lastName = request.lastName;
		let companyName = request.companyName;
		let subscription = request.subscription;
		let passwordApp = request.password;
		let password = '';
		let terms = request.terms;
		let nickName = emailId;
		let subHistoryId = ''; // re update on 2nd entry
		let statusId = 1;
		
		let addedDate = new Date();
		let contactType = 'Individual';
		let contactGroupCat = '1'; //1 then 5
		let confirmLink = '';
		let langId = '2';
		let startingWord = request.emailId.charAt(0); // NULL or charAt0
		
		let parentId = 0; //1234 or  0
		let isDeleted = 0;
		let userType = 1; //1 or 0
		let lastLogin = +new Date();
		
		let rentEmail = 0;
		let loginSync = 0;
		let indexationLetter = 90;
		
		let startPlanDate = +new Date();
		let createEndPlanDate = moment().add(1, 'month').format();
		let endPlanDate = +new Date(createEndPlanDate);
		
		let stripeCustomerId = '';
		
		const checkReqData = !!emailId && !!firstName && !!companyName && !!lastName && !!subscription && !!terms && !!password;
		if ( checkReqData ) {
			res.send({status: 401, detail: 'please fill the form correctly'});
			res.end();
		}
		
		connection = await new DbConnection().getConnection();
		if ( connection ) {
			let hash = md5(new Date() + Math.random());
			let passwordHash = md5(passwordApp);
			let verifyEmail = await connection.query(`SELECT
														  email_add
													  FROM contact
													  WHERE
														  email_add = ?`, [emailId]);
			if ( verifyEmail.length > 0 ) {
				res.send({status: 201, detail: 'Email already exist'});
				return;
			}
			let dbRes = await connection.query(`INSERT INTO contact
												(first_name, last_name, email_add, nick_name, password, status_id, dateadded, plan_start_date,
												 plan_end_date, contact_type, contact_group_cat, company_name, confirm_link, lang_id, parent_id,
												 is_delete, user_type, last_login, rent_email, stripe_customer_id, login_sync, indexation_letter, password_app, hash,
												 verified_app)
												VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[firstName, lastName, emailId, nickName, password, statusId, addedDate, startPlanDate, endPlanDate, contactType, contactGroupCat, companyName,
					confirmLink, langId, parentId, isDeleted, userType, lastLogin, rentEmail, stripeCustomerId, loginSync, indexationLetter, passwordHash, hash, 0]);
			if ( _.has(dbRes, 'insertId') ) {
				//console.log(dbRes.insertId, 'dbRes');
				let subScriptionRes = await connection.query(`INSERT INTO contact_subscription_history (plan_id, start_date, end_date, contact_id, vat, company_name,
																										street1, nbr, postal_code, city, country, invoice_status,
																										voucher_code)
															  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					[6, startPlanDate, endPlanDate, dbRes.insertId, '', companyName, '', '', '', '', '', 1, '']);
				if ( _.has(subScriptionRes, 'insertId') ) {
					//console.log(subScriptionRes, 'subScriptionRes');
					let updatedContact = await connection.query(`UPDATE contact
																 SET sub_history_id = ?
																 WHERE
																	 id = ?`, [subScriptionRes.insertId, dbRes.insertId]);
					if ( _.has(updatedContact, 'affectedRows') ) {
						//console.log(updatedContact, 'affected');
						let dbRes2 = await connection.query(`INSERT INTO contact
															 (first_name, last_name, email_add, nick_name, password, status_id, dateadded, contact_type, contact_group_cat,
															  company_name, confirm_link, lang_id,
															  parent_id, starting_word, is_delete, user_type, last_login, rent_email, login_sync, indexation_letter,
															  password_app, hash, verified_app)
															 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
							[firstName, lastName, emailId, '', password, statusId, addedDate, contactType, '5', companyName, confirmLink, langId,
								dbRes.insertId, startingWord, isDeleted, 0, lastLogin, rentEmail, loginSync, indexationLetter, passwordHash, hash, 0]);
						if ( _.has(dbRes2, 'insertId') ) {
							console.log(dbRes2, 'dbRes2 entry 2 added');
							let token = await mailVerificationToken(emailId, passwordApp);
							const mailResp = await confirmMail(emailId, token);
							console.log(mailResp, 'mailResp here');
							res.send({status: 200, detail: 'Account registered successfully check your email'});
						} else {
							res.send({status: 400, detail: 'something wrong while registering account'});
						}
					}
				}
			}
		} else {
			res.send({status: 400, detail: failedToGetDatabaseConnection.description});
		}
	} catch ( e ) {
		res.send({status: 400, detail: 'something went wrong while trying to register'});
		console.log('Exception: ', e);
	} finally {
		if ( connection ) {
			connection.release();
		}
	}
}

async function userLogin ( req, res ) {
	console.log(req.body, 'i m hit');
	let connection;
	try {
		//let {email, nick} = req.body;
		//let nickName = req.body.nick.trim();
		let emailId = req.body.email.trim();
		let password = req.body.password.trim();
		let fcmToken = req.body.fcmToken;
		if ( !emailId || !password || !fcmToken ) {
			res.send({status: 400, detail: 'Invalid credentials'});
			return;
		}
		connection = await new DbConnection().getConnection();
		if ( connection ) {
			let dbRes = await connection.query(`SELECT
													id,
													first_name,
													last_name,
													email_add,
													nick_name,
													status_id,
													dateadded,
													plan_start_date,
													plan_end_date,
													telephone,
													mobile_number,
													contact_type,
													contact_group_cat,
													vat,
													company_name,
													contact_person_id,
													confirm_link,
													lang_id,
													parent_id,
													starting_word,
													street,
													nbr,
													postal_code,
													city,
													country,
													is_delete,
													user_type,
													last_login,
													rent_email,
													iban_number,
													stripe_customer_id,
													login_sync,
													indexation_letter,
													date_of_birth,
													location_birth,
													socsecnbr,
													civil_state, language, verified_app, fcm_token
												from
													contact
												where
													email_add = ? AND password_app = ?`, [emailId, md5(password)]);
			if ( _.has(dbRes, '[0].id') ) {
				if ( dbRes[0].verified_app === 0 ) {
					let token = await mailVerificationToken(emailId, password);
					const mailResp = await confirmMail(emailId, token);
					if ( mailResp.status === 200 ) {
						res.send({status: 201, detail: mailResp.detail});
					} else {
						res.send({status: mailResp.status, detail: mailResp.detail});
					}
				}
				if ( dbRes[0].status_id === 0 ) {
					res.send({status: 202, detail: 'Your account has been disabled'});
				}
				if ( dbRes[0].verified_app === 1 && dbRes[0].status_id === 1 ) {
					const updateFcm = await updateFcmToken(fcmToken, emailId);
					if ( _.has(updateFcm, 'affectedRows') ) {
						console.log(dbRes[0].fcm_token === fcmToken, 'fcm ============= Token');
						req.session.fcm = dbRes[0].fcm_token;
						req.session.save();
						console.log('Firebase token added');
					} else {
						console.log('Error updating firebase token');
					}
					//req.session.userId = dbRes[0].id;
					let hash = md5(new Date() + Math.random());
					var token = jwt.sign({sessionHash: hash}, config.jwtSecret);
					//const data = {id: dbRes[0].id, fcm: fcmToken};
					saveNewUserSession(hash, dbRes[0].id);
					res.send({
						status: 200,
						detail: 'logged in successfully',
						token: token,
						me: dbRes[0]
					});
				}
			} else {
				res.send({status: 401, detail: 'Provide registered email id & password'});
			}
		} else {
			res.send({status: 400, detail: failedToGetDatabaseConnection.description});
		}
	} catch ( e ) {
		res.send({status: 400, detail: 'something went wrong while trying to login'});
		console.log('Exception: ', e);
	} finally {
		if ( connection ) {
			connection.release();
		}
	}
}

async function userLogout ( req, res ) {
	if ( req.sessionId ) {
		deleteSession(req.sessionId);
		res.send({status: 200, detail: 'logged out successfully'});
	} else {
		res.send({status: 400, detail: 'Failed to logout, Authentication header not present'});
	}
}

async function saveNewUserSession ( hash, userId ) {
	let connection;
	try {
		connection = await new DbConnection().getConnection();
		if ( connection ) {
			let dbRes = await connection.query(`INSERT INTO user_sessions(hash, user_id, created_at) VALUES('${hash}', '${userId}', '${new Date().getTime()}')`);
			if ( _.has(dbRes, 'insertId') ) {
				console.log('Session Saved successfully');
			} else {
				throw 'no data in dbRes after add new session';
			}
		} else {
			throw 'failed to get db connection while saving new session';
		}
	} catch ( e ) {
		console.log('Exception: ', e);
	} finally {
		if ( connection ) {
			connection.release();
		}
	}
}

async function deleteSession ( sessionId ) {
	let connection;
	try {
		connection = await new DbConnection().getConnection();
		if ( connection ) {
			let dbRes = await connection.query(`UPDATE user_sessions
												SET status = ?
												WHERE
													hash = ?`, [deletedSessionStatus, sessionId]);
			if ( _.has(dbRes, 'affectedRows') ) {
				console.log('Session deleted successfully');
			} else {
				throw 'no rows affected after delete session';
			}
		} else {
			throw 'failed to get db connection while deleting session';
		}
	} catch ( e ) {
		console.log('Exception: ', e);
	} finally {
		if ( connection ) {
			connection.release();
		}
	}
}

module.exports = {
	authUserSession,
	userLogin,
	userRegister,
	userConfirm,
	userLogout,
	getFcmToken,
};
