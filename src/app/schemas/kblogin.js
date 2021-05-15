/* jshint
   node: true, devel: true, maxstatements: 6, maxparams: 4,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * kblogin Schema 模块
 * @module app/schemas/kblogin
 */
'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var KbloginSchema = new Schema({
  userName: String,
  name: String,
  CITY: String,
  dbName: String,
  key: String,
});

module.exports = KbloginSchema;
