const {swapMonthToDate, onGetNextAnniversary, onGetAnivarsAndRenewDateDiff} = require('./dateTime');
const groupingDataByDate = ( arrayData ) => {
	/*
	* @group : empty<{Object}>
	* @contractData : <[contracts]>
	* */
	let groupDataByDate = arrayData.reduce(( groups, contractsData ) => {
		const date = swapMonthToDate(contractsData.contract_from_date);
		if ( !groups[date] ) {
			groups[date] = [];
		}
		groups[date].push(contractsData);
		return groups;
	}, {});
	/*
	* @Grouping by date
	* */
	return Object.keys(groupDataByDate).map(( date ) => {
		//console.log(date, 'date');
		return {
			date: date,
			contracts: groupDataByDate[date],
		};
	});
};

const repeatedValueCount = ( arr ) => {
	const count = {};
	for ( let i = 0; i < arr.length; i++ ) {
		const val = arr[i];
		if ( val in count ) {
			count[val] = count[val] + 1;
		} else {
			count[val] = 1;
		}
	}
	
	let diff = [10, 25, 55, 65, 85, 87];
	for ( let key in count ) {
		if ( diff.includes(+key) ) {
			//console.log('Value ' + key + ' is repeated ' + count[key] + ' times');
			return {daysLeft: +key, contracts: count[key]};
		}
	}
};

const onGetDaysLeft = ( date ) => {
	const anniversaryDate = onGetNextAnniversary(swapMonthToDate(date));
	const annivarsaryDateTimeStamp = +new Date(anniversaryDate);
	const daysDiff = onGetAnivarsAndRenewDateDiff(annivarsaryDateTimeStamp);
	return +daysDiff;
};

const removeDuplicateItemsArray = ( array ) => {
	return array.filter(( item, index ) => {
		return array.indexOf(item) === index;
	});
};

module.exports = {
	groupingDataByDate, onGetDaysLeft, repeatedValueCount, removeDuplicateItemsArray
};
