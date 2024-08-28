const moment = require('moment');
const MOMENT_DATE_UI2 = 'MM/DD/YYYY';

function onCalculateTotalContractYears ( start, end ) {
	let dateRangeStartConverted = new Date(start);
	let dateRangeEndConverted = new Date(end);
	let startingMonth = dateRangeStartConverted.getMonth();
	let startingYear = dateRangeStartConverted.getFullYear();
	let endingMonth = dateRangeEndConverted.getMonth();
	let endingYear = dateRangeEndConverted.getFullYear();
	const calculateMonths = endingMonth + (12 * (endingYear - startingYear)) + 1;
	const finalMonths = calculateMonths - startingMonth;
	const getTotal = finalMonths / 12;
	return Math.round(getTotal);
}

function setDateToTimeStamp ( date ) {
	let splitDate = date.split('/');
	const formatDate = +splitDate[0] > 12 ? splitDate[1] + '/' + splitDate[0] + '/' + splitDate[2] : date;
	return +new Date(formatDate);
};

function removeOneMonthFromDate ( date ) {
	let dated = new Date(date);
	let sub = dated.setMonth(dated.getMonth() - 1);
	return new Date(sub);
	
	//console.log(newDate, 'month');
}

function validateFormatDate ( date ) {
	let splitDate = date.split('/');
	return +splitDate[0] > 12 ? splitDate[1] + '/' + splitDate[0] + '/' + splitDate[2] : date;
};

function oneYearPlusDate ( date ) {
	let splitDate = date.split('/');
	return splitDate[0] + '/' + splitDate[1] + '/' + (+splitDate[2] + 1);
};

function swapMonthToDate ( date ) {
	let splitDate = date.split('/');
	return splitDate[1] + '/' + splitDate[0] + '/' + splitDate[2];
}

function timeDifference ( date1, date2 ) {
	var difference = date1.getTime() - date2.getTime();
	return Math.floor(difference / 1000 / 60 / 60 / 24);
};

function getAnniversaryDate ( date ) {
	let splitDate = date.split('/');
	let dated = new Date();
	let currYear = Number(dated.getFullYear());
	//console.log(date, '===++++++++++====', splitDate[0] + '/' + splitDate[1] + '/' + currYear);
	return splitDate[0] + '/' + splitDate[1] + '/' + currYear;
}

function onGetNextAnniversary ( date ) {
	const fromDated = swapMonthToDate(date);
	const format = fromDated.split('/');
	const formatYear = Number(format[2]);
	const year = new Date().getFullYear();
	const nextAnniFormat = format[0] + '/' + format[1] + '/' + Number(formatYear + 1);
	const annivarsaryDateTimeStamp = +new Date(nextAnniFormat);
	const checkTimeDiff = timeDifference(new Date(), new Date(annivarsaryDateTimeStamp));
	
	const dated = new Date();
	const currentDate = dated.getMonth() + 1 + '/' + dated.getDate() + '/' + dated.getFullYear();
	
	if ( checkTimeDiff > 0 && checkTimeDiff <= 365 ) {
		return format[0] + '/' + format[1] + '/' + Number(formatYear + 1);
	}
	
	if ( checkTimeDiff >= 366 ) {
		const anniversaryDate = format[0] + '/' + format[1] + '/' + year;
		if ( +new Date(anniversaryDate) > +new Date(currentDate) ) {
			return format[0] + '/' + format[1] + '/' + Number(year - 1);
		} else {
			return anniversaryDate;
		}
	}
	return format[0] + '/' + format[1] + '/' + Number(formatYear);
}

const onFilterIndexedContracts = ( date ) => {
	const nextAnniversaryDate = onGetNextAnniversary(date);
	const checkTimeDiff = timeDifference(new Date(), new Date(nextAnniversaryDate));
	//console.log(checkTimeDiff, id, code, 'difference');
	return checkTimeDiff;
};

const onGetAnivarsAndRenewDateDiff = ( timeStamp ) => {
	const renewTillDAte = moment(timeStamp).add(90, 'days');
	let rentApplyTillDate = new Date(+new Date(renewTillDAte));
	//let contractDate = new Date(+timeStamp);
	let contractDate = new Date();
	
	let difference = timeDifference(rentApplyTillDate, contractDate);
	
	/*Notification will be triggered on each month of 25th date*/
	const each25thDate = moment(25, 'DD').format(MOMENT_DATE_UI2);
	if ( +new Date(moment().format(MOMENT_DATE_UI2)) === +new Date(each25thDate) ) {
		console.log('====25th of each month====');
		let difference = timeDifference(new Date(renewTillDAte), new Date(each25thDate));
		return +Math.abs(difference);
	}
	
	/*Notification will be triggered on each month of 3rd date*/
	const each3rdDate = moment(3, 'DD').format(MOMENT_DATE_UI2);
	if ( +new Date(moment().format(MOMENT_DATE_UI2)) === +new Date(each3rdDate) ) {
		console.log('====3rd of each month====');
		let difference = timeDifference(new Date(renewTillDAte), new Date(each25thDate));
		return +Math.abs(difference);
	}
	
	if ( +Math.abs(difference) === 10 ) {
		return +Math.abs(difference);
	}
	return 0;
};

module.exports = {
	onCalculateTotalContractYears,
	setDateToTimeStamp,
	removeOneMonthFromDate,
	validateFormatDate,
	swapMonthToDate,
	getAnniversaryDate,
	oneYearPlusDate,
	onGetNextAnniversary,
	onFilterIndexedContracts,
	onGetAnivarsAndRenewDateDiff
};
