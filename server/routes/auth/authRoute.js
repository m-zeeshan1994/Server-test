'use strict';

const
	express = require('express'),
	authController = require('../../controllers/auth/authController');

let router = express.Router();

router.use('/', authController);

module.exports = router;
