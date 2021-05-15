/* jshint
   node: true,        devel: true,
   maxstatements: 28, maxparams: 3, maxdepth: 2,
   maxerr: 50,        nomen: true,  regexp: true
 */

/**
 * flag controller 模块
 * @module app/controllers/flag
 */
'use strict';

var createCtrl = function (dbHost, dbName) {
  // 13
  var _ERRS = {
    // xx9 系统级错误
    LIST_FIND_ERR: '13902', // 此错误不抛到客户端
    ADD_ERR: '13904',
    _NEWSAVE_ERR: '13906',
    UPDATE_ERR: '13908',
    REMOVE_ERR: '13910',

    // xx6 黑客
    REMOVE_FAIL: '13602',

    // xx0 一般错误
    ADD_EXIST: '13002',
  };
  var ctrlName = 'flag';
  var Flag = require('../model')(dbHost, dbName, ctrlName);
  var zxutil = require('../zxutil');
  var errCode;

  // private methods
  var _newSave;

  // public methods
  var list;
  var add;
  var update;
  var remove;

  _newSave = function (obj, callback) {
    var newObj = new Flag(obj);

    newObj.save(function (err, res) {
      if (err) {
        errCode = _ERRS._NEWSAVE_ERR;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      callback({ success: 1, res: res }); // ok
    });
  };

  list = function (obj, callback) {
    Flag.find(obj, function (err, results) {
      if (err) {
        errCode = _ERRS.LIST_FIND_ERR;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback([]);
      }

      callback(results);
    });
  };

  add = function (obj, callback) {
    Flag.findOne(obj, function (err, res) {
      if (err) {
        errCode = _ERRS.ADD_ERR;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      if (res) {
        errCode = _ERRS.ADD_EXIST;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      } else {
        // 检验通过，保存
        _newSave(obj, callback);
      }
    });
  };

  update = function (obj, callback) {
    Flag.findByIdAndUpdate(
      obj._id,
      {
        $set: { name: obj.name, color: obj.color, 'meta.updateAt': Date.now() },
      },
      { new: true }, // 返回修改后的文档
      function (err, res) {
        if (err) {
          errCode = _ERRS.UPDATE_ERR;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({ success: errCode });
        }

        callback({ success: 1, res: res });
      }
    );
  };

  remove = function (id, callback) {
    Flag.remove({ _id: id }, function (err, isOk) {
      if (err) {
        errCode = _ERRS.REMOVE_ERR;
        zxutil.writeLog(ctrlName, errCode, err, { _id: id });
        return callback({ success: errCode });
      }

      if (isOk.result.ok === 1 && isOk.result.n === 1) {
        callback({ success: 1 });
      } else {
        errCode = _ERRS.REMOVE_FAIL;
        zxutil.writeLog(ctrlName, errCode, err, { _id: id });
        return callback({ success: errCode });
      }
    });
  };

  return {
    _newSave: _newSave,
    list: list,
    add: add,
    update: update,
    remove: remove,
  };
};

module.exports = createCtrl;
