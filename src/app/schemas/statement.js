/* jshint
   node:  true, devel:  true, maxstatements: 6, maxparams: 4,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * statement Schema 模块
 * @module app/schemas/statement
 */
'use strict';

// 对账单
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var StatementSchema = new Schema({
  company: ObjectId,
  month: Date,                         // 年月
  smArr: [],                           // 团队服务单费用表
  lastMonthBalance: Number,            // 上月余额
  smAgencyFund_y_sum: Number,          // 代收款(已收)合计
  smPayment_y_sum: Number,             // 代付款(已付)合计
  fees_sum: Number,                    // 服务费合计
  idcardsmfees_sum: Number,            // 收费验证次数合计
  idcardsmfees_unit: Number,           // 收费验证单价（元 * 1000）
  carFees_sum: Number,                 // 交通费合计
  bpArr: [],                           // 往来账明细
  bpNum_sum: Number,                   // 往来合计
  thisMonthBalance: Number,            // 本月余额
  isLock: { type: Boolean, default: false },
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

StatementSchema.pre('save', function (next) {
  if (this.isNew) {
    this.meta.createAt = this.meta.updateAt = Date.now();
  } else {
    this.meta.updateAt = Date.now();
  }

  next();
});

module.exports = StatementSchema;
