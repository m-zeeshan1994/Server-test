const express = require('express');
const ContractsController = require('../../controllers/contracts/contractsController');

let router = express.Router();

router.use('/', ContractsController);
module.exports = router;
