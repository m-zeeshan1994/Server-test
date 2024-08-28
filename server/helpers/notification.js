/**
 * @param { int } diffVal - contract days left fot indexation
 * @param { int } count - Total contracts on this left days
 */

const NOTIFICATION_MSG_TITLE_1 = 'Contracten verlopen';
const NOTIFICATION_MSG_DESC_1 = 'Huurcontracten zijn op verjaardag bekijk de verhoging en de nieuwe huurbedragen';
const NOTIFICATION_MSG_TITLE_2 = 'Contracten in wacht';
const NOTIFICATION_MSG_DESC_2 = 'Contracten wachten op indexering, bekijk de nieuwe huurprijzen en bevestig';
const NOTIFICATION_MSG_TITLE_3 = 'Laatste kans';
const NOTIFICATION_MSG_DESC_3_1 = 'De mogelijkheid tot indexering vervalt voor';
const NOTIFICATION_MSG_DESC_3_2 = 'Bekijk de nieuwe huurprijzen en bevestig';

const notificationTitleByDiff = ( diffVal, count ) => {
	if ( diffVal >= 0 && diffVal <= 30 ) {
		return NOTIFICATION_MSG_TITLE_3;
	} else if ( diffVal >= 31 && diffVal <= 60 ) {
		return count + ' ' + NOTIFICATION_MSG_TITLE_2;
	} else if ( diffVal >= 61 && diffVal <= 90 ) {
		return count + ' ' + NOTIFICATION_MSG_TITLE_1;
	} else {
		return count + ' ' + NOTIFICATION_MSG_TITLE_1;
	}
};

/**
 * @param { int } diffVal - contract days left fot indexation
 * @param { int } count - Total contracts on this left days
 */
const notificationMsgByDiff = ( diffVal, count ) => {
	if ( diffVal >= 0 && diffVal <= 30 ) {
		return NOTIFICATION_MSG_DESC_3_1 + ' ' + count + ' ' + NOTIFICATION_MSG_DESC_3_2;
	} else if ( diffVal >= 31 && diffVal <= 60 ) {
		return NOTIFICATION_MSG_DESC_2;
	} else if ( diffVal >= 61 && diffVal <= 90 ) {
		return NOTIFICATION_MSG_DESC_1;
	} else {
		return NOTIFICATION_MSG_DESC_1;
	}
};

const colorByDiff = ( diffVal ) => {
	if ( diffVal >= 0 && diffVal <= 30 ) {
		return 'red';
	} else if ( diffVal >= 31 && diffVal <= 60 ) {
		return 'yellow';
	} else if ( diffVal >= 61 && diffVal <= 90 ) {
		return 'green';
	} else {
		return 'blue';
	}
};

module.exports = {
	notificationTitleByDiff,
	notificationMsgByDiff,
	colorByDiff
};

