/* jshint
   node: true, devel: true, maxstatements: 6, maxparams: 4,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * pingan Schema 模块
 * @module app/schemas/pingan
 */
'use strict';

// 保险卡
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var PinganSchema = new Schema({
  pinganCardNum: {            // 1 保险卡号
    unique: true,
    type: String,
  },
  password: String,           // 1 密码
  serverMan: String,          // 1 领用人
  notes: String,              // 1 备注
  sm: {
    type: ObjectId,
    ref: 'Sm',
  },

  person: ObjectId,
  name: String,         // 1 姓名
  phone: String,        // 1 手机
  cardCategory: String, // 证件类型
  cardNum: String,      // 1 证件号码
  birthday: String,     // 出生日期
  sex: String,          // 性别

  liveTime: Date,       // 1 激活时间

  // 1 问题卡（该卡已经被使用/卡号不存在） 2 未开卡 3 已开卡
  isInsurance: { type: Number, default: 2 },

  // 老平安卡批量添加此字段
  cardType: { type: Number, default: 1 }, // * 新版添加 1 平安 2 人寿
  // canUse: { type: Boolean, default: true },  // 能否使用
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

PinganSchema.pre('save', function (next) {
  if (this.isNew) {
    this.meta.createAt = this.meta.updateAt = Date.now();
  } else {
    this.meta.updateAt = Date.now();
  }

  next();
});

module.exports = PinganSchema;
