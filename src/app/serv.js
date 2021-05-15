/* jshint
   node:  true, devel:  true, maxstatements: 5, maxparams: 2,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * serv 服务器模块
 * @module app/serv
 */
'use strict';

var serv;

/* 定义对外暴露的公共方法 */
var boot = function (dbHost, port) {
  /* 引入模块依赖 */
  var http = require('http');
  var app = require('./app')(dbHost);

  /* 定义服务 */
  serv = http.createServer(app);

  /* socket.io */
  require('./io')(serv);
  /* 在多核系统上启动 cluster 多核处理模块(可选，待实现) */

  /* 启动服务 */
  // 强制指定为 ipv4
  serv.listen(port, '0.0.0.0');

  // serv.listen(port, function () {
  //   console.info('Express server listening on port ' + port);
  // });
};

var shutdown = function () {
  serv.close();
};

exports.boot = boot;
exports.shutdown = shutdown;
