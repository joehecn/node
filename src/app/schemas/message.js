/* jshint
   node: true, devel: true, maxstatements: 6, maxparams: 4,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * message Schema 模块
 * @module app/schemas/message
 */
'use strict';

// 消息
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var MessageSchema = new Schema({
  // 通知单 id
  sm: {
    type: ObjectId,
    ref: 'Sm',
  },
  smNum:String,         // 通知单号
  fromUserName:String,  // 发送者用户名
  fromName: String,     // 发送者姓名
  // status: Number,    // 0 对方有人未确认 1 对方所有人已确认 2 失效 （为将来预留）
  createAt: Date,
  toNames: [],
  toUsers: [
    {
      userName: String, // 接收者用户名
      status: Boolean,  // false 未读 true 已读
      trueAt: Date,     // 确认时间
    },
  ],

  action: String,       // 动作
  talk: String,         // 说明
});

module.exports = MessageSchema;
