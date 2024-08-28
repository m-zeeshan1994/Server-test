'use strict';
const express = require('express');
const contractService = require('../../services/contracts/contractsService');
const authService = require('../../services/auth/index');

let router = express.Router();

router.get('/logout', authService.userLogout);

/*Contracts Api*/
//Get APIS
router.get('/contracts/:id', contractService.getContractListByUser);

router.get('/indexedContracts', contractService.getIndexedContractListByUser);

router.get('/contracts/:id/:status', contractService.getActiveContractListByUser);

//router.get('/contracts/:id/:status/:index', contractService.getIndexedContractListByUser);

//Post APIS

router.post('/contracts/createContract', contractService.createContract);
router.post('/contracts/updateContract', contractService.updateContract);
router.post('/contracts/endContract', contractService.endContract);
router.post('/contracts/indexContract', contractService.indexContract);

router.post('/contracts/getRentIndex', contractService.getNewRentIndexFromDate);

module.exports = router;
