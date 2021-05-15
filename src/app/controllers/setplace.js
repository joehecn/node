/* jshint
   node: true,        devel: true,
   maxstatements: 28, maxparams: 3, maxdepth: 2,
   maxerr: 50,        nomen: true,  regexp: true
 */

/**
 * feestemp controller 模块
 * @module app/controllers/feestemp
 */
'use strict';

var createCtrl = function (dbHost, dbName) {
  var _ERRS = {
    listSetPlaceFindErr: '18990',
  };
  var writeLog = require('../zxutil').writeLog;
  var SetPlace = require('../model')(dbHost, dbName, 'setplace');

  // public method
  var list;

  /**
   * 获取 集合地点列表
   *
   * @param   {}
   * @returns {Array} - all field
   */
  list = function (obj, callback) {
    SetPlace.find(obj, function (err, results) {
      if (err) {
        writeLog('setplace', _ERRS.listSetPlaceFindErr, err, obj);
        return callback([]);
      }

      callback(results);
    });
  };

  return {
    list: list,
  };
};

module.exports = createCtrl;
