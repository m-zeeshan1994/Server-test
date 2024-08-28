'use strict';
const clc = require('cli-color');
const server = require('./server');
const config = require('./config');

server.create(config);
server.start();
