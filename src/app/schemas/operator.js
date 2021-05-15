/* jshint
   node: true, devel: true, maxstatements: 6, maxparams: 4,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * operator Schema 模块
 * @module app/schemas/operator
 */
'use strict';

// 团队操作人
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var OperatorSchema = new Schema({
  company: ObjectId,
  companyAbbr: String,   // 公司简称
  name: String,         // 姓名
  phone: Number,        // 手机

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

OperatorSchema.pre('save', function (next) {
  if (this.isNew) {
    this.meta.createAt = this.meta.updateAt = Date.now();
  } else {
    this.meta.updateAt = Date.now();
  }

  next();
});

module.exports = OperatorSchema;
