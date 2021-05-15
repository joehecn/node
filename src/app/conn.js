/* jshint
   node:  true, devel:  true, maxstatements: 8, maxparams: 2,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * 数据库连接模块
 * @module app/conn
 * require: null
 */
'use strict';

/**
 * 动态存放所有数据库连接 key-value 结构，通过数据库名称获取连接
 *
 * @type {Object}
 * @property {Connection} auth  - key:数据库名称, value: 数据库连接
 * @property {Connection} sz
 * @property {Connection} gz
 * @property {Connection} hz
 * @property {Connection} ...
 */

/*
   数据库名称: auth, sz, gz, hz
   数据结构
   conns = {
     hz: mongoose.connection,
     ...
   }
 */
var conns = {};

/**
 * 创建数据库连接
 *
 * @param   {String}     dbHost - 数据库主机
 * @param   {String}     dbName - 数据库名称
 * @returns {Connection} conn   - 数据库连接
 * @private
 */
var _createConn = function (dbHost, dbName) {
  var mongoose = require('mongoose');

  mongoose.Promise = global.Promise;

  return mongoose.createConnection(dbHost, dbName);
};

/**
 * 获取数据库连接
 *
 * @param   {String}     dbHost - 数据库主机
 * @param   {String}     dbName - 数据库名称
 * @returns {Connection} conn   - 数据库连接
 */
var getConn = function (dbHost, dbName) {
  var conn;

  if (conns[dbName]) {
    return conns[dbName];
  }

  conn = _createConn(dbHost, dbName);
  conns[dbName] = conn;
  return conn;
};

module.exports = getConn;
