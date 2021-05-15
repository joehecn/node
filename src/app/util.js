/* jshint
   node:  true, devel:  true, maxparams: 5, maxstatements: 11,
   maxerr: 50, nomen: true, regexp: true, maxdepth: 4
 */

/**
 * 公共函数模块
 * @module app/util
 * require: logpath
 */
'use strict';
var validator = require('validator');
var fs = require('fs');

var _logPath = require('../logpath')() + '/log/';

var _provinceCity = {
  '广东': {
    '深圳': 'sz',
    '广州': 'gz',
    '珠海': 'zh',
  },
  '浙江': {
    '杭州': 'hz',
  },
};

// {
//   '深圳': 'sz',
//   ...
// }
var _cityDb = (function (_provinceCity) {
  var obj = {};
  var key1;
  var cityObj;
  var key2;

  for (key1 in _provinceCity) {
    if (_provinceCity.hasOwnProperty(key1)) {
      cityObj = _provinceCity[key1];

      for (key2 in cityObj) {
        if (cityObj.hasOwnProperty(key2)) {
          obj[key2] = cityObj[key2];
        }
      }
    }
  }

  return obj;
})(_provinceCity);

// {
//   'sz': '深圳',
//   ...
// }
var _dbCity = (function (_cityDb) {
  var obj = {};
  var key;

  for (key in _cityDb) {
    if (_cityDb.hasOwnProperty(key)) {
      obj[_cityDb[key]] = key;
    }
  }

  return obj;
})(_cityDb);

/**
 * 字母或数字组合
 *
 * @alias module:app/util.validatorAlNum
 * @param {String} str - 字符串
 * @returns {Boolean}
 */
var _validatorAlNum = function (str) {
  return /^[a-zA-Z0-9]*$/.test(str);
};

/**
 * 必须是中文字符
 *
 * @param {String} str - 字符串
 * @returns {Boolean}
 */
var _validatorChineseCharacter = function (str) {
  return /^[\u4E00-\uFA29]*$/.test(str);
};

exports.validatorAlNum = _validatorAlNum;

exports.validatorChineseCharacter = _validatorChineseCharacter;

/**
 * 首字母大写
 *
 * @param {String} str - 字符串
 * @returns {Boolean}
 */
exports.validatorReplaceFirstUpper = function (str) {
  return str.replace(/(\w)/, function (v) {
    return v.toUpperCase();
  });
};

/**
 * 请输入正确的11位手机号
 *
 * @param {Number} num - 数字
 * @returns {Boolean}
 */
exports.validatorPhoneNumber = function (phone) {
  return !!(phone &&
      typeof phone === 'number' &&
      /^1\d{10}$/.test(phone));
};

/**
 * 用户名不合法: 检验 userObj.userName 用户名 isNull、alnum 自定义验证、isLength
 *
 * @param {String} userName - 用户名
 * @returns {Boolean}
 */
exports.validatorUserName = function (userName) {
  return !!(userName &&
      typeof userName === 'string' &&
      _validatorAlNum(userName) &&
      validator.isLength(userName, 2, 15));
};

/**
 * 姓名不合法: 检验 userObj.name 姓名 isNull、chineseCharacter 自定义验证、isLength
 *
 * @param {String} name - 姓名
 * @returns {Boolean}
 */
exports.validatorName = function (name) {
  return !!(name &&
      typeof name === 'string' &&
      validator.isLength(name, 2, 4) &&
      _validatorChineseCharacter(name));
};

/**
 * 密码不合法: 检验 userObj.password 密码 isLength
 *
 * @param {String} password - 密码
 * @returns {Boolean}
 */
exports.validatorPassword = function (password) {
  return !!(password &&
      typeof password === 'string' &&
      validator.isLength(password, 6, 20));
};

/**
 * 公司名不合法: 检验 companyObj.name 公司名称 isNull、isLength
 *
 * @param {String} companyName - 公司名
 * @returns {Boolean}
 */
exports.validatorCompanyName = function (companyName) {
  return !!(companyName &&
        typeof companyName === 'string' &&
        validator.isLength(companyName, 2, 15));
};

/**
 * 公司简称不合法: 检验 userObj.companyAbbr 公司简称 isNull、isLength
 *
 * @param {String} companyAbbr - 公司简称
 * @returns {Boolean}
 */
exports.validatorCompanyAbbr = function (companyAbbr) {
  return !!(companyAbbr &&
        typeof companyAbbr === 'string' &&
        validator.isLength(companyAbbr, 2, 8));
};

exports.writeLog = function (ctrlName, errCode, err, obj) {
  var errorLogfile =
      fs.createWriteStream(_logPath + ctrlName + '.log', { flags: 'a' });
  var meta = '---------------------------------\n' +
      '[' + new Date() + '] write db error ' + errCode + ':\n';

  errorLogfile.write(meta +
      JSON.stringify(err) +
      '\nobj:' + JSON.stringify(obj) + '\n\n');
};

exports.PROVINCE_CITY = _provinceCity;
exports.CITY_DB = _cityDb;
exports.DB_CITY = _dbCity;
