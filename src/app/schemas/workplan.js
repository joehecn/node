/* jshint
   node: true, devel: true, maxstatements: 8,   maxparams: 4,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * workplan Schema 模块
 * @module app/schemas/workplan
 */
'use strict';

// 排班表
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var WorkplanSchema = new Schema({
  workplanType: String,
  name: String,
  price: Number,
  workplanDate: Date,
});

module.exports = WorkplanSchema;
