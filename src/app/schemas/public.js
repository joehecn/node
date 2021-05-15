/* jshint
   node: true, devel: true, maxstatements: 6, maxparams: 4,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * public Schema 模块
 * @module app/schemas/public
 */
'use strict';

// 导游旗
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PublicSchema = new Schema({
  // 微信 access_token
  name: String,
});

module.exports = PublicSchema;
