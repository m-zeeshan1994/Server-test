const winston = require('winston');

const loggerTemplate = `
| ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ |
| ============================================================== |
|                                                                |
|	||| |||||     |||  ||||||||    |||     |||  |||||||      |
|	    ||| ||    |||  |||    |||   |||   |||   |||   |||    |
|	||| |||  ||   |||  |||    |||     ||||      |||   |||    |
|	||| |||	  ||  |||  |||    |||     ||||      ||||||       |
|	||| |||	   || |||  |||    |||    |||  |||   |||  |||     |
|	||| |||	    |||||  ||||||||    |||     |||  |||   |||    |
|                                                                |
| ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ |
| ============================================================== |
`;

const customFormat = winston.format.combine(winston.format.timestamp(), winston.format.printf(( info ) => {
		return `${loggerTemplate} ${info.level.toUpperCase()} ======== ${info.message} TimeStamp ${info.timestamp}`;
	})
);

const logger = winston.createLogger({
	format: customFormat,
	transports: [
		new winston.transports.Console({level: 'info'}),
		new winston.transports.File({filename: 'logs/error.log', level: 'error'})
	]
});

/*const loggered = winston.createLogger({
	format: winston.format.simple(),
	//defaultMeta: { service: 'user-service' },
	transports: [
		new winston.transports.Console()
		// - Write all logs with importance level of `error` or less to `error.log`
		// - Write all logs with importance level of `info` or less to `combined.log`
		//new winston.transports.File({ filename: 'error.log', level: 'error' }),
		//new winston.transports.File({ filename: 'combined.log' }),
	],
});*/
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
/*if (process.env.NODE_ENV !== 'production') {
	logger.add(new winston.transports.Console({
		format: winston.format.simple(),
	}));
}*/

module.exports = logger;
