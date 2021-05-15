/* jshint
   node:  true, devel:  true, maxstatements: 6, maxparams: 4,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * sm Schema 模块
 * @module app/schemas/sm
 */
'use strict';

// 服务单
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var SmSchema = new Schema({
  user: ObjectId,
  company: ObjectId,
  operator: String,
  companyAbbr: String,           // 公司简称（服务商只读）（不用反馈）
  //departmentName: String,      // 部门 （服务商只读）（不用反馈）
  name: String,                  // 制单人 （服务商只读）（不用反馈）
  isOpen: Boolean,               // 是否公有，开放给同部门共用 (false 私有) (true 公有)
  team: {
    type: ObjectId,
    ref: 'Team',
  },

  // 11 1送1内 机场内送 || 12 1送2外 机场外送 || 21 2接1内 机场内接 || 22  2接2外 机场外接
  // smType1: Number, // departureTraffics returnTraffics   1送 2接
  smType2: Number,             // 类型2：1 内   2 外
  flight: {
    flightDate: {
      type: Date,
      default: null,
    },                         // 日期
    flightNum: String,         // 航班号
    flightStartCity: String,   // 始发城市 深圳 1 送
    //flightMiddleCity: String,  // 经停城市
    flightEndCity: String,     // 抵达城市 深圳 2 接
    flightStartTime: {
      type: Date,
      default: null,
    },                         // 始发时间
    flightEndTime: {
      type: Date,
      default: null,
    },                         // 抵达时间
  },
  smRealNumber: Number,             // 名单人数
  smTimeSpace: Number,              // 集合时间提前量 smSetTime
  smNote: String,                   // 注意事项
  // smServer: String,              // 送/接机人员
  // smSetPlace: String,            // 集合地点（接机为固定值：深圳机场到达厅接机口(肯德基门口)）
  isDownload: { type: Boolean, default: false },   // 是否已导出
  isSVDownload: { type: Boolean, default: false }, // 服务商是否已下载（不用反馈）
  smStatus: Number,    // 状态 -1  0 初始化空单 1 待确认 2 已确认 3 已完成 4 已结清
  phoneMsgStatus: { type: Number, default: 0 },   // 集合短信 状态 0 待发送  1 已发送 2 不用发
  // smFlag: String,                // 旗号
  // smDriver: String,              // 司机
  // sendDestinationFlag: String,   // 送机目的地旗号
  smAgencyFund: { type: Number, default: 0 },   // 代收款项 -
  smAgencyFund_y: { type: Number, default: 0 }, // 已收款项 -
  smPayment: { type: Number, default: 0 },      // 代付款项 +
  smPayment_y: { type: Number, default: 0 },    // 已付款项 +

  fees: { type: Number, default: 0 },           // 费用
  addFees: { type: Number, default: 0 },        // 调价 +-
  addFeesNote: String,
  idcardsmfees: { type: Number, default: 0 },   // 收费验证次数
  carFees: { type: Number, default: 0 },        // 交通费
  serverMan: String,                            // 现场
  insurance: { type: Number, default: 0 },      // 保险份数
  satisfaction: { type: Number, default: 0 },   // 服务满意度（0 1 2 3 4 5星）
  satisfactionNote: String,
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

SmSchema.pre('save', function (next) {
  if (this.isNew) {
    this.meta.createAt = this.meta.updateAt = Date.now();
  } else {
    this.meta.updateAt = Date.now();
  }

  next();
});

SmSchema.statics = {
  findOneById: function (id, cb) {
    return this.findOne({ _id: id })
      .exec(cb);
  },
};

module.exports = SmSchema;
