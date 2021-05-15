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
  var _ERRS    = {
    _objSaveObjSaveErr: '19990',
    listFeesTempFindErr: '19980',      // 此错误不抛到客户端
    updateFeesTempFindOneErr: '19970',
    GET_MY_FEESTEMP_ERR_1: '19972',    // 此错误不抛到客户端
    GET_MY_FEESTEMP_ERR_2: '19974',    // 此错误不抛到客户端
  };
  var ctrlName = 'feestemp';
  var getModel = require('../model');
  var FeesTemp = getModel(dbHost, dbName, ctrlName);
  var zxutil   = require('../zxutil');
  var _        = require('underscore');
  var errCode;

  // private methods
  var _objSave;
  var _computeMyfeestemp;

  // public methods
  var list;
  var add;
  var update;
  var getMyFeestemp;

  _objSave = function (obj, callback) {
    obj.save(function (err, res) {
      if (err) {
        errCode = _ERRS._objSaveObjSaveErr;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      // res 是 save 成功后的 feestemp 对象
      callback({ success: 1, res: res }); // ok
    });
  };

  _computeMyfeestemp = function (svfeestemp, mefeestemp) {
    var myfeestemp = {};
    var t;
    var i;

    for (i = 1; i < 9; i += 1) {
      t = {};
      t.basStepPrice =
        svfeestemp['t' + i].basStepPrice + mefeestemp['t' + i].basStepPrice;

      t.basMaxPrice =
        svfeestemp['t' + i].basMaxPrice + mefeestemp['t' + i].basMaxPrice;

      t.addStartTime = svfeestemp['t' + i].addStartTime;
      t.addEndTime = svfeestemp['t' + i].addEndTime;
      t.addPrice = svfeestemp['t' + i].addPrice + mefeestemp['t' + i].addPrice;

      t.putPersonNum =
        svfeestemp['t' + i].putPersonNum + mefeestemp['t' + i].putPersonNum;

      t.putPrice = svfeestemp['t' + i].putPrice + mefeestemp['t' + i].putPrice;

      myfeestemp['t' + i] = t;
    }

    return myfeestemp;
  };

  /**
   * 获取 集合地点列表
   *
   * @param   {}
   * @returns {Array} - all field
   */
  list = function (obj, callback) {
    FeesTemp.find(obj, function (err, results) {
      if (err) {
        zxutil.writeLog(ctrlName, _ERRS.listFeesTempFindErr, err, obj);
        return callback([]);
      }

      callback(results);
    });
  };

  add = function (obj, callback) {
    var newObj = new FeesTemp(obj);
    _objSave(newObj, callback);
  };

  update = function (obj, callback) {
    FeesTemp.findOne({ _id: obj._id }, function (err, res) {
      if (err) {
        errCode = _ERRS.updateFeesTempFindOneErr;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      var resObj = _.extend(res, obj);

      _objSave(resObj, callback);
    });
  };

  getMyFeestemp = function (obj, callback) {
    var feesname = obj.feestemp;

    FeesTemp.findOne({ name: '基础' }, function (err, svfeestemp) {
      if (err) {
        errCode = _ERRS.GET_MY_FEESTEMP_ERR_1;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({});
      }

      FeesTemp.findOne({ name: feesname }, function (err, mefeestemp) {
        var myfeestemp;

        if (err) {
          errCode = _ERRS.GET_MY_FEESTEMP_ERR_2;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({});
        }

        myfeestemp = _computeMyfeestemp(svfeestemp, mefeestemp);

        callback(myfeestemp);
      });
    });
  };

  return {
    _objSave: _objSave,
    _computeMyfeestemp: _computeMyfeestemp,
    list:     list,
    add:      add,
    update:   update,
    getMyFeestemp: getMyFeestemp,
  };
};

module.exports = createCtrl;
