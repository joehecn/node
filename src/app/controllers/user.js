/* jshint
   node: true,        devel: true,
   maxstatements: 80, maxparams: 4, maxdepth: 4,
   maxerr: 50,        nomen: true,  regexp: true
 */

/**
 * user controller 模块
 * @module app/controllers/user
 */
'use strict';

var createCtrl = function (dbHost, dbName) {
  // 10
  var _ERRS = {
    // xx9 系统级错误
    _userFindOneBySearchErr: '10902',          // login|initUser
    _comparePasswordErr: '10904',              // login
    _companyFindOneByNameErr: '10922',         // register
    _userFindOneByUserNameErr: '10924',        // register add
    _newCompanySaveErr: '10926',               // register
    _newUserSaveErr: '10928',                  // register
    changePasswordFindUserErr: '10942',        // changePassword
    changePasswordUserSaveErr: '10944',        // changePassword
    companylistErr: '10952',                   // companylist 此错误不抛到客户端
    _feesTempFindErr: '10954',                 // companylist 此错误不抛到客户端
    companyUpdateFeesTempFindOneErr: '10962',  // companyUpdate
    _checkCompanynameFindErr: '10964',         // companyUpdate
    _companyUpdateErr: '10966',                // companyUpdate
    listErr: '10968',                          // list 此错误不抛到客户端
    changeStatusFindErr: '10970',              // changeStatus
    _changeStatusUpErr: '10972',               // changeStatus
    resetPasswordFindErr: '10974',             // resetPassword
    _resetPasswordSaveErr: '10976',            // resetPassword
    updateFindErr: '10978',                    // update
    _userUpdateErr: '10980',                   // update
    changeUpdateAtErr: '10999',                // changeUpdateAt 此错误不抛到客户端
    TEAM_BY_COMPANYS_ERR: '10998',             // 此错误不抛到客户端
    CHANGESENDSETTIME_ERR: '10802',
    SETDEFAULTFLAG_ERR: '10804',

    // xx6 黑客
    loginValidatorUserName: '10602',           // login
    loginValidatorPassword: '10604',           // login
    initUserCityError: '10612',                // initUser
    _userFindOneBySearchNoLoginCity: '10614',  // initUser
    validatorCompanyName: '10622',             // register
    validatorUserName: '10624',                // register add
    validatorPassword: '10626',                // register add
    validatorCompanyAbbr: '10628',             // register add
    validatorName: '10630',                    // register add
    validatorPhoneNumber: '10632',             // register add
    changePasswordOld: '10642',                // changePassword
    changePasswordNew: '10644',                // changePassword
    changePasswordFindNoUser: '10646',         // changePassword
    companyUpdateFeesTempFindOne: '10662',     // companyUpdate
    _checkCompanynameError: '10664',           // companyUpdate
    changeStatusError: '10666',                // changeStatus
    changeStatusArg: '10668',                  // changeStatus
    resetPasswordError: '10670',               // resetPassword
    resetPasswordArg: '10672',                 // resetPassword
    resetPasswordUserName: '10674',            // resetPassword
    updateFindNoOne: '10676',                  // update
    updateFindNoTwo: '10678',                  // update
    _companyUpdateIsOk: '10680',               // companyUpdate
    _changeStatusUpIsOk: '10682',              // changeStatus
    _userUpdateIsOk: '10684',                  // update
    changeStatusFindNo: '10688',               // changeStatus
    resetPasswordFindNo: '10690',              // resetPassword
    // xx0 一般错误
    _userFindOneBySearchNoLogin: '10002',      // login|initUser
    _userFindOneBySearchCheckStatus: '10004',  // login
    _userFindOneBySearchUserNotExist: '10006', // login
    _comparePasswordNotMatch: '10008',         // login|changePassword
    _companyFindOneByNameExist: '10022',       // register
    _userFindOneByUserNameExist: '10024',      // register
    _checkCompanynameExist: '10062',           // companyUpdate
    CHANGESENDSETTIME_OK: '10064',
    SETDEFAULTFLAG_OK: '10066',
  };
  var ctrlName = 'user';
  var getModel = require('../model');
  var zxutil   = require('../zxutil');
  var DB_CITY  = zxutil.DB_CITY;
  var CITY_DB  = zxutil.CITY_DB;
  var User     = getModel(dbHost, 'auth', ctrlName);
  var Company  = getModel(dbHost, 'auth', 'company');
  var FeesTemp = getModel(dbHost, dbName, 'feestemp');
  var errCode;

  // private methods
  var _userFindOneBySearch;
  var _comparePassword;
  var _companyFindOneByName;
  var _userFindOneByUserName;
  var _newCompanySave;
  var _newUserSave;
  var _userSave;
  var _feesTempFind;
  var _checkCompanyname;
  var _companyFindOne;
  var _companyUpdate;
  var _changeStatusUp;
  var _resetPasswordSave;
  var _addFindOne;
  var _userUpdate;

  // public methods
  var login;
  var initUser;
  var register;
  var changePassword;
  var companylist;
  var companyUpdate;
  var list;
  var changeStatus;
  var resetPassword;
  var add;
  var update;
  var changeUpdateAt;
  var changeSendSetTime;
  var setDefaultFlag;

  // 新增功能
  var teamByCompanys;

  // login initUser
  _userFindOneBySearch = function (obj, callback) {
    // login
    // search: { userName: 'test' },
    // filter: { company: 1, role: 1, status: 1, password: 1 }
    // password: '123456'
    // -----------------------------
    // initUser
    // search: { _id: uid }
    // filter: {
    //  company, role, status, userName, name,
    //  companyAbbr, defaultFlag, sendSetTime,
    // }
    // dbName: 'sz'
    User.findOne(
      obj.search,
      obj.filter
    ).populate(
      'company',
      { category: 1, city: 1, feestemp: 1 }
    ).exec(function (err, user) {
      if (err) {
        errCode = _ERRS._userFindOneBySearchErr;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      if (user) {
        if (user.role === 0) {
          return callback({ success: _ERRS._userFindOneBySearchNoLogin });

        // initUser
        } else if (obj.dbName &&
            user.role <= 30 &&
            user.company.category === 30 &&
            CITY_DB[user.company.city] !== obj.dbName) {

          errCode = _ERRS._userFindOneBySearchNoLoginCity;
          zxutil.writeLog(ctrlName, errCode, {}, obj);
          return callback({ success: errCode });
        }

        // 检查用户状态
        if (user.status === false) {
          return callback({ success: _ERRS._userFindOneBySearchCheckStatus });
        }

        // 检查密码
        if (obj.password) {
          _comparePassword({ user: user, password: obj.password },
            function (res) {
              if (res.success === 1) {
                callback({
                  success: 1,
                  profile: { uid: user._id },
                  name: user.name, // for 看板
                  category: user.company.category, // for 看板
                  CITY: user.company.city, // for 看板
                  dbName: CITY_DB[user.company.city],
                });
              } else {
                callback(res);
              }
            }
          );
        } else {
          // initUser
          callback({ success: 1, user: user });
        }
      } else {
        callback({ success: _ERRS._userFindOneBySearchUserNotExist });
      }
    });
  };

  // login
  _comparePassword = function (obj, callback) {
    // obj: { user, password }
    var user = obj.user;
    var password = obj.password;
    user.comparePassword(password, function (err, isMatch) {
      if (err) {
        errCode = _ERRS._comparePasswordErr;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      if (isMatch) { // true
        callback({ success: 1 });
      } else {
        callback({ success: _ERRS._comparePasswordNotMatch });
      }
    });
  };

  // register
  _companyFindOneByName = function (obj, callback) {
    var companyObj = obj.companyObj;
    var userObj = obj.userObj;

    Company.findOne({ name: companyObj.name }, function (err, company) {
      if (err) {
        errCode = _ERRS._companyFindOneByNameErr;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      if (company) {
        return callback({ success: _ERRS._companyFindOneByNameExist });
      } else {
        // 检验 用户 是否存在
        _userFindOneByUserName({ companyObj: companyObj, userObj: userObj },
            callback);
      }
    });
  };

  // register 检验 用户 是否存在
  _userFindOneByUserName = function (obj, callback) {
    var companyObj = obj.companyObj;
    var userObj = obj.userObj;

    User.findOne({ userName: userObj.userName }, function (err, user) {
      if (err) {
        errCode = _ERRS._userFindOneByUserNameErr;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      if (user) {
        return callback({ success: _ERRS._userFindOneByUserNameExist });
      } else {
        // ***所有检验通过，进入正常保存流程***
        // 保存公司
        companyObj.feestemp = '默认';
        _newCompanySave({ companyObj: companyObj, userObj: userObj }, callback);
      }
    });
  };

  // 保存新公司
  _newCompanySave = function (obj, callback) {
    var companyObj = obj.companyObj;
    var userObj = obj.userObj;
    var newCompany = new Company(companyObj);

    // category default: 20
    // isidcard default: false
    // idcardfee default: 0
    newCompany.save(function (err, company) {
      if (err) {
        errCode = _ERRS._newCompanySaveErr;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      // 添加公司 总负责人，用户权限：30
      userObj.role = 30;

      // false：审核中（主账户注册后需要管理员审核）
      // status default: true
      userObj.status = false;
      userObj.company = company._id;

      _newUserSave(userObj, callback);
    });
  };

  // 保存新用户 30权限
  _newUserSave = function (userObj, callback) {
    var newUser = new User(userObj);
    errCode = _ERRS._newUserSaveErr;

    _userSave(newUser, errCode, callback);
  };

  _userSave = function (userArg, errCode, callback) {
    userArg.save(function (err, user) {
      if (err) {
        zxutil.writeLog(ctrlName, errCode, err, userArg);
        return callback({ success: errCode });
      }

      // regist 在 app.js 中去除 user, 不要发送到客户端
      // 为测试返回results.user, 不能在此过滤
      // add 在 io.js 中过滤 user 字段
      callback({ success: 1, user: user }); // ok
    });
  };

  _feesTempFind = function (o, callback) {
    var neObj = o.neObj;
    var companys = o.companys;

    FeesTemp.find({ name: neObj }, { name: 1 }, function (err, fees) {
      if (err) {
        errCode = _ERRS._feesTempFindErr;
        zxutil.writeLog(ctrlName, errCode, err, o);
        return callback({});
      }

      callback({
        companys: companys,
        fees: fees,
      });
    });
  };

  _checkCompanyname = function (companyObj, callback) {
    // 检验 companyObj.set.name 公司名称 isNull、isLength
    if (companyObj.set.name) {
      if (!(zxutil.validatorCompanyName(companyObj.set.name))) {
        errCode = _ERRS._checkCompanynameError;
        zxutil.writeLog(ctrlName, errCode, {}, companyObj);
        return callback({ success: errCode });
      }

      // 查找是否有不同 _id 的公司名 已经存在
      _companyFindOne(companyObj, callback);
    } else {
      // 检验通过，更新公司
      _companyUpdate(companyObj, callback);
    }
  };

  _companyFindOne = function (companyObj, callback) {
    Company.findOne({ name: companyObj.set.name }, function (err, company) {
      if (err) {
        errCode = _ERRS._checkCompanynameFindErr;
        zxutil.writeLog(ctrlName, errCode, err, companyObj);
        return callback({ success: errCode });
      }

      // 查找是否有不同 _id 的公司名 已经存在
      if (company && company._id.toString() !== companyObj._id) {
        // 公司名 已经存在
        callback({ success: _ERRS._checkCompanynameExist });
      } else {
        // 没有另一个同名公司
        // 检验通过，更新公司
        _companyUpdate(companyObj, callback);
      }
    });
  };

  _companyUpdate = function (companyObj, callback) {
    Company.update(
      { _id: companyObj._id },
      { $set: companyObj.set }, function (err, isOk) {
        if (err) {
          errCode = _ERRS._companyUpdateErr;
          zxutil.writeLog(ctrlName, errCode, err, companyObj);
          return callback({ success: errCode });
        }

        if (isOk.nModified === 1 && isOk.n === 1) {
          // callback({ success: 1, companyObj: companyObj });
          callback({ success: 1 });
        } else {
          errCode = _ERRS._companyUpdateIsOk;
          zxutil.writeLog(ctrlName, errCode, {}, companyObj);
          return callback({ success: errCode });
        }
      }
    );
  };

  _changeStatusUp = function (id, status, callback) {
    User.update({ _id: id }, { $set: { status: status } },
      function (err, isOk) {
        if (err) {
          errCode = _ERRS._changeStatusUpErr;
          zxutil.writeLog(ctrlName, errCode, err, { id: id, status: status });
          return callback({ success: errCode });
        }

        if (isOk.nModified === 1 && isOk.n === 1) {
          callback({ success: 1 });
        } else {
          errCode = _ERRS._changeStatusUpIsOk;
          zxutil.writeLog(ctrlName, errCode, {}, {
            _id: id,
            status: status,
          });
          return callback({ success: errCode });
        }
      }
    );
  };

  _resetPasswordSave = function (user, password, callback) {
    // ***所有检验通过，进入正常保存流程***
    user.password = password;

    user.save(function (err) {
      if (err) {
        errCode = _ERRS._resetPasswordSaveErr;
        zxutil.writeLog(ctrlName, errCode, err, user);
        return callback({ success: errCode });
      }

      callback({ success: 1 }); // ok
    });
  };

  _addFindOne = function (obj, callback) {
    User.findOne({ userName: obj.userName }, function (err, user) {
      if (err) {
        errCode = _ERRS._userFindOneByUserNameErr;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      if (user) {
        return callback({ success: _ERRS._userFindOneByUserNameExist });
      } else {
        // ***所有检验通过，进入正常保存流程***
        // 保存用户
        // status default: true
        _newUserSave(obj, callback);
      }
    });
  };

  _userUpdate = function (id, set, callback) {
    User.update({ _id: id }, { $set: set }, function (err, isOk) {
      if (err) {
        errCode = _ERRS._userUpdateErr;
        zxutil.writeLog(ctrlName, errCode, err, {
          _id: id,
          set: set,
        });
        return callback({ success: errCode });
      }

      // success 0 or 1
      if (isOk.nModified === 1 && isOk.n === 1) {
        callback({ success: 1 });
      } else {
        errCode = _ERRS._userUpdateIsOk;
        zxutil.writeLog(ctrlName, errCode, {}, {
          _id: id,
          set: set,
        });
        return callback({ success: errCode });
      }
    });
  };

  /**
   *  登录
   *  参数
   *    obj: { userName: 'test', password: '123456' }
   *  正常回调
   *    callback({
   *      success: 1,
   *      profile: { uid: user._id },
   *      dbName: CITY_DB[user.company.city],
   *  });
   */
  login = function (obj, callback) {
    // 检验 userObj.userName 用户名 isNull、alnum 自定义验证、isLength
    if (!zxutil.validatorUserName(obj.userName)) {
      errCode = _ERRS.loginValidatorUserName;
      zxutil.writeLog(ctrlName, errCode, {}, obj);
      return callback({ success: errCode });
    }

    // 检验 userObj.password 密码 isNull、isLength、用户名与密码相同
    if (!zxutil.validatorPassword(obj.password) ||
        obj.userName === obj.password) {

      errCode = _ERRS.loginValidatorPassword;
      zxutil.writeLog(ctrlName, errCode, {}, obj);
      return callback({ success: errCode });
    }

    // search: { userName: 'test' },
    // filter: { company: 1, role: 1, status: 1, password: 1 }
    // password: '123456'

    // filter for 看板: name
    _userFindOneBySearch({
      search: { userName: obj.userName },
      filter: { company: 1, role: 1, status: 1, password: 1, name: 1 },
      password: obj.password,
    }, callback);
  };

  /**
   *  初始化用户: nspzx.on('connection') 内调用
   *  参数
   *    obj: {
   *      uid: socket.decoded_token.uid,
   *      dbName: socket.handshake.query.dbName,
   *    }
   *  正常回调
   *    callback({
   *      success: 1,
          user: user,
   *    });
   */
  initUser = function (obj, callback) {
    // obj: { uid, dbName }
    // search: { _id: uid }
    // filter: { company: 1, role: 1, status: 1, userName: 1, name: 1 }
    // dbName: 'sz'
    if (DB_CITY[obj.dbName]) {
      _userFindOneBySearch({
        search: { _id: obj.uid },
        filter: {
          company: 1, role: 1, status: 1, phone: 1, // 新建单要用phone
          userName: 1, name: 1, companyAbbr: 1,
          defaultFlag: 1, sendSetTime: 1,
        },
        dbName: obj.dbName,
      }, callback);
    } else {
      errCode = _ERRS.initUserCityError;
      zxutil.writeLog(ctrlName, errCode, {}, obj);
      callback({ success: errCode });
    }
  };

  // register 注册
  register = function (obj, callback) {
    var companyObj = obj.companyObj;
    var userObj = obj.userObj;

    // 检验 companyObj.name 公司名称 isNull、isLength
    if (!(zxutil.validatorCompanyName(companyObj.name))) {
      errCode = _ERRS.validatorCompanyName;
      zxutil.writeLog(ctrlName, errCode, {}, obj);
      return callback({ success: errCode });
    }

    // 检验 userObj.userName 用户名 isNull、alnum 自定义验证、isLength
    if (!zxutil.validatorUserName(userObj.userName)) {
      errCode = _ERRS.validatorUserName;
      zxutil.writeLog(ctrlName, errCode, {}, obj);
      return callback({ success: errCode });
    }

    // 检验 userObj.password 密码 isNull、isLength、用户名与密码相同
    if (!zxutil.validatorPassword(userObj.password) ||
        userObj.userName === userObj.password) {

      errCode = _ERRS.validatorPassword;
      zxutil.writeLog(ctrlName, errCode, {}, obj);
      return callback({ success: errCode });
    }

    // 检验 userObj.companyAbbr 公司简称 isNull、isLength
    if (!zxutil.validatorCompanyAbbr(userObj.companyAbbr)) {
      errCode = _ERRS.validatorCompanyAbbr;
      zxutil.writeLog(ctrlName, errCode, {}, obj);
      return callback({ success: errCode });
    }

    // 检验 userObj.name 姓名 isNull、chineseCharacter 自定义验证、isLength
    if (!zxutil.validatorName(userObj.name)) {
      errCode = _ERRS.validatorName;
      zxutil.writeLog(ctrlName, errCode, {}, obj);
      return callback({ success: errCode });
    }

    // 检验 userObj.phone 手机号 isNull、phoneNumber 自定义验证
    if (!zxutil.validatorPhoneNumber(userObj.phone)) {
      errCode = _ERRS.validatorPhoneNumber;
      zxutil.writeLog(ctrlName, errCode, {}, obj);
      return callback({ success: errCode });
    }

    // 检验 公司 是否存在
    _companyFindOneByName(
      { companyObj: companyObj, userObj: userObj }, callback);
  };

  // 修改密码
  changePassword = function (userObj, callback) {
    // userObj: { _id, password, passwordnew }

    // 检验 userObj.password 密码 isNull、isLength
    if (!zxutil.validatorPassword(userObj.password)) {
      errCode = _ERRS.changePasswordOld;
      zxutil.writeLog(ctrlName, errCode, {}, userObj);
      return callback({ success: errCode });
    }

    // 检验 userObj.password 密码 isNull、isLength、旧密码=新密码
    if (!zxutil.validatorPassword(userObj.passwordnew) ||
        userObj.password === userObj.passwordnew) {

      errCode = _ERRS.changePasswordNew;
      zxutil.writeLog(ctrlName, errCode, {}, userObj);
      return callback({ success: errCode });
    }

    User.findById(userObj._id, function (err, user) {
      if (err) {
        errCode = _ERRS.changePasswordFindUserErr;
        zxutil.writeLog(ctrlName, errCode, err, userObj);
        return callback({ success: errCode });
      }

      if (user) {
        // 检验旧密码
        _comparePassword(
          { user: user, password: userObj.password },
          function (res) {
            if (res.success === 1) {
              // ***所有检验通过，进入正常保存流程***
              user.password = userObj.passwordnew;
              errCode = _ERRS.changePasswordUserSaveErr;

              _userSave(user, errCode, function (results) {
                callback({ success: results.success });
              });
            } else {
              callback(res);
            }
          }
        );
      } else {
        // 用户不存在
        return callback({ success: _ERRS.changePasswordFindNoUser });
      }
    });
  };

  companylist = function (obj, callback) {
    var search = { city: obj.CITY };

    Company.find(search, function (err, companys) {
      var neObj;

      if (err) {
        errCode = _ERRS.companylistErr;
        zxutil.writeLog(ctrlName, errCode, err, search);
        return callback({});
      }

      neObj = { $ne: '基础' };

      _feesTempFind({ neObj: neObj,  companys: companys },
          callback);
    });
  };

  companyUpdate = function (companyObj, callback) {
    if (companyObj.set.feestemp) {
      // 检查服务费模板名称是否存在
      FeesTemp.findOne(
        { name: companyObj.set.feestemp },
        function (err, feestemp) {
          if (err) {
            errCode = _ERRS.companyUpdateFeesTempFindOneErr;
            zxutil.writeLog(ctrlName, errCode, err, companyObj);
            return callback({ success: errCode });
          }

          if (feestemp) {
            _checkCompanyname(companyObj, callback);
          } else {
            errCode = _ERRS.companyUpdateFeesTempFindOne;
            zxutil.writeLog(ctrlName, errCode, {}, companyObj);
            return callback({ success: errCode });
          }
        }
      );
    } else {
      _checkCompanyname(companyObj, callback);
    }
  };

  // userlist
  list = function (seach, callback) {
    User.find(
      seach,
      {
        company: 1,
        userName: 1,
        phone: 1,
        role: 1,
        status: 1,
        name: 1,
        companyAbbr: 1,
        sendSetTime: 1, // for 新版小帮手
        defaultFlag: 1, // for 新版小帮手
        meta: 1,
      }
    ).populate('company', { category: 1 }).exec(function (err, users) {
      if (err) {
        errCode = _ERRS.listErr;
        zxutil.writeLog(ctrlName, errCode, err, seach);
        return callback([]);
      }

      callback(users);
    });
  };

  // 状态变更
  changeStatus = function (obj, role, callback) {
    // obj: {_id, status}
    var id = obj._id;
    var status = obj.status;

    // 检测客户端输入
    if (id && typeof status === 'boolean') {
      User.findOne(
        { _id: id },
        { company: 1, role: 1 }
      ).populate(
        'company',
        { category: 1 }
      ).exec(function (err, user) {
        if (err) {
          errCode = _ERRS.changeStatusFindErr;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({ success: errCode });
        }

        if (user) {
          if (user.company.category === 20 || role > user.role) {
            _changeStatusUp(id, status, callback);
          } else {
            errCode = _ERRS.changeStatusError;
            zxutil.writeLog(ctrlName, errCode, {}, obj);
            return callback({ success: errCode });
          }
        } else {
          errCode = _ERRS.changeStatusFindNo;
          zxutil.writeLog(ctrlName, errCode, {}, obj);
          return callback({ success: errCode });
        }
      });
    } else {
      errCode = _ERRS.changeStatusArg;
      zxutil.writeLog(ctrlName, errCode, {}, obj);
      return callback({ success: errCode });
    }
  };

  // 重置密码
  resetPassword = function (obj, checkSys30, role, callback) {
    // obj: {_id, password}

    // 检测客户端输入
    var id = obj._id;
    var password = obj.password;

    if (id && typeof password === 'string') {
      User.findOne(
        { _id: id },
        { company: 1, role: 1, userName: 1 }
      ).populate(
        'company',
        { category: 1 }
      ).exec(function (err, user) {
        if (err) {
          errCode = _ERRS.resetPasswordFindErr;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({ success: errCode });
        }

        if (user) {
          // 检验 password 密码 isNull、isLength、用户名与密码相同
          if (!zxutil.validatorPassword(password) ||
              user.userName === password) {

            errCode = _ERRS.resetPasswordUserName;
            zxutil.writeLog(ctrlName, errCode, {}, obj);
            return callback({ success: errCode });
          }

          // 权限 服务商总负责人30以上修改地接社 或者 role > user.role
          // 为什么不用 checkSys99, 因为 role 99
          if ((checkSys30 && user.company.category === 20) ||
              role > user.role) {

            _resetPasswordSave(user, password, callback);
          } else {
            errCode = _ERRS.resetPasswordError;
            zxutil.writeLog(ctrlName, errCode, {}, obj);
            return callback({ success: errCode });
          }
        } else {
          errCode = _ERRS.resetPasswordFindNo;
          zxutil.writeLog(ctrlName, errCode, {}, obj);
          return callback({ success: errCode });
        }
      });
    } else {
      errCode = _ERRS.resetPasswordArg;
      zxutil.writeLog(ctrlName, errCode, {}, obj);
      return callback({ success: errCode });
    }
  };

  add = function (obj, callback) {
    // 检验 obj.userName 用户名 isNull、alnum 自定义验证、isLength
    if (!zxutil.validatorUserName(obj.userName)) {
      errCode = _ERRS.validatorUserName;
      zxutil.writeLog(ctrlName, errCode, {}, obj);
      return callback({ success: errCode });
    }

    // 检验 obj.password 密码 isNull、isLength、用户名与密码相同
    if (!zxutil.validatorPassword(obj.password) ||
        obj.userName === obj.password) {

      errCode = _ERRS.validatorPassword;
      zxutil.writeLog(ctrlName, errCode, {}, obj);
      return callback({ success: errCode });
    }

    // 检验 obj.companyAbbr 公司简称 isNull、isLength
    if (!zxutil.validatorCompanyAbbr(obj.companyAbbr)) {
      errCode = _ERRS.validatorCompanyAbbr;
      zxutil.writeLog(ctrlName, errCode, {}, obj);
      return callback({ success: errCode });
    }

    // 检验 obj.name 姓名 isNull、chineseCharacter 自定义验证、isLength
    if (!zxutil.validatorName(obj.name)) {
      errCode = _ERRS.validatorName;
      zxutil.writeLog(ctrlName, errCode, {}, obj);
      return callback({ success: errCode });
    }

    // 检验 obj.phone 手机号 isNull、phoneNumber 自定义验证
    if (!zxutil.validatorPhoneNumber(obj.phone)) {
      errCode = _ERRS.validatorPhoneNumber;
      zxutil.writeLog(ctrlName, errCode, {}, obj);
      return callback({ success: errCode });
    }

    // 检验 用户 是否存在
    _addFindOne(obj, callback);
  };

  // update
  update = function (obj, who, callback) {
    // obj { _id, role?, name?, phone?, companyAbbr? }
    // who (id, cid, role, category)
    // 权限：
    //   1 role !== 99
    //   2 自己可以修改自己
    //     * 自己不能改自己的 role
    //   3 服务商可以修改地接社
    //   4 同一公司只能修改权限比自己小的用户, 且比自己小的权限
    User.findOne(
      { _id: obj._id },
      { company: 1, role: 1 }
    ).populate(
      'company',
      { category: 1 }
    ).exec(function (err, user) {
      var set = {};
      var isUpdate = false;

      if (err) {
        errCode = _ERRS.updateFindErr;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      // 超级管理员修改总负责人及以下
      // 服务商可以修改地接社
      // 自己可以修改自己
      // 同一公司只能修改权限比自己小的用户
      // typeof who.id 'string'
      // typeof who.cid 'string'
      // typeof user.company._id 'object'
      if (user && (who.role === 99 ||
          who.category > user.company.category ||
          who.id === user._id.toString() ||
          (who.cid === user.company._id.toString() && who.role > user.role))) {

        if (obj.role === 0 || obj.role === 10 ||
            obj.role === 20 || obj.role === 30) {
          // 超级管理员修改总负责人及以下
          // 服务商可以修改地接社 role
          // 同一公司下，自己不能改自己的 role，只能修改到比自己小的权限
          if (who.role === 99 ||
              who.category > user.company.category ||
              (who.cid === user.company._id.toString() &&
                who.id !== user._id.toString() &&
                who.role > obj.role)) {
            set.role = obj.role;
            isUpdate = true;

            // if (!isUpdate) { isUpdate = true; }
          }
        }

        if (obj.name && zxutil.validatorName(obj.name)) {
          set.name = obj.name;
          isUpdate = true;

          // if (!isUpdate) { isUpdate = true; }
        }

        if (obj.phone && zxutil.validatorPhoneNumber(Number(obj.phone))) {
          set.phone = Number(obj.phone);
          isUpdate = true;

          // if (!isUpdate) { isUpdate = true; }
        }

        if (obj.companyAbbr && zxutil.validatorCompanyAbbr(obj.companyAbbr)) {
          set.companyAbbr = obj.companyAbbr;
          isUpdate = true;

          // if (!isUpdate) { isUpdate = true; }
        }

        if (isUpdate) {
          _userUpdate(obj._id, set, callback);
        } else {
          errCode = _ERRS.updateFindNoTwo;
          zxutil.writeLog(ctrlName, errCode, {}, obj);
          return callback({ success: errCode });
        }
      } else {
        errCode = _ERRS.updateFindNoOne;
        zxutil.writeLog(ctrlName, errCode, {}, obj);
        return callback({ success: errCode });
      }
    });
  };

  // 更新用户最后登录时间
  changeUpdateAt = function (uid, callback) {
    User.update(
      { _id: uid },
      { $set: { 'meta.updateAt': Date.now() } },
      function (err, isOk) {
        if (err) {
          errCode = _ERRS.changeUpdateAtErr;
          zxutil.writeLog(ctrlName, errCode, err, uid);
        }

        // for testing
        if (callback) {
          if (isOk.nModified === 1 && isOk.n === 1) {
            callback({ success: 1 });
          } else if (isOk.ok === 1) {
            callback({ success: '2' });
          } else {
            callback({ success: errCode });
          }
        }
      }
    );
  };

  changeSendSetTime = function (obj, callback) {
    var id = obj._id;

    User.update(
      { _id: id },
      { $set: { sendSetTime: obj.sendSetTime } },
      function (err, isOk) {
        if (err) {
          errCode = _ERRS.CHANGESENDSETTIME_ERR;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({ success: errCode });
        }

        if (isOk.nModified === 1 && isOk.n === 1) {
          callback({ success: 1 });
        } else {
          errCode = _ERRS.CHANGESENDSETTIME_OK;
          zxutil.writeLog(ctrlName, errCode, {}, obj);
          return callback({ success: errCode });
        }
      }
    );
  };

  setDefaultFlag = function (obj, callback) {
    var id = obj._id;

    User.update(
      { _id: id },
      { $set: { defaultFlag: obj.defaultFlag } },
      function (err, isOk) {
        if (err) {
          errCode = _ERRS.SETDEFAULTFLAG_ERR;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({ success: errCode });
        }

        if (isOk.nModified === 1 && isOk.n === 1) {
          callback({ success: 1 });
        } else {
          errCode = _ERRS.SETDEFAULTFLAG_OK;
          zxutil.writeLog(ctrlName, errCode, {}, obj);
          return callback({ success: errCode });
        }
      }
    );
  };

  // 小帮手 查找所有地接社
  teamByCompanys = function (callback) {
    Company.find({ category: 20 }, { name: 1 }, function (err, companys) {
      if (err) {
        errCode = _ERRS.TEAM_BY_COMPANYS_ERR;
        zxutil.writeLog(ctrlName, errCode, {}, {});
        return callback([]);
      }

      callback(companys);
    });
  };

  return {
    _userFindOneBySearch:   _userFindOneBySearch,
    _comparePassword:       _comparePassword,
    _companyFindOneByName:  _companyFindOneByName,
    _userFindOneByUserName: _userFindOneByUserName,
    _newCompanySave:        _newCompanySave,
    _newUserSave:           _newUserSave,
    _userSave:              _userSave,
    _feesTempFind:          _feesTempFind,
    _checkCompanyname:      _checkCompanyname,
    _companyUpdate:         _companyUpdate,
    _companyFindOne:        _companyFindOne,
    _changeStatusUp:        _changeStatusUp,
    _resetPasswordSave:     _resetPasswordSave,
    _addFindOne:            _addFindOne,
    _userUpdate:            _userUpdate,

    login:                  login,
    initUser:               initUser,
    register:               register,
    changePassword:         changePassword,
    companylist:            companylist,
    companyUpdate:          companyUpdate,
    list:                   list,
    changeStatus:           changeStatus,
    resetPassword:          resetPassword,
    add:                    add,
    update:                 update,
    changeUpdateAt:         changeUpdateAt,
    changeSendSetTime:      changeSendSetTime,
    setDefaultFlag:         setDefaultFlag,
    teamByCompanys:         teamByCompanys,
  };
};

module.exports = createCtrl;
