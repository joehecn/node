/* jshint
   node:  true,  devel:  true,
   maxstatements: 14, maxparams: 3, maxdepth: 2,
   maxerr: 50,        nomen: true,  regexp: true
 */

/**
 * mongoose ctrl 模块
 * @module app/ctrl
 * require me: controllers/*
 */
'use strict';

/**
 * 动态存放所有 ctrl key-value 结构，通过 [dbName][ctrlName] 获取 Controller
 *
 * @type {Object}
 * @property {Object} dbName
 * @property {Controller}  dbName.ctrlName
 * @property {Object} ...
 * @property {Controller}  ......
 */

/* 数据结构
  ctrls = {
    hz: {
      user: Controller,
      ...
    },
    ...
  }
*/
var ctrls = {};

/**
 * 创建 Controller
 *
 * @param   {String}     dbHost     - 数据库主机
 * @param   {String}     dbName     - 数据库名称
 * @param   {String}     ctrlName   - ctrl
 * @returns {Controller} ctrl       - mongoose ctrl
 * @private
 */
var _createCtrl = function (dbHost, dbName, ctrlName) {
  var createCtrl = require('./controllers/' + ctrlName);
  return createCtrl(dbHost, dbName);
};

/**
 * 获取 Controller
 *
 * @param   {String}     dbHost     - 数据库主机
 * @param   {String}     dbName     - 数据库名称
 * @param   {String}     ctrlName   - ctrl
 * @returns {Controller} ctrl       - mongoose ctrl
 */
var getCtrl = function (dbHost, dbName, ctrlName) {
  var ctrl;

  if (ctrls[dbName]) {
    if (ctrls[dbName][ctrlName]) {

      return ctrls[dbName][ctrlName];
    } else {
      ctrl = _createCtrl(dbHost, dbName, ctrlName);
      ctrls[dbName][ctrlName] = ctrl;

      return ctrl;
    }
  } else {
    ctrl = _createCtrl(dbHost, dbName, ctrlName);
    ctrls[dbName] = {};
    ctrls[dbName][ctrlName] = ctrl;

    return ctrl;
  }
};

module.exports = getCtrl;
