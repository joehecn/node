/* jshint
   node: true, devel: true, maxstatements: 6, maxparams: 4,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * company Schema 模块
 * @module app/schemas/company
 * require: null
 */
'use strict';

// 公司
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var CompanySchema = new Schema({
  feestemp: String,    // 收费模板 name

  // 公司名称
  name: {
    unique: true,
    type: String,
  },

  // 公司类型：(10：组团社 占位)，20：地接社，30：服务商
  category: {
    type: Number,
    default: 20,
  },
  tel: String,         // 电话
  fax: String,         // 传真
  province: String,    // 省
  city: String,        // 市
  town: String,        // 区 * 已弃用
  address: String,     // 地址
  bankCard: String,    // 银行账户
  isidcard: {
    type: Boolean,
    default: false,
  },                   // 是否需要自动验证身份证
  idcardfee: {
    type: Number,
    default: 0,
  },                   // 验证费单价
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

CompanySchema.pre('save', function (next) {
  if (this.isNew) {
    this.meta.createAt = this.meta.updateAt = Date.now();
  } else {
    this.meta.updateAt = Date.now();
  }

  next();
});

// CompanySchema.statics = {
//   findOneById: function (id, cb) {
//     return this
//       .findOne({ _id: id })
//       .exec(cb);
//   },

//   findOneByName: function (name, cb) {
//     return this
//       .findOne({ name: name })
//       .exec(cb);
//   },
// };

module.exports = CompanySchema;
