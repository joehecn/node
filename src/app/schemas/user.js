/* jshint
   node: true, devel: true, maxstatements: 8,   maxparams: 4,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * user Schema 模块
 * @module app/schemas/user
 */
'use strict';

// 用户
var SALT_WORK_FACTOR = 10;
var bcrypt   = require('bcrypt-nodejs');
var mongoose = require('mongoose');
var Schema   = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var _bcryptGenSalt = function (bcrypt, SALT_WORK_FACTOR, _this, next) {
  bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
    bcrypt.hash(_this.password, salt, null, function (err, hash) {
      if (err) {
        return next(err);
      }

      _this.password = hash;
      next();
    });
  });
};

var UserSchema = new Schema({
  // 公司
  company: {
    type: ObjectId,
    ref: 'Company',
  },

  // 微信发送方账号（一个OpenID）
  FromUserName: {
    type: String,
    default: '',
  },

  // 用户名
  userName: {
    unique: true,
    type: String,
  },
  password: String,               // 密码
  name: String,                   // 可写 姓名
  phone: Number,                  // 可写 手机
  qq: Number,                     // QQ

  // 用户权限：
  //  0：禁止登录,
  // 10：操作员（15及以上指定）,
  // 15：部门负责人（20及以上指定）, 预留
  // 20：负责人（30及以上指定）,
  // 30：总负责人（公司注册,30只读）,
  // 99：超级管理员（第一个公司注册，99只读）
  role: {
    type: Number,
    default: 0,
  },

  // 用户状态
  // false：审核中（主账户注册时需要注册）
  // true：审核通过
  status: {
    type: Boolean,
    default: true,
  },
  companyAbbr: String,             // 可写 公司简称
  sendSetTime: {                   // 送机提前时间-20：地接社 秒
    type: Number,
    default: 120,
  },
  thSetStr: { // 导入表头：地接社 - 新版废弃 移到客户端 localStorage
    type: String,
    default: 'name|cardNum|phone|birthday|sex|' +
        'cardCategory|age|ageType|room|teamPersonNote',
  },
  defaultFlag: String,             // 默认导游旗
  meta: {
    createAt: {
      type: Date,
      default: Date.now(),
    },
    updateAt: {
      type: Date,
      default: Date.now(),
    },
  },
});

UserSchema.pre('save', function (next) {
  var _this = this;

  if (_this.isNew) {
    _this.meta.createAt = _this.meta.updateAt = Date.now();
  } else {
    _this.meta.updateAt = Date.now();
  }

  _bcryptGenSalt(bcrypt, SALT_WORK_FACTOR, _this, next);
});

// 实例方法
UserSchema.methods = {
  comparePassword: function (_password, next) {
    bcrypt.compare(_password, this.password, function (err, isMatch) {
      if (err) {
        return next(err);
      }

      next(null, isMatch);
    });
  },
};

// // 静态方法
// UserSchema.statics = {
//   _bcryptGenSalt: _bcryptGenSalt,

//   // findOneById: function (id, cb) {
//   //   return this.findOne({ _id: id })
//   //     .exec(cb);
//   // },

//   // findByCompany: function (companyId, cb) {
//   //   return this.find({ company: companyId })
//   //     .exec(cb);
//   // },

//   findOneByUserName: function (userName, cb) {
//     return this.findOne({ userName: userName })
//       .exec(cb);
//   },
// };

module.exports = UserSchema;
