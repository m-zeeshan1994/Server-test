'use strict';

const express = require('express');
const authService = require('../../services/auth/index');

let router = express.Router();

router.post('/login', authService.userLogin);
router.post('/register', authService.userRegister);
router.get('/confirm/:hash', authService.userConfirm);

module.exports = router;
