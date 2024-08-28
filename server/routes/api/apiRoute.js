'use strict';
const express = require('express');
const apiController = require('./../../controllers/api/apiController');
let router = express.Router();
router.use('/', apiController);
module.exports = router;

