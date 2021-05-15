/* jshint
   node: true, devel: true, maxstatements: 6, maxparams: 4,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * idcard Schema 模块
 * @module app/schemas/idcard
 */
'use strict';

// 身份证姓名一致记录
// cardNum 索引
// 查找 cardNum
// 如果找到了 返回 姓名一致不一致
// 如果没找到 向收费服务器继续请求
// 将收费服务器一致的条目入此库，离弦之箭
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var IdcardSchema = new Schema({
  cardNum: {       // 身份证
    unique: true,
    type: String,
  },
  name: String,    // 姓名
});

module.exports = IdcardSchema;
