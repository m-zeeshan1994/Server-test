let dbCon = require('../../config/dbConfig');
let Contract = ( contract ) => {
	//this.id = contract.id
	this.user_id = contract.user_id;
	this.code = contract.code;
	this.contract_code = contract.contract_code;
	this.contract_date = contract.contract_date;
	this.contract_from_date = contract.contract_from_date;
	this.contract_to_date = contract.contract_to_date;
	this.start_date_of_contract = contract.start_date_of_contract;
	this.payment_period = contract.payment_period;
	this.settlement_period = contract.settlement_period;
	this.rent_amount_period = contract.rent_amount_period;
	this.cost_advance_period = contract.cost_advance_period;
	this.distribution_cost = contract.distribution_cost;
	this.status_id = contract.status_id;
	this.end_date = contract.end_date;
	this.added_date = contract.added_date;
	this.deposit_amount = contract.deposit_amount;
	this.payment_code = contract.payment_code;
	this.end_contract = contract.end_contract;
	this.start_contract = contract.start_contract;
	this.is_rent_applied = contract.is_rent_applied;
	this.con_total_year = contract.con_total_year;
	this.current_index = contract.current_index;
	this.new_contr_year = contract.new_contr_year;
	this.baserent = contract.baserent;
	this.startindex = contract.startindex;
	this.iban_number = contract.iban_number;
	this.bic_code = contract.bic_code;
	this.depositPaid = contract.depositPaid;
	this.coda_bank_id = contract.coda_bank_id;
	this.index_letter = contract.index_letter;
	this.cost_fix_amount = contract.cost_fix_amount;
	this.rent_index_baseline = contract.rent_index_baseline;
};

/*Get all contracts data from db*/
/*Contract.getContractList = ( result ) => {
	dbCon.query(`SELECT *
				 From property_contract
				 Where
					 user_id = ?`, ['99'], ( err, res ) => {
		if ( err ) {
			console.log('Error while fetching contracts data');
			result(null, err);
		} else {
			console.log('Fetched result successfully contracts data');
			result(null, res);
		}
	});
};

Contract.getContractListByUser = ( id, result ) => {
	dbCon.query(`SELECT *
				 FROM property_contract
				 where
					 user_id = ?`, id, ( err, res ) => {
		if ( !err ) {
			console.log('data get by user id');
			result(res, null);
			return;
		}
		if ( err ) {
			console.log('Something wrong here');
			result(err, null);
		}
	});
};

Contract.getActiveContractListByUser = ( userId, statusId, result ) => {
	dbCon.query(`SELECT *
				 FROM property_contract
				 where
					 user_id = ? AND
					 status_id = ?`, [userId, statusId], ( res, err ) => {
		if ( !err ) {
			console.log('Data get by user id and status code');
			result(null, res);
			return;
		}
		if ( err ) {
			console.log('Something wrong here active');
			result(null, err);
		}
	});
};*/
module.exports = Contract;
