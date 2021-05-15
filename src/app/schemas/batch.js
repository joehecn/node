/* jshint
   node: true, devel: true, maxstatements: 6, maxparams: 4,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * batch Schema 模块
 * @module app/schemas/batch
 */
'use strict';

// 组
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var BatchSchema = new Schema({
  user: ObjectId,
  team: {
    type: ObjectId,
    ref: 'Team',
  },
  departureTraffic: {
    _id: {
      type: ObjectId,
      ref: 'Sm',
    },
    isSm: { type: Boolean, default: false }, // 0 不送不接 1 送 2 接
  },
  returnTraffic: {
    _id: {
      type: ObjectId,
      ref: 'Sm',
    },
    isSm: { type: Boolean, default: false }, // 0 不送不接 1 送 2 接
  },
  batchNum: Number,

  guest: String,            // 收客单位 （服务商只读）（不用反馈）
  teamBatchNote: String,    // 团队组备注 （对服务商不可见）（不用反馈）

  sendAgencyFund: { type: Number, default: 0 },     // 送机代收款项 -
  sendAgencyFund_y: { type: Number, default: 0 },   // 送机已收款项 -
  sendPayment: { type: Number, default: 0 },        // 送机代付款项 +
  sendPayment_y: { type: Number, default: 0 },      // 送机已付款项 +
  sendBatchNote: String,    // 送机组备注

  meetAgencyFund: { type: Number, default: 0 },     // 接机代收款项 -
  meetAgencyFund_y: { type: Number, default: 0 },   // 接机已收款项 -
  meetPayment: { type: Number, default: 0 },        // 接机代付款项 +
  meetPayment_y: { type: Number, default: 0 },      // 接机已付款项 +
  meetBatchNote: String,    // 接机组备注

  persons: [
    {
      name: String,             // 姓名
      cardNum: String,          // 证件号码
      phone: String,            // 手机
      birthday: String,         // 出生日期 （不用反馈）
      sex: String,              // 性别 （不用反馈）
      cardCategory: String,     // 证件类型 （不用反馈）

      age: Number,              // 年龄 （不用反馈）
      ageType: String,          // 年龄段 （服务商只读）（不用反馈）
      room: String,             // 分房 （服务商不需要）

      teamPersonNote: String,   // 单人备注 （对服务商不可见）（不用反馈）
      sendPersonNote: String,   // 送机备注
      meetPersonNote: String,   // 接机备注

      isSend: { type: Boolean, default: true },          // 是否送机（对服务商不可见）筛选
      //isInsurance: { type: Boolean, default: false },    // 送机保险
      isMeet: { type: Boolean, default: true },          // 是否接机（对服务商不可见）
    },
  ],

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

BatchSchema.pre('save', function (next) {
  if (this.isNew) {
    this.meta.createAt = this.meta.updateAt = Date.now();
  } else {
    this.meta.updateAt = Date.now();
  }

  next();
});

BatchSchema.statics = {
  findOneById: function (id, cb) {
    return this.findOne({ _id: id })
      .exec(cb);
  },
};

module.exports = BatchSchema;
