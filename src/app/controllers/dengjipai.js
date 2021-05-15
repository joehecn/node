/* jshint
   node: true,        devel: true,
   maxstatements: 28, maxparams: 3, maxdepth: 2,
   maxerr: 50,        nomen: true,  regexp: true
 */

/**
 * dengjipai controller 模块
 * @module app/controllers/dengjipai
 */
'use strict';

var createCtrl = function (dbHost, dbName) {
  var _ERRS = {
    _objSaveObjSaveErr: '12990',
    listDengjipaiFindErr: '12980',
    _findOneByNameDengjipaiFindOneErr: '12970',
    _findOneByIdDengjipaiFindOneErr: '12960',
    removeDengjipaiRemove: '12950',
    _addSaveNameExist: '12040',
    _updateSaveNameExist: '12050',
    _validatorValidatorName: '12060',
    _validatorValidatorPassword: '12061',
  };
  var ctrlName = 'dengjipai';
  var Dengjipai = require('../model')(dbHost, dbName, ctrlName);
  var zxutil = require('../zxutil');
  var errCode;

  // private methods
  var _objSave;
  var _addSave;
  var _findOneById;
  var _updateSave;
  var _findOneByName;
  var _validator;

  // public methods
  var list;
  var add;
  var update;
  var remove;

  _objSave = function (obj, callback) {
    obj.save(function (err, res) {
      if (err) {
        errCode = _ERRS._objSaveObjSaveErr;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      callback({ success: 1, res: res }); // ok
    });
  };

  _addSave = function (res, obj, callback) {
    var newObj;

    if (res) {
      return callback({ success: _ERRS._addSaveNameExist });
    } else {
      // 检验通过，保存
      newObj = new Dengjipai(obj);
      _objSave(newObj, callback);
    }
  };

  _findOneById = function (obj, callback) {
    Dengjipai.findOne({ _id: obj._id }, function (err, res) {
      if (err) {
        errCode = _ERRS._findOneByIdDengjipaiFindOneErr;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      res.name = obj.name;
      res.password = obj.password;

      _objSave(res, callback);
    });
  };

  _updateSave = function (res, obj, callback) {
    if (res) {
      if (res._id.toString() === obj._id.toString()) {
        res.password = obj.password;

        _objSave(res, callback);
      } else {
        return callback({ success: _ERRS._updateSaveNameExist });
      }
    } else {
      _findOneById(obj, callback);
    }
  };

  _findOneByName = function (obj, save, callback) {
    Dengjipai.findOne({ name: obj.name }, function (err, res) {
      if (err) {
        errCode = _ERRS._findOneByNameDengjipaiFindOneErr;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      save(res, obj, callback);
    });
  };

  _validator = function (obj) {
    // 检验 obj.name 用户 isNull、chineseCharacter 自定义验证、isLength
    if (!zxutil.validatorName(obj.name)) {
      return { success: _ERRS._validatorValidatorName };
    }

    // 检验 obj.password 密码 isNull、isLength
    if (!zxutil.validatorPassword(obj.password)) {
      return { success: _ERRS._validatorValidatorPassword };
    }

    return null;
  };

  /**
   * 获取 登机牌用户列表
   *
   * @param   {}
   * @returns {Array} - all field
   */
  list = function (obj, callback) {
    Dengjipai.find(obj, function (err, results) {
      if (err) {
        zxutil.writeLog(ctrlName, _ERRS.listDengjipaiFindErr, err, obj);
        return callback([]);
      }

      callback(results);
    });
  };

  add = function (obj, callback) {
    var _verr = _validator(obj);

    if (_verr) {
      callback(_verr);
    } else {
      _findOneByName(obj, _addSave, callback);
    }
  };

  update = function (obj, callback) {
    var _verr = _validator(obj);

    if (_verr) {
      callback(_verr);
    } else {
      _findOneByName(obj, _updateSave, callback);
    }
  };

  remove = function (id, callback) {
    var obj = { _id: id };

    Dengjipai.remove(obj, function (err, isOk) {
      if (err) {
        errCode = _ERRS.removeDengjipaiRemove;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      callback({ success: isOk.result.ok, _id: id });
    });
  };

  return {
    _objSave: _objSave,
    _findOneById: _findOneById,
    _findOneByName: _findOneByName,
    list: list,
    add: add,
    update: update,
    remove: remove,
  };
};

module.exports = createCtrl;
