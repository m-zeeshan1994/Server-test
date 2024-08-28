'use strict';

const express = require('express');
const contractService = require('../../services/contracts/contractsService');

let router = express.Router();

/*Contracts APIs */
//router.get('/contracts', contractService.getContractList);
router.get('/contracts/:id', contractService.getContractListByUser);
router.get('/contracts/:id/:status', contractService.getActiveContractListByUser);

module.exports = router;
