/* jshint
   node: true, devel: true, maxstatements: 6, maxparams: 4,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * idcardsm Schema 模块
 * @module app/schemas/idcardsm
 */
'use strict';

// 身份证检测记录 送机单
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var IdcardSmSchema = new Schema({
  company: ObjectId,
  user: String,     // 小帮手
  city: String,     // 深圳
  sm: {
    type: ObjectId,
    ref: 'Sm',
  },
  name: String,    // 姓名
  cardNum: String, // 身份证
  message: String, // 一致/不一致/库中无此号
  createAt: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = IdcardSmSchema;
