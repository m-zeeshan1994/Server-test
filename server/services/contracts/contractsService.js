'use strict';
const _ = require('lodash');
const failedToGetDatabaseConnection = require('../../../config/res_codes');
const DbConn = require('../../../db/dbConnection');
const moment = require('moment');
const axios = require('axios');
const {sendPushNotify} = require('./../../services/pushNotifications');
const cron = require('node-cron');
const cliColor = require('cli-color');

const {notificationMsgByDiff, notificationTitleByDiff, colorByDiff} = require('./../../helpers/notification');
const {getFcmToken} = require('./../../services/auth');
const {groupingDataByDate, onGetDaysLeft, removeDuplicateItemsArray} = require('./../../helpers/data');
const logger = require('./../../logger/index');

//Utils
const {
	onGetNextAnniversary,
	onCalculateTotalContractYears,
	setDateToTimeStamp,
	removeOneMonthFromDate,
	validateFormatDate,
	swapMonthToDate,
	oneYearPlusDate,
	getAnniversaryDate,
	onFilterIndexedContracts
} = require('../../helpers/dateTime');

/*
const cronJob = require('./../cronjobs/index');
const scheduler = require('./../scheduler/schedule');
scheduler.initCrons(cronJob);
*/

const getIndexedMonth = async ( startDate ) => {
	let sortDate = startDate.split('/').reverse().join('-');
	let date = removeOneMonthFromDate(sortDate);
	return new Date(date).getMonth() + 1;
};

const getIndexedYear = async ( startDate ) => {
	let sortDate = startDate.split('/').reverse().join('-');
	let date = removeOneMonthFromDate(sortDate);
	return new Date(date).getFullYear();
};

/**
 * @param {  int } indexLogid - property_contract
 * @param { int } contractId - property_contract
 * @returns {Promise<Object>} - only index letter 0 || 1
 */
const removeIndexLog = async ( indexLogid, contractId ) => {
	let conn = new DbConn.DbConnection();
	let connection = await conn.getConnection();
	return await connection.query(`DELETE
								   FROM property_contract_indexlog
								   WHERE
									   id = ? AND
									   contract_id = ?`, [indexLogid, contractId]);
};

/**
 * @param { date } startDate - property_contract start date of contract
 * @returns {month, year} - based on start date of contract
 */
const getCurrentIndexedDateObj = async ( startDate ) => {
	let sortDate = startDate.split('/').reverse().join('-');
	let year = new Date(sortDate).getFullYear();
	let month = new Date(sortDate).getMonth() + 1;
	let data = {month, year};
	//console.log(startDate, data, '1 month pre date');
	return data;
};

const repeatedValueCount = ( userId, fcm, arr ) => {
	const count = {};
	for ( let i = 0; i < arr.length; i++ ) {
		const val = arr[i];
		if ( val in count ) {
			count[val] = count[val] + 1;
		} else {
			count[val] = 1;
		}
	}
	
	//let diff = [3, 10, 25, 33, 55, 63, 85];
	logger.info('=================== SENDING NOTIFICATIONS ===================');
	for ( let key in count ) {
		if ( arr.includes(+key) ) {
			//console.log('Value ' + key + ' is repeated ' + count[key] + ' times');
			console.log(cliColor.greenBright('=================== SENDING NOTIFICATION TO  ===================', userId));
			sendPushNotify(fcm, notificationTitleByDiff(+key, count[key]), notificationMsgByDiff(+key, count[key]), colorByDiff(+key), count[key], +key);
			//return {daysLeft: +key, contracts: count[key]};
		}
	}
};

/*cron.schedule('0 *!/1 * * *', async () => {*/
/*cron.schedule('*!/15 * * * * *', async () => {*/
cron.schedule('0 9 * * *', async () => {
	console.log(cliColor.greenBright('=================== NOTIFICATION CRON SERVICE STARTED ==================='));
	console.log(cliColor.cyanBright('=================== CHECK DAILY BASE AFTER EVERY 1 HOURS ===================', new Date()));
	const indexedContracts = await cronIndexedContractListByUser();
	if ( indexedContracts.length > 0 ) {
		console.log(cliColor.greenBright('=================== GETTING ALL CONTRACTS FROM DB ===================', indexedContracts.length));
		const filteredResult = indexedContracts?.filter(item => onFilterIndexedContracts(item?.contract_from_date) >= 0 && onFilterIndexedContracts(item?.contract_from_date) <= 90);
		const indexContracts = filteredResult?.filter(item => item?.indexed_at === null || (+moment(item?.indexed_at).format('YYYY') !== new Date().getFullYear()));
		const userIds = indexContracts.map(item => item.user_id);
		const uniqueUserId = removeDuplicateItemsArray(userIds);
		console.log(cliColor.cyanBright('=================== GETTING USERS ===================', uniqueUserId.length));
		let userData = [];
		for ( let uid of uniqueUserId ) {
			console.log(cliColor.cyanBright('=================== ITERATION FOR EACH USER STARTED ===================', uid));
			const fcmTokenData = await getFcmToken(uid);
			const token = fcmTokenData.find(item => item);
			if ( token.fcm_token ) {
				console.log(cliColor.cyanBright('=================== USER FCM TOKEN FOUND ===================', JSON.stringify(token), uid));
				const filterIndex = indexContracts.filter(item => item.user_id === uid);
				const groupData = groupingDataByDate(filterIndex);
				if ( groupData ) {
					console.log(cliColor.greenBright('=================== DATA GROUPED BY DATE ==================='));
					const list = groupData.map(( item ) => onGetDaysLeft(item?.date));
					const filteredList = list.filter(item => item !== 0);
					repeatedValueCount(uid, token.fcm_token, filteredList);
				} else {
					logger.error('=================== DATA GROUPED BY DATE ===================');
				}
				//userData.push({id: uid, fcmToken: token.fcm_token});
				//console.log({id: uid, fcmToken: token.fcm_token}, 'fcmTokenData');
			}
		}
	} else {
		logger.error('=================== NO CONTRACTS FROM DB ===================');
		console.log(cliColor.redBright('=================== NO CONTRACTS FROM DB ==================='));
	}
	//console.log(userData, 'user Data here');
});

async function cronIndexedContractListByUser () {
	let conn = new DbConn.DbConnection();
	let connection;
	try {
		connection = await conn.getConnection();
		if ( connection ) {
			return await connection.query(`SELECT
											   property_contract.*,
											   property_contract_indexlog.id AS pcidx_id,
											   property_contract_indexlog.contract_id AS pcidx_contract_id,
											   property_contract_indexlog.anniversary_month AS pcidx_anniversary_month,
											   property_contract_indexlog.anniversary_year AS pcidx_anniversary_year,
											   property_contract_indexlog.index_amount_old AS pcidx_index_amount_old,
											   property_contract_indexlog.index_amount_new AS pcidx_index_amount_new,
											   property_contract_indexlog.rent_value_new AS pcidx_rent_value_new,
											   property_contract_indexlog.is_rent_applied AS pcidx_is_rent_applied,
											   property_contract_indexlog.rent_index_baseline AS pcidx_rent_index_baseline,
											   property_contract_indexlog.created_at AS pcidx_created_at,

											   rent_index.index_year AS ri_index_year,
											   rent_index.index_month AS ri_index_month,
											   rent_index.index_amount AS ri_index_amount,
											   rent_index.rent_index_baseline AS ri_rent_index_baseline

										   FROM property_contract_indexlog
													JOIN property_contract
														 ON property_contract_indexlog.contract_id = property_contract.id
													INNER JOIN rent_index
															   ON property_contract_indexlog.anniversary_year + 1 = rent_index.index_year
																   AND property_contract_indexlog.anniversary_month = rent_index.index_month
																   AND property_contract_indexlog.rent_index_baseline = rent_index.rent_index_baseline
										   WHERE
											   status_id = ? AND
											   property_contract_indexlog.is_rent_applied = ?`, [3, 1]);
			
		} else {
			console.log('Error in connection');
			return [];
		}
	} catch ( e ) {
		console.log('Exception: ', e);
	} finally {
		if ( connection ) {
			connection.release();
		}
	}
}

/**
 * @param { int } contract - property_contract
 * @param {  int } user - property_contract
 * @returns {Promise<Object>} - only index letter 0 || 1
 */
const verifyContract = async ( contract, user ) => {
	let conn = new DbConn.DbConnection();
	let connection = await conn.getConnection();
	try {
		if ( connection ) {
			return await connection.query(`SELECT
											   index_letter
										   from property_contract
										   Where
											   id = ? AND
											   user_id = ?`, [contract, user]);
		} else {
			console.log(400, failedToGetDatabaseConnection.description);
			//res.send({status: 400, detail: failedToGetDatabaseConnection.description});
		}
	} catch ( e ) {
		//res.send({status: 400, detail: 'Something went wrong while verifying contract'});
		console.log('Exception in verify contract: ', e);
	} finally {
		connection && connection.release();
	}
	
};

/**
 * @param { int } contract - property_contract
 * @param {  int } user - property_contract
 * @returns {Promise<Object>} - record
 */
const getPropertyContractData = async ( contract, user ) => {
	let conn = new DbConn.DbConnection();
	let connection = await conn.getConnection();
	try {
		if ( connection ) {
			return await connection.query(`SELECT *
										   from property_contract
										   Where
											   id = ? AND
											   user_id = ?`, [contract, user]);
		} else {
			//res.send({status: 400, detail: failedToGetDatabaseConnection.description});
			console.log(400, failedToGetDatabaseConnection.description);
		}
	} catch ( e ) {
		//res.send({status: 400, detail: 'Something went wrong while getting contract data'});
		console.log('Exception in getting contract data: ', e);
	} finally {
		connection && connection.release();
	}
	
};

/**
 * @param {  int } user - property_contract
 * @returns {Promise<Object>} - record
 */
const getPropertyContracts = async ( user ) => {
	let conn = new DbConn.DbConnection();
	let connection = await conn.getConnection();
	try {
		if ( connection ) {
			return await connection.query(`SELECT *
										   from property_contract
										   Where
											   user_id = ?`, [user]);
		} else {
			console.log(400, failedToGetDatabaseConnection.description);
			//res.send({status: 400, detail: failedToGetDatabaseConnection.description});
		}
	} catch ( e ) {
		//res.send({status: 400, detail: 'Something went wrong while getting rent index'});
		console.log('Exception in getting property contracts: ', e);
	} finally {
		connection && connection.release();
	}
};

/**
 * @param { int } userId - property_contract
 * @param { int } contractId - property_contract
 * @param { int } status - property_contract
 * @returns {Promise<boolean>} - Success on updated
 */
const updatePropertyContractStatus = async ( contractId, userId, status ) => {
	//console.log(contractId, userId, status, 'here is error');
	let conn = new DbConn.DbConnection();
	let connection = await conn.getConnection();
	try {
		if ( connection ) {
			return await connection.query(`UPDATE property_contract
										   SET status_id = ?
										   WHERE
											   id = ? AND
											   user_id = ?`, [status, contractId, userId]);
		} else {
			console.log(400, failedToGetDatabaseConnection.description);
			//res.send({status: 400, detail: failedToGetDatabaseConnection.description});
		}
	} catch ( e ) {
		//res.send({status: 400, detail: 'Something went wrong while getting rent index'});
		console.log('Exception in update property contract status: ', e);
	} finally {
		connection && connection.release();
	}
};

/**
 * @param { date } startDate - property_contract start date of contract
 * @returns {month, year} - based on start date of contract
 */
const getIndexedDateObj = async ( startDate ) => {
	let sortDate = startDate.split('/').reverse().join('-');
	let date = removeOneMonthFromDate(sortDate);
	//console.log(date, 'indexed date obj');
	let year = new Date(date).getFullYear();
	let month = new Date(date).getMonth() + 1;
	let data = {month, year};
	//console.log(startDate, data, '1 month pre date');
	return data;
};

/**
 * @param { number } month - derived from property_contract start_date_of_contract
 * @param { number } year - derived from property_contract start_date_of_contract
 * @param { Boolean } baseline - derived from property_contract rent_index_baseline
 * @returns {Promise<Array>} - based on start date of contract from rent_index
 */
const getRentIndex = async ( month, year, baseline ) => {
	let conn = new DbConn.DbConnection();
	let connection = await conn.getConnection();
	try {
		if ( connection ) {
			return await connection.query(`SELECT *
										   FROM rent_index
										   WHERE
											   index_month = ? AND
											   index_year = ? AND
											   rent_index_baseline = ?`, [month, year, baseline]);
		} else {
			console.log(400, failedToGetDatabaseConnection.description);
			//res.send({status: 400, detail: failedToGetDatabaseConnection.description});
		}
	} catch ( e ) {
		//res.send({status: 400, detail: 'Something went wrong while getting rent index'});
		console.log('Exception in getting rent index: ', e);
	} finally {
		connection && connection.release();
	}
};

/**
 * @param { int } user - userId - derived from property_contract
 * @param { string } startDate - derived from property_contract start_date_of_contract
 * * @param { int } contractId - id - derived from property_contract
 * @returns {Promise<Array>} - based on start_date_of_contract for each contract
 */
const getIndexedData = async ( user, startDate, contractId ) => {
	let sortDate = startDate.split('/').reverse().join('-');
	let date = removeOneMonthFromDate(sortDate);
	let year = new Date(date).getFullYear();
	let month = new Date(date).getMonth() + 1;
	let data = {contractId, month, year};
	return data;
};

/**
 * Create indexlog based on property contract is indexed
 * @param {int} id - property_contract id
 * @param {number} month - derived from property_contract start date of contract
 * @param {number} year - derived from property_contract start date of contract
 * @param {boolean} indexedLetter - derived from property_contract if have start index amount
 * @param {number} startIndexAmount value - derived from property_contract is user put start index
 * @param {number} rentalAmount value - derived from property_contract === base rent put by user
 * @param {number} baseYearValue value - derived from property_contract === base year value put by user e.g 2013 = 1
 * @param {int} userId value - derived from session logged in user
 * @param {dateString} indexAt value - temporary pass indexed - 1 year date only from create contract
 * @returns {Promise<Array>} - Database query response on indexed contract inserted
 */
const setIndexLog = async ( id, month, year, indexedLetter, startIndexAmount, rentalAmount, baseYearValue, userId, indexAt ) => {
	let conn = new DbConn.DbConnection();
	let connection = await conn.getConnection();
	
	//console.log(month, year, baseYearValue, 'month, year, indexedLetter');
	const rentIndexRes = await getRentIndex(month, year, baseYearValue);
	//console.log(rentIndexRes, 'rentIndexRes');
	
	if ( !rentIndexRes.length > 0 ) {
		const insertedContractData = await getPropertyContractData(id, userId);
		if ( insertedContractData.length > 0 ) {
			let insertedContractId = insertedContractData.find(item => item);
			const updateContractDbRes = await updatePropertyContractStatus(insertedContractId.id, userId, 4);
			if ( _.has(updateContractDbRes, 'affectedRows') ) {
				console.log('inserted contract data set to in-active ==== No-rent index found by date');
				({resp: {code: 101, detail: 'No rent index found corresponding date...'}});
				return;
			}
		}
	}
	
	//console.log(rentIndexRes, 'rentIndexRes');
	let rentIndexData = rentIndexRes.find(item => item);
	//console.log(rentIndexData, 'rent Index data');
	
	const indexMonth = month;
	const indexYear = year;
	
	const indexAmountOld = +startIndexAmount;
	const indexAmountNew = +rentIndexData.index_amount;
	const baseRent = +rentalAmount;
	
	const rentValueNew = baseRent * indexAmountNew / indexAmountOld;
	
	//console.log(baseRent, indexAmountOld, indexAmountNew, 'checking values');
	//console.log(rentValueNew, 'rentValueNew calculated');
	
	//TODO:use this for real
	const indexedAt = indexAt ?? new Date();
	//console.log(indexedAt, 'check for indexedAt ========= ++++++ ===========');
	const createdAt = new Date();
	const updatedAt = new Date();
	
	console.log(id, indexYear, indexMonth, indexedLetter, indexAmountOld, indexAmountNew, rentValueNew, baseYearValue, createdAt, updatedAt, 'indexlog query here');
	console.log(indexedAt, indexAmountNew, rentValueNew, id, userId, 'property contract query');
	
	try {
		if ( connection ) {
			if ( +indexedLetter === 1 ) {
				let propertyContractResIndexed = await connection.query(`UPDATE property_contract
																		 SET indexed_at         = ?,
																			 current_index      = ?,
																			 rent_amount_period = ?
																		 WHERE
																			 id = ? AND
																			 user_id = ?`, [indexedAt, indexAmountNew, rentValueNew, id, userId]);
				console.log(propertyContractResIndexed, 'propertyContractResIndexed');
			}
			
			return await connection.query(`INSERT INTO property_contract_indexlog(contract_id, anniversary_year,
																				  anniversary_month, is_rent_applied,
																				  index_amount_old, index_amount_new,
																				  rent_value_new, rent_index_baseline, created_at, updated_at)
										   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[id, indexYear, indexMonth, indexedLetter, indexAmountOld, indexAmountNew, rentValueNew, baseYearValue, createdAt, updatedAt]);
		} else {
			console.log(400, failedToGetDatabaseConnection.description);
		}
	} catch ( e ) {
		//res.send({status: 400, detail: 'Something went wrong while setting index log'});
		console.log('Exception in set index: ', e);
	} finally {
		connection && connection.release();
	}
};

/**
 * Create UpdateIndexLog based on property contract is indexed
 * @param {int} id - property_contract_indexlog id
 * @param {int} contractId - property_contract id
 * @param {number} month - derived from property_contract start date of contract
 * @param {number} year - derived from property_contract start date of contract
 * @param {boolean} indexedLetter - derived from property_contract if have start index amount
 * @param {number} startIndexAmount value - derived from property_contract is user put start index
 * @param {number} rentalAmount value - derived from property_contract === base rent put by user
 * @param {number} baseYearValue value - derived from property_contract === base year value put by user e.g 2013 = 1
 * @param {int} userId value - derived from session logged in user
 * @returns {Promise<Array>} - Database query response on indexed contract inserted
 */
const updateIndexLog = async ( id, contractId, month, year, indexedLetter, startIndexAmount, rentalAmount, baseYearValue, userId ) => {
	let conn = new DbConn.DbConnection();
	let connection = await conn.getConnection();
	
	//console.log(month, year, baseYearValue, 'month, year, indexedLetter');
	const rentIndexRes = await getRentIndex(month, year, baseYearValue);
	
	if ( !rentIndexRes.length > 0 ) {
		const insertedContractData = await getPropertyContractData(contractId, userId);
		if ( insertedContractData.length > 0 ) {
			let insertedContractId = insertedContractData.find(item => item);
			const updateContractDbRes = await updatePropertyContractStatus(insertedContractId.id, userId, 4);
			if ( _.has(updateContractDbRes, 'affectedRows') ) {
				console.log('inserted contract data set to in-active ==== No-rent index found by date');
				({resp: {code: 101, detail: 'No rent index found corresponding date...'}});
				return;
			}
		}
	}
	//console.log(rentIndexRes, 'rentIndexRes');
	let rentIndexData = rentIndexRes.find(item => item);
	//console.log(rentIndexData, 'rent Index data');
	
	const indexMonth = month;
	const indexYear = year;
	
	const indexAmountOld = +startIndexAmount;
	const indexAmountNew = +rentIndexData.index_amount;
	const baseRent = +rentalAmount;
	
	const rentValueNew = baseRent * indexAmountNew / indexAmountOld;
	//console.log(baseRent, indexAmountOld, indexAmountNew, 'checking values');
	//console.log(rentValueNew, 'rentValueNew calculated');
	
	const updatedAt = new Date();
	
	console.log(id, contractId, indexYear, indexMonth, indexedLetter, indexAmountOld, indexAmountNew, rentValueNew, baseYearValue, updatedAt, 'update query here');
	
	try {
		if ( connection ) {
			return await connection.query(`UPDATE property_contract_indexlog
										   SET anniversary_year    = ?,
											   anniversary_month   = ?,
											   is_rent_applied     = ?,
											   index_amount_old    = ?,
											   index_amount_new    = ?,
											   rent_value_new      = ?,
											   rent_index_baseline = ?,
											   updated_at          = ?
										   where
											   id = ? AND
											   contract_id = ?`,
				[
					indexYear,
					indexMonth,
					indexedLetter,
					indexAmountOld,
					indexAmountNew,
					rentValueNew,
					baseYearValue,
					updatedAt,
					id,
					contractId
				]);
		} else {
			console.log(400, failedToGetDatabaseConnection.description);
		}
	} catch ( e ) {
		//res.send({status: 400, detail: 'Something went wrong while setting index log'});
		console.log('Exception in updating index: ', e);
	} finally {
		connection && connection.release();
	}
};

/**
 * @param { int } contract - property_contract
 * @param {  boolean } isRentApplied - property_contract
 * @returns {id}
 */
const verifyIndexLog = async ( contract, isRentApplied ) => {
	let conn = new DbConn.DbConnection();
	let connection = await conn.getConnection();
	try {
		if ( connection ) {
			return await connection.query(`SELECT
											   id
										   from property_contract_indexlog
										   Where
											   contract_id = ? AND
											   is_rent_applied = ?`, [contract, isRentApplied]);
		} else {
			console.log(400, failedToGetDatabaseConnection.description);
		}
	} catch ( e ) {
		//res.send({status: 400, detail: 'Something went wrong while verify index log'});
		console.log('Exception in verify index log: ', e);
	} finally {
		connection && connection.release();
	}
};

/**
 * @param { date } startDate - property_contract start date of contract
 * @returns {month, year} - based on start date of contract
 */
const getRentIndexFromDateObj = async ( startDate ) => {
	console.log(startDate, 'startDate');
	const validateDate = validateFormatDate(startDate);
	let date = removeOneMonthFromDate(validateDate);
	let year = new Date(date).getFullYear();
	let month = new Date(date).getMonth() + 1;
	let data = {month, year};
	return data;
};

/*Getting rent index on request from user*/
async function getNewRentIndexFromDate ( req, res ) {
	//console.log(req.body, 'contract selected date should be here');
	let conn = new DbConn.DbConnection();
	let connection;
	try {
		connection = await conn.getConnection();
		if ( connection ) {
			let {rentIndexBaseLine, startDateOfContract} = req.body;
			const reqData = !!rentIndexBaseLine && !!startDateOfContract;
			if ( !reqData ) {
				res.send({status: 400, detail: 'Incomplete data for rent index'});
			}
			const indexDate = await getRentIndexFromDateObj(startDateOfContract);
			if ( indexDate !== null ) {
				const rentIndexRes = await getRentIndex(indexDate.month, indexDate.year, rentIndexBaseLine);
				if ( rentIndexRes.length > 0 ) {
					const rentIndexObj = rentIndexRes.find(item => item);
					res.send({status: 200, detail: 'Rent index data for of provided date', data: rentIndexObj});
				} else {
					res.send({status: 200, detail: 'Rent index data for of provided date', data: {}});
				}
			}
		} else {
			res.send({status: 400, detail: failedToGetDatabaseConnection.description});
		}
	} catch ( e ) {
		res.send({status: 400, detail: 'Something went wrong while getting rent index'});
		console.log('Exception: ', e);
	} finally {
		connection && connection.release();
	}
}

async function getContractList ( req, res ) {
	let conn = new DbConn.DbConnection();
	let connection;
	try {
		let offset = Number(req.query.offset) || 0;
		//console.log('i m hitting here');
		connection = await conn.getConnection();
		if ( connection ) {
			/*let dbRes = await connection.query(`SELECT
													rib.id,
													property_contract.*,
													rent_index.index_year,
													rent_index.index_month,
													rent_index.index_amount,
													rent_index.rent_index_baseline
												From rent_index_baseline as rib
														 INNER JOIN property_contract
																	ON rib.id = property_contract.rent_index_baseline
														 INNER JOIN rent_index
																	ON rib.id = rent_index.rent_index_baseline
												WHERE
													user_id = ?
												GROUP BY property_contract.id DESC`, ['1213']);*/
			
			let dbRes = await connection.query(`SELECT
													rib.id as rib_id,
													property_contract.*,
													rent_index.index_year,
													rent_index.index_month,
													rent_index.index_amount,
													rent_index.rent_index_baseline
												From rent_index_baseline as rib
														 INNER JOIN property_contract
																	ON rib.id = property_contract.rent_index_baseline
														 INNER JOIN rent_index
																	ON rib.id = rent_index.rent_index_baseline
																		AND rent_index.index_year = '2021'
																		AND rent_index.index_month = '12'
												WHERE
													user_id = ?
												GROUP BY property_contract.id`, ['1213']);
			
			if ( dbRes.length > 0 ) {
				res.send({status: 200, detail: `List of 10 products with offset ${offset}`, data: dbRes});
			} else {
				res.send({status: 400, detail: 'Oops no record found..'});
			}
		} else {
			res.send({status: 400, detail: failedToGetDatabaseConnection.description});
		}
	} catch ( e ) {
		res.send({status: 400, detail: 'something went wrong while getting contracts list'});
		console.log('Exception: ', e);
	} finally {
		if ( connection ) {
			connection.release();
		}
	}
}

async function getContractListByUser ( req, res ) {
	//console.log(req.params, 'params');
	let conn = new DbConn.DbConnection();
	let connection;
	
	try {
		let offset = Number(req.query.offset) || 0;
		connection = await conn.getConnection();
		if ( connection ) {
			
			let contractsDbRes = await getPropertyContracts(req.userId);
			if ( contractsDbRes.length > 0 ) {
				let rentIndex = [];
				for ( let dbResData of contractsDbRes ) {
					const getIdxData = await getIndexedData(req.userId, dbResData.start_date_of_contract, dbResData.id);
					let contractDataRes = await connection.query(`SELECT
																	  id AS ridx_id,
																	  index_month AS ridx_month,
																	  index_year AS ridx_year,
																	  index_amount AS ridx_amount,
																	  rent_index_baseline AS ridx_rent_index_base_line
																  FROM rent_index
																  WHERE
																	  rent_index.index_month = ? AND
																	  rent_index.index_year = ? AND
																	  rent_index.rent_index_baseline = ?`,
						[getIdxData.month, getIdxData.year, dbResData.rent_index_baseline]);
					if ( contractDataRes.length > 0 ) {
						rentIndex.push(contractDataRes);
					}
				}
				
				const rntIdxData = rentIndex.flat();
				let finalRes = contractsDbRes.map(( item, index ) => {
					/*rntIdxData[index].ridx_id = rntIdxData[index].id;*/
					return {...contractsDbRes[index], ...rntIdxData[index]};
				});
				
				res.send({status: 200, detail: `Contracts list by User with offset ${offset}`, data: finalRes});
				//console.log(finalRes, 'may be correct');
				
				/*let contractDataRes = await connection.query(`SELECT
																  property_contract.*,
																  property_contract_indexlog.id AS pcidx_id,
																  property_contract_indexlog.anniversary_month AS pcidx_anniversary_month,
																  property_contract_indexlog.anniversary_year AS pcidx_anniversary_year,
																  property_contract_indexlog.index_amount_old AS pcidx_index_amount_old,
																  property_contract_indexlog.index_amount_new AS pcidx_index_amount_new,
																  property_contract_indexlog.rent_value_new AS pcidx_rent_value_new,
																  property_contract_indexlog.is_rent_applied AS pcidx_is_rent_applied,
																  property_contract_indexlog.rent_index_baseline AS pcidx_rent_index_baseline,
																  property_contract_indexlog.created_at AS pcidx_created_at
															  FROM property_contract
																	   INNER JOIN property_contract_indexlog
																				  ON property_contract.id = property_contract_indexlog.contract_id
															  WHERE
																  user_id = ?`, [req.userId]);
				if ( contractDataRes.length > 0 ) {
					console.log(contractDataRes, 'contractDataRes');
					res.send({status: 200, detail: `Contracts list by User with offset ${offset}`, data: contractDataRes});
				} else {
					console.log('oops no record found');
					res.send({status: 400, detail: 'Oops no record found..'});
				}*/
				
			} else {
				res.send({status: 400, detail: 'Oops no record found of current user...'});
			}
		} else {
			res.send({status: 400, detail: failedToGetDatabaseConnection.description});
		}
	} catch ( e ) {
		res.send({status: 400, detail: 'something went wrong while getting contracts list'});
		console.log('Exception: ', e);
	} finally {
		if ( connection ) {
			connection.release();
		}
	}
}

async function getIndexedContractListByUser ( req, res ) {
	//console.log(req, 'params');
	//console.log(req.session.fcm, 'req.session.fcm outttt');
	
	let conn = new DbConn.DbConnection();
	let connection;
	try {
		let offset = Number(req.query.offset) || 0;
		const isRentApplied = 1;
		connection = await conn.getConnection();
		if ( connection ) {
			/*+1 in annivsary year that will be prior to contract from date then for next year index that will be plus*/
			let dbRes = await connection.query(`SELECT
													property_contract.*,
													property_contract_indexlog.id AS pcidx_id,
													property_contract_indexlog.contract_id AS pcidx_contract_id,
													property_contract_indexlog.anniversary_month AS pcidx_anniversary_month,
													property_contract_indexlog.anniversary_year AS pcidx_anniversary_year,
													property_contract_indexlog.index_amount_old AS pcidx_index_amount_old,
													property_contract_indexlog.index_amount_new AS pcidx_index_amount_new,
													property_contract_indexlog.rent_value_new AS pcidx_rent_value_new,
													property_contract_indexlog.is_rent_applied AS pcidx_is_rent_applied,
													property_contract_indexlog.rent_index_baseline AS pcidx_rent_index_baseline,
													property_contract_indexlog.created_at AS pcidx_created_at,

													rent_index.index_year AS ri_index_year,
													rent_index.index_month AS ri_index_month,
													rent_index.index_amount AS ri_index_amount,
													rent_index.rent_index_baseline AS ri_rent_index_baseline

												FROM property_contract_indexlog
														 JOIN property_contract
															  ON property_contract_indexlog.contract_id = property_contract.id
														 INNER JOIN rent_index
																	ON property_contract_indexlog.anniversary_year + 1 = rent_index.index_year
																		AND property_contract_indexlog.anniversary_month = rent_index.index_month
																		AND property_contract_indexlog.rent_index_baseline = rent_index.rent_index_baseline
												WHERE
													user_id = ? AND
													property_contract_indexlog.is_rent_applied = ?`, [req.userId, 1]);
			
			if ( dbRes.length > 0 ) {
				res.send({status: 200, detail: `Indexed & Active contract list`, data: dbRes});
			} else {
				res.send({status: 400, detail: 'Oops no record found..'});
			}
		} else {
			res.send({status: 400, detail: failedToGetDatabaseConnection.description});
		}
	} catch ( e ) {
		res.send({status: 400, detail: 'something went wrong while getting contracts list'});
		console.log('Exception: ', e);
	} finally {
		if ( connection ) {
			connection.release();
		}
	}
}

async function getActiveContractListByUser ( req, res ) {
	//console.log(req.params, 'params');
	let conn = new DbConn.DbConnection();
	let connection;
	try {
		let offset = Number(req.query.offset) || 0;
		connection = await conn.getConnection();
		if ( connection ) {
			let dbRes = await connection.query(`SELECT *
												From property_contract
												Where
													user_id = ? AND
													status_id = ?`, [req.params.id, req.params.status]);
			if ( dbRes.length > 0 ) {
				res.send({status: 200, detail: `Active contract list with offset ${offset}`, data: dbRes});
			} else {
				res.send({status: 400, detail: 'Oops no record found..'});
			}
		} else {
			res.send({status: 400, detail: failedToGetDatabaseConnection.description});
		}
	} catch ( e ) {
		res.send({status: 400, detail: 'something went wrong while getting contracts list'});
		console.log('Exception: ', e);
	} finally {
		if ( connection ) {
			connection.release();
		}
	}
}

async function createContract ( req, res ) {
	console.log(req.body, 'req body check here ');
	let connection;
	try {
		let {code, contractDate, rentalAmount, baseYearValue, isIndex, startIndexAmount} = req.body;
		const reqData = !!code && !!contractDate && !!rentalAmount && !!baseYearValue && !!isIndex && !!startIndexAmount;
		
		const validatedContractDate = swapMonthToDate(contractDate);
		
		const createDateTill = new Date(validatedContractDate);
		
		const contractDateTill = createDateTill.getDate() + '/' + (createDateTill.getMonth() + 1) + '/' + Number(createDateTill.getFullYear() + 1);
		
		const addedDate = new Date(validatedContractDate);
		const endedDate = contractDateTill;
		
		const endContFormat = (createDateTill.getMonth() + 1) + '/' + createDateTill.getDate() + '/' + Number(createDateTill.getFullYear() + 1);
		const startContract = setDateToTimeStamp(validatedContractDate);
		const endContract = setDateToTimeStamp(endContFormat);
		
		const newContrYear = +new Date(validatedContractDate).getFullYear() + 1;
		const conTotalYear = onCalculateTotalContractYears(startContract, endContract);
		
		if ( !reqData ) {
			res.send({status: 401, detail: 'Incomplete contract data must fill the form properly'});
		}
		let conn = new DbConn.DbConnection();
		connection = await conn.getConnection();
		if ( connection ) {
			let dbRes = await connection.query(`INSERT INTO property_contract (code, contract_code, contract_date, contract_from_date,
																			   start_date_of_contract, payment_period, settlement_period, rent_amount_period,
																			   cost_advance_period, distribution_cost,
																			   user_id, status_id, added_date, deposit_amount, payment_code,
																			   start_contract, is_rent_applied,
																			   con_total_year, current_index, new_contr_year, baserent, startindex,
																			   iban_number, bic_code, depositpaid, coda_bank_id,
																			   index_letter, cost_fix_amount, rent_index_baseline)
												VALUES (?, ?, ?, ?, ?, 0, 0, ?, 0.00, '', ?, 3, ?, 0.00,
														'000/0000/00000', ?, ?, ?, ?, ?, ?, ?, '', '', 0, 0, ?, 0.00, ?)`,
				[code, code, contractDate, contractDate, contractDate, rentalAmount, req.userId, addedDate, startContract, +isIndex,
					conTotalYear, startIndexAmount, newContrYear, rentalAmount, startIndexAmount, +isIndex, baseYearValue]);
			
			if ( _.has(dbRes, 'affectedRows') ) {
				//console.log('Contract added in property contract');
				//res.send({status: 200, detail: `Contract added successfully`});
				
				if ( dbRes.insertId ) {
					let verify = await verifyContract(dbRes.insertId, req.userId);
					let verifyCont = verify.find(item => item);
					
					let propertyContractRes = await getPropertyContractData(dbRes.insertId, req.userId);
					let propertyContractData = propertyContractRes.find(item => item);
					
					//console.log(propertyContractData.start_date_of_contract, 'startDate is now get as');
					
					const indexDate = await getIndexedDateObj(propertyContractData.start_date_of_contract);
					
					//console.log(indexDate, 'index month and year');
					
					if ( verifyCont.index_letter === 1 ) {
						//todo:indexedAt
						const indexedAt = new Date(moment().subtract('1', 'year'));
						//const indexedAt = new Date();
						const indexLogRes = await setIndexLog(dbRes.insertId, indexDate.month, indexDate.year, verifyCont.index_letter, startIndexAmount, rentalAmount, baseYearValue, req.userId, indexedAt);
						if ( _.has(indexLogRes, 'affectedRows') ) {
							res.send({status: 201, detail: `Contract registered successfully with index`});
							console.log('Contract registered successfully with indexation index log table');
						} else {
							res.send({status: 202, detail: `Oops, check input for registering contract`});
							console.log('Oops, check input for registering contract');
						}
					} else {
						/*Contract response for with out indexation applied*/
						res.send({status: 200, detail: `Contract added successfully without index`});
					}
				}
			} else {
				res.send({status: 400, detail: 'Oops, Unable to register contract'});
			}
		} else {
			res.send({status: 400, detail: failedToGetDatabaseConnection.description});
		}
	} catch ( e ) {
		res.send({status: 400, detail: 'Something went wrong while registering contract'});
		console.log('Exception: ', e);
	} finally {
		connection && connection.release();
	}
}

async function updateContract ( req, res ) {
	console.log(req.body, 'req.body updateContract data is here');
	let connection;
	const verifyUser = async ( contract, user ) => {
		return await connection.query(`SELECT *
									   from property_contract
									   Where
										   id = ? AND
										   user_id = ?`, [contract, user]);
	};
	
	try {
		let {
			contractId,
			code,
			contractDate,
			contractDateOf,
			contractDateTill,
			startContract,
			endContract,
			rentalAmount,
			baseYearValue,
			isIndex,
			startIndexAmount
		} = req.body;
		const reqData = !!contractId && !!code && !!contractDate && !!contractDateOf && !!contractDateTill && !!startContract && !!endContract && !!rentalAmount && !!baseYearValue && !!isIndex && !!startIndexAmount;
		const newContrYear = +new Date(startContract).getFullYear() + 1;
		const endedDate = moment(endContract).format('MM/DD/YYYY');
		const addedDate = new Date(startContract);
		const conTotalYear = onCalculateTotalContractYears(startContract, endContract);
		
		if ( !reqData ) {
			res.send({status: 401, detail: 'Incomplete contract data must fill the form properly'});
			return;
		}
		
		let conn = new DbConn.DbConnection();
		connection = await conn.getConnection();
		if ( connection ) {
			let dbRes = await getPropertyContractData(contractId, req.userId);
			if ( dbRes.length > 0 ) {
				let updateRes = await connection.query(`UPDATE property_contract
														SET contract_code          = ?,
															contract_date          = ?,
															contract_from_date     = ?,
															contract_to_date       = ?,
															start_date_of_contract = ?,
															rent_amount_period     = ?,
															end_date               = ?,
															added_date             = ?,
															end_contract           = ?,
															start_contract         = ?,
															is_rent_applied        =?,
															con_total_year         = ?,
															current_index          = ?,
															new_contr_year         = ?,
															baserent               = ?,
															startindex             = ?,
															index_letter           = ?,
															rent_index_baseline    = ?
														WHERE
															id = ? AND
															user_id = ?`,
					[
						code,
						contractDate,
						contractDateOf,
						contractDateTill,
						contractDateOf,
						rentalAmount,
						endedDate,
						addedDate,
						endContract,
						startContract,
						isIndex,
						conTotalYear,
						startIndexAmount,
						newContrYear,
						rentalAmount,
						startIndexAmount,
						isIndex,
						baseYearValue,
						contractId,
						req.userId
					]);
				if ( _.has(updateRes, 'affectedRows') ) {
					const indexDate = await getIndexedDateObj(contractDateOf);
					const checkIndexLog = await verifyIndexLog(contractId, 1);
					if ( checkIndexLog.length > 0 ) {
						console.log(checkIndexLog, '====== checkIndexLog ============');
						const indexLog = checkIndexLog.find(item => item.id);
						const indexLogRes = await updateIndexLog(indexLog.id, contractId, indexDate.month, indexDate.year, isIndex, startIndexAmount, rentalAmount, baseYearValue, req.userId);
						if ( _.has(indexLogRes, 'affectedRows') ) {
							res.send({status: 200, detail: `Contract updated successfully`});
							console.log('Contract registered successfully with indexation index log table');
						} else {
							res.send({status: 202, detail: `Oops, check input for updating contract`});
							console.log('Oops, check input for updating contract');
						}
						return;
					}
					console.log(checkIndexLog.length, '============== check Index Log ==================');
					//todo:indexedAt
					const indexedAt = new Date(moment().subtract('1', 'year'));
					//const indexedAt = new Date();
					const indexLogRes = await setIndexLog(contractId, indexDate.month, indexDate.year, isIndex, startIndexAmount, rentalAmount, baseYearValue, req.userId, indexedAt);
					if ( _.has(indexLogRes, 'affectedRows') ) {
						res.send({status: 200, detail: `Contract updated successfully`});
						console.log('Contract registered successfully with indexation index log table');
					} else {
						res.send({status: 202, detail: `Oops, check input for updating contract`});
						console.log('Oops, check input for updating contract');
					}
				} else {
					res.send({status: 400, detail: 'Oops, Unable to update contract'});
				}
			} else {
				res.send({status: 400, detail: 'Oops no record found..'});
			}
		} else {
			res.send({status: 400, detail: failedToGetDatabaseConnection.description});
		}
	} catch ( e ) {
		res.send({status: 400, detail: 'Something went wrong while updating contract'});
		console.log('Exception: ', e);
	} finally {
		connection && connection.release();
	}
}

async function endContract ( req, res ) {
	console.log(req.body, 'end contract req');
	let connection;
	try {
		let reqContractId = req.body.contractId;
		let reqUserId = req.body.userId;
		const reqData = !!reqContractId && !!reqUserId;
		if ( !reqData ) {
			res.send({status: 400, detail: 'Not found request data'});
		}
		let conn = new DbConn.DbConnection();
		connection = await conn.getConnection();
		if ( connection ) {
			const contractData = await getPropertyContractData(reqContractId, req.userId);
			if ( contractData.length > 0 ) {
				console.log(contractData, 'contract data');
				const updateContractDbRes = await updatePropertyContractStatus(reqContractId, req.userId, 4);
				if ( _.has(updateContractDbRes, 'affectedRows') ) {
					res.send({status: 200, detail: 'Contract has been ended'});
				} else {
					throw 'something went wrong while ending contract';
				}
			} else {
				res.send({status: 400, detail: 'Oops no record found..'});
			}
		} else {
			res.send({status: 400, detail: failedToGetDatabaseConnection.description});
		}
		/*if ( connection ) {
			let dbRes = await connection.query(`SELECT *
												From property_contract
												WHERE
													id = ? AND
													user_id = ? `, [reqContractId, reqUserId]);
			if ( dbRes.length > 0 ) {
				let updateQryRes = await connection.query(`UPDATE property_contract
														   SET status_id = ?
														   WHERE
															   user_id = ? AND
															   id = ? `, ['4', reqUserId, reqContractId]);
				if ( _.has(updateQryRes, 'affectedRows') ) {
					res.send({status: 200, detail: 'Contract has been ended'});
				} else {
					throw 'something went wrong while ending contract';
				}
			} else {
				res.send({status: 400, detail: 'Oops no record found..'});
			}
		} else {
			res.send({status: 400, detail: failedToGetDatabaseConnection.description});
		}*/
	} catch ( e ) {
		console.log(e, 'error message in register contract');
	} finally {
		connection && connection.release();
	}
}

async function indexContract ( req, res ) {
	//console.log(req.body, 'req.body');
	let connection;
	try {
		let reqContractId = req.body.contractId;
		let reqUserId = req.body.userId;
		let reqIndex = req.body.index;
		const reqData = !!reqContractId && !!reqUserId && !!reqIndex;
		if ( !reqData ) {
			res.send({status: 400, detail: 'Not found request data'});
		}
		let conn = new DbConn.DbConnection();
		connection = await conn.getConnection();
		if ( connection ) {
			let propertyContractRes = await getPropertyContractData(reqContractId, req.userId);
			if ( propertyContractRes.length > 0 ) {
				const propertyContractData = propertyContractRes.find(item => item);
				if ( !propertyContractData.startindex ) {
					res.send({status: 401, detail: `please index your contract first`, index: +reqIndex});
					console.log('please index you contract first');
					return;
				}
				/*If already indexed contract this scenario works on all true*/
				if ( +reqIndex === 1 ) {
					console.log('==== in 1 index ====');
					console.log('===== We are indexing already indexed contract =====');
					let indexLogRes = await connection.query(`SELECT *
															  From property_contract_indexlog
															  Where
																  contract_id = ? AND
																  is_rent_applied = ?`, [reqContractId, propertyContractData.is_rent_applied]);
					if ( indexLogRes.length > 0 ) {
						const indexLogExist = indexLogRes.find(item => item);
						
						/*const anniversMonthExist = indexLogExist.anniversary_month;
						const anniversYearExist = indexLogExist.anniversary_year;*/
						
						const currentIndexExist = indexLogExist.index_amount_old;
						const currentRentExist = indexLogExist.rent_value_new;
						
						let propertyContractResUpdate = await connection.query(`UPDATE property_contract
																				SET current_index      = ?,
																					rent_amount_period = ?
																				WHERE
																					id = ? AND
																					user_id = ?`, [currentIndexExist, currentRentExist, reqContractId, req.userId]);
						
						console.log('=========== property Contract Res Update current index and rent amount period =============');
						
						if ( _.has(propertyContractResUpdate, 'affectedRows') ) {
							let indexLogResUpdate = await connection.query(`UPDATE property_contract_indexlog
																			SET is_rent_applied = ?
																			WHERE
																				contract_id = ? AND
																				is_rent_applied = ?`, [0, reqContractId, propertyContractData.is_rent_applied]);
							
							console.log('=========== property Contract index log Res Update rent applied to 0 hard coded =============');
							
							if ( _.has(indexLogResUpdate, 'affectedRows') ) {
								
								console.log(propertyContractData.start_date_of_contract, 'propertyContractData.start_date_of_contract with index');
								/*i guess here i need next year date except start date of contract*/
								const anniversaryIndexDate = await getAnniversaryDate(propertyContractData.start_date_of_contract);
								console.log(anniversaryIndexDate, 'anniversaryIndexDate ====== ???');
								const indexDate = await getIndexedDateObj(anniversaryIndexDate);
								console.log(indexDate, 'indexDate with index');
								const indexLogRes = await setIndexLog(reqContractId, indexDate.month, indexDate.year, +reqIndex, propertyContractData.startindex, propertyContractData.baserent, propertyContractData.rent_index_baseline, req.userId);
								console.log('=========== index log Res inserted new record for existing contract =============');
								
								if ( _.has(indexLogRes, 'affectedRows') ) {
									res.send({status: 200, detail: `Contract new indexation applied`});
									console.log('Contract new indexation successfully updated indexlog table');
								} else {
									res.send({status: 400, detail: `Oops, unable apply contract new indexation`});
									console.log('Oops, unable to apply new indexation');
								}
							}
						}
					} else {
						res.send({status: 400, detail: 'Oops no record found in property contract...'});
					}
				}
				/*If set new contract to index this scenario works*/
				if ( +reqIndex === 0 ) {
					console.log('==== in 0 index ====');
					console.log('===== Indexing not applied contract ======');
					console.log(Number(reqIndex), 'Number(reqIndex)');
					
					const anniversaryIndexDate = await getAnniversaryDate(propertyContractData.start_date_of_contract);
					console.log(propertyContractData.start_date_of_contract, 'propertyContractData.start_date_of_contract no index');
					const indexDate = await getIndexedDateObj(anniversaryIndexDate);
					console.log(indexDate, 'indexDate no index');
					
					const checkIndex = await verifyContract(reqContractId, req.userId);
					if ( checkIndex.length > 0 ) {
						const verifyIndex = checkIndex.find(item => item.index_letter === 1);
						if ( verifyIndex ) {
							console.log('======INDEXATION NOT APPLIED========');
							const indexLogRes = await setIndexLog(reqContractId, indexDate.month, indexDate.year, Number(reqIndex), propertyContractData.startindex, propertyContractData.baserent, propertyContractData.rent_index_baseline, req.userId);
							if ( _.has(indexLogRes, 'affectedRows') ) {
								res.send({status: 201, detail: `Indexation not applied yet`});
								console.log('Indexation record nothing updated index table');
							} else {
								res.send({status: 400, detail: `Oops, unable to update contract with indexation`});
								console.log('Oops, unable to update contract with indexation');
							}
							
						}
					} else {
						res.send({status: 400, detail: 'Oops no updated record found property contract..'});
					}
				}
			} else {
				res.send({status: 400, detail: 'Oops no record found in property contract..'});
			}
		} else {
			res.send({status: 400, detail: failedToGetDatabaseConnection.description});
		}
	} catch ( e ) {
		console.log(e, 'error message in indexing contract');
	} finally {
		connection && connection.release();
	}
}

module.exports = {
	//getContractList,
	getContractListByUser,
	getActiveContractListByUser,
	getIndexedContractListByUser,
	createContract,
	updateContract,
	endContract,
	indexContract,
	getNewRentIndexFromDate,
};
