/* jshint
   node: true, devel: true, maxstatements: 6, maxparams: 4,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * bp Schema 模块
 * @module app/schemas/bp
 */
'use strict';

// 收支
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var BpSchema = new Schema({
  company: ObjectId,
  bpType: Number,                      // -1 贷 , 1 借
  bpNum: { type: Number, default: 0 }, // 钱 (单位: 分)
  bpNote: String,                      // 备注
  bpDate: Date,                        // 日期
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

BpSchema.pre('save', function (next) {
  if (this.isNew) {
    this.meta.createAt = this.meta.updateAt = Date.now();
  } else {
    this.meta.updateAt = Date.now();
  }

  next();
});

BpSchema.statics = {
  findByCompany: function (companyId, cb) {
    return this.find({ company: companyId })
      .exec(cb);
  },

  findOneById: function (id, cb) {
    return this.findOne({ _id: id })
      .exec(cb);
  },
};

module.exports = BpSchema;
