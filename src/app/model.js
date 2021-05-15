/* jshint
   node:  true,  devel:  true,
   maxstatements: 11, maxparams: 3, maxdepth: 2,
   maxerr: 50,        nomen: true,  regexp: true
 */

/**
 * mongoose model 模块
 * @module app/model
 * require me: schemas/*, conn, zxutil
 */
'use strict';

/**
 * 动态存放所有 model key-value 结构，通过 [dbName][schemaName] 获取 Model
 *
 * @type {Object}
 * @property {Object} dbName
 * @property {Model}  dbName.schemaName
 * @property {Object} ...
 * @property {Model}  ......
 */

/* 数据结构
   models = {
     hz: {
       user: Model,
       ...
     },
     ...
   }
 */
var models = {};

/**
 * 创建 Model
 *
 * @param   {String} dbHost     - 数据库主机
 * @param   {String} dbName     - 数据库名称
 * @param   {String} schemaName - schema
 * @returns {Model}  model      - mongoose model
 * @private
 */
var _createModel = function (dbHost, dbName, schemaName) {
  var Schema = require('./schemas/' + schemaName);
  var getConn = require('./conn');

  // 首字母大写
  var validatorReplaceFirstUpper =
      require('./zxutil').validatorReplaceFirstUpper;
  var c = getConn(dbHost, dbName);

  return c.model(validatorReplaceFirstUpper(schemaName), Schema);
};

/**
 * 获取 Model
 *
 * @param   {String} dbHost     - 数据库主机
 * @param   {String} dbName     - 数据库名称
 * @param   {String} schemaName - schema
 * @returns {Model}  model      - mongoose model
 */
var getModel = function (dbHost, dbName, schemaName) {
  var md;

  if (models[dbName]) {
    if (models[dbName][schemaName]) {

      return models[dbName][schemaName];
    } else {
      md = _createModel(dbHost, dbName, schemaName);
      models[dbName][schemaName] = md;

      return md;
    }
  } else {
    md = _createModel(dbHost, dbName, schemaName);
    models[dbName] = {};
    models[dbName][schemaName] = md;

    return md;
  }
};

module.exports = getModel;
