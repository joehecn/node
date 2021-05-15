/* jshint
   node: true, devel: true, maxstatements: 6, maxparams: 4,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * dengjipai Schema 模块
 * @module app/schemas/dengjipai
 */
'use strict';

// 登机牌用户
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var DengjipaiSchema = new Schema({
  name: {
    unique: true,
    type: String,
  },     // 用户
  password: String, // 口令
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

DengjipaiSchema.pre('save', function (next) {
  if (this.isNew) {
    this.meta.createAt = this.meta.updateAt = Date.now();
  } else {
    this.meta.updateAt = Date.now();
  }

  next();
});

module.exports = DengjipaiSchema;
