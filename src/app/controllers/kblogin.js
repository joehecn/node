/* jshint
   node: true,        devel: true,
   maxstatements: 80, maxparams: 4, maxdepth: 4,
   maxerr: 50,        nomen: true,  regexp: true
 */

/**
 * kblogin controller 模块
 * @module app/controllers/kblogin
 */
'use strict';

var createCtrl = function (dbHost, dbName) {
  var _ERRS = {
    getLoginObj: '111111',
    setLoginObj: '121212',

  };
  var ctrlName = 'kblogin';
  var getModel = require('../model');
  var zxutil   = require('../zxutil');
  var Kblogin  = getModel(dbHost, dbName, ctrlName);

  var errCode;

  var getLoginObj;
  var setLoginObj;

  getLoginObj = function (key, callback) {
    Kblogin.findOne({ key: key }, function (err, user) {
      if (err) {
        errCode = _ERRS.setLoginObj;
        zxutil.writeLog(ctrlName, errCode, err, {});
        return callback({ success: errCode });
      }

      callback(user);
    });
  };

  setLoginObj = function (userObj, callback) {
    var userName = userObj.userName;
    Kblogin.findOneAndUpdate(
      { userName: userName },
      {
        $set: {
          userName: userName,
          name: userObj.name,
          CITY: userObj.CITY,
          dbName: userObj.dbName,
          key: userObj.key,
        },
      },
      { new: true, upsert: true },
      function (err, user) {
        if (err) {
          errCode = _ERRS.setLoginObj;
          zxutil.writeLog(ctrlName, errCode, err, userObj);
          return callback({ success: errCode });
        }

        if (user) {
          callback({
            success: 1,
            name: user.name,
            CITY: user.CITY,
            key: user.key,
          });
        } else {
          errCode = _ERRS.setLoginObj;
          zxutil.writeLog(ctrlName, errCode, {}, userObj);
          return callback({ success: errCode });
        }
      }
    );
  };

  return {
    getLoginObj: getLoginObj,
    setLoginObj: setLoginObj,
  };
};

module.exports = createCtrl;
