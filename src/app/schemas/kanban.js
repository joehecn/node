/* jshint
   node: true, devel: true, maxstatements: 6, maxparams: 4,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * kanban Schema 模块
 * @module app/schemas/kanban
 */
'use strict';

// 看板
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var KanbanSchema = new Schema({
    sm: {
      type: ObjectId,
      ref: 'Sm',
    },

    // serverMan: String,             // 现场负责人
    djpState: String,              // 登机牌状态 未办理/已办理/部分已领/全部OK
    flightState: String,           // 航班状态   ''/计划/延误/取消/起飞/到达
    flyingStatusClass: String,     // 航班动态样式
    smAgencyFundState: String,     // 代收状态   未收/已收
    smPaymentState: String,        // 代付状态   未付/已付
    // smStatus: Number,    // 状态 -1  0 初始化空单 1 待确认 2 已确认 3 已完成 4 已结清
    serverState: String,    // 服务状态   未完成/完成 - 新版弃用 改 2 已确认 - 3 已完成
    smSetPlace: String,            // 门 集合地点 2 6 0
    djpNote: String,               // 登机牌备注
    serverNote: String,            // 服务备注
    flight_gai: {
      flightDate_old: Date,        // 日期
      flightNum_old: String,       // 航班号
      flightStartCity_old: String, // 始发城市 深圳 1 送
      flightEndCity_old: String,   // 抵达城市 深圳 2 接
      flightStartTime_old: Date,   // 始发时间
      flightEndTime_old: Date,     // 抵达时间
    },
    historys: [],
    news: [],
    wxServerState: Boolean, // 新版新增字段，微信通知专线已完成
  });

module.exports = KanbanSchema;
