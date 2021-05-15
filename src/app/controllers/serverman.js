/* jshint
   node: true,        devel: true,
   maxstatements: 28, maxparams: 3, maxdepth: 2,
   maxerr: 50,        nomen: true,  regexp: true
 */

/**
 * serverman controller 模块
 * @module app/controllers/serverman
 */
'use strict';

var createCtrl = function (dbHost, dbName) {
  var _ERRS = {
    _objSaveObjSaveErr: '11990',
    listServermanFindErr: '11980',
    _findOneServermanFindOneErr: '11970',
    _updateSaveServermanFindOneErr: '11960',
    removeServermanRemove: '11950',
    _findOneNameExist: '11040',
    _validatorValidatorName: '11060',
  };
  var ctrlName = 'serverman';
  var Serverman = require('../model')(dbHost, dbName, ctrlName);
  var zxutil = require('../zxutil');
  var errCode;

  // private methods
  var _objSave;
  var _addSave;
  var _updateSave;
  var _findOne;
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

  _addSave = function (obj, callback) {
    var newObj = new Serverman(obj);
    _objSave(newObj, callback);
  };

  _updateSave = function (obj, callback) {
    Serverman.findOne({ _id: obj._id }, function (err, res) {
      if (err) {
        errCode = _ERRS._updateSaveServermanFindOneErr;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      res.name = obj.name;

      _objSave(res, callback);
    });
  };

  _findOne = function (obj, save, callback) {
    Serverman.findOne(
      { company: obj.company, name: obj.name },
      function (err, res) {
        if (err) {
          errCode = _ERRS._findOneServermanFindOneErr;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({ success: errCode });
        }

        if (res) {
          return callback({ success: _ERRS._findOneNameExist });
        } else {
          // 检验通过，保存
          save(obj, callback);
        }
      }
    );
  };

  _validator = function (obj) {
    // 检验 obj.name 姓名 isNull、chineseCharacter 自定义验证、isLength
    if (!zxutil.validatorName(obj.name)) {
      return { success: _ERRS._validatorValidatorName };
    }
  };

  /**
   * 获取 现场责任人列表
   *
   * @param   {}
   * @returns {Array} - [{ name: 1, meta: 1 }]
   */
  list = function (obj, callback) {
    Serverman.find(obj, { name: 1, meta: 1 }, function (err, results) {
      if (err) {
        zxutil.writeLog(ctrlName, _ERRS.listServermanFindErr, err, obj);
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
      _findOne(obj, _addSave, callback);
    }
  };

  update = function (obj, callback) {
    var _verr = _validator(obj);

    if (_verr) {
      callback(_verr);
    } else {
      _findOne(obj, _updateSave, callback);
    }
  };

  remove = function (id, callback) {
    var obj = { _id: id };

    Serverman.remove(obj, function (err, isOk) {
      if (err) {
        errCode = _ERRS.removeServermanRemove;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      callback({ success: isOk.result.ok, _id: id });
    });
  };

  return {
    _objSave:_objSave,
    _updateSave: _updateSave,
    _findOne: _findOne,
    list: list,
    add: add,
    update: update,
    remove: remove,
  };
};

module.exports = createCtrl;
