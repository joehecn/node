/* jshint
   node: true, devel: true, maxstatements: 6, maxparams: 4,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * serverman Schema 模块
 * @module app/schemas/serverman
 */
'use strict';

// 现场操作
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var ServermanSchema = new Schema({
  company: ObjectId,
  name: String,      // 姓名 同一个company姓名不能重复
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

ServermanSchema.pre('save', function (next) {
  if (this.isNew) {
    this.meta.createAt = this.meta.updateAt = Date.now();
  } else {
    this.meta.updateAt = Date.now();
  }

  next();
});

ServermanSchema.statics = {
  findByCompany: function (companyId, cb) {
    return this.find({ company: companyId }).exec(cb);
  },

  findOneById: function (id, cb) {
    return this.findOne({ _id: id }).exec(cb);
  },
};

module.exports = ServermanSchema;
