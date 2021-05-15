/* jshint
   node: true, devel: true,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * node server 入口文件
 */
'use strict';

var serv = require('./app/serv');

serv.boot(process.env.DB_HOST, process.env.S_PORT);
