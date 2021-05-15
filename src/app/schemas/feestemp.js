/* jshint
   node:  true, devel:  true, maxstatements: 6, maxparams: 4,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * feestemp Schema 模块
 * @module app/schemas/feestemp
 */
'use strict';

// 服务费基础模板
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var FeesTempSchema = new Schema({
  // 基本服务费 : 基本起步价格basStepPrice 最高价格basMaxPrice
  // --取值公式 : Min(basStepPrice * 人数, basMaxPrice)
  //
  // 加班费     : 开始时间addStartTime 截止时间addEndTime 收费addPrice
  // --取值公式 : ( addStartTime < 集合时间smSetTime < addEndTime ) ? addPrice : 0
  //
  // 人数补贴   : 人数下限putPersonNum 超出下限部分人数的收费/人 putPrice
  // --取值公式 : (人数 - putPersonNum > 0) ? (人数 - putPersonNum) * putPrice : 0
  name: {
    unique: true,
    type: String,
  },

  t1: {
    // 机场内送机 散拼
    //smType1      : { type: Number, default: 1 },      类型1: 1 送   2 接
    //smType2      : { type: Number, default: 1 },      类型2: 1 内   2 外
    //teamType     : { type: String, default: '散拼' }, 类型 包团 / 散拼
    // 基本服务费 : 基本起步价格basStepPrice 最高价格basMaxPrice
    basStepPrice: { type: Number, default: 1000 },
    basMaxPrice:  { type: Number, default: 3000 },

    // 加班费     : 开始时间addStartTime 截止时间addEndTime 收费addPrice
    addStartTime: { type: String, default: '00:00' },
    addEndTime:   { type: String, default: '08:00' },
    addPrice:     { type: Number, default: 1000 },

    // 人数补贴   : 人数下限putPersonNum 超出下限部分人数的收费/人 putPrice
    putPersonNum: { type: Number, default: 50 },
    putPrice:     { type: Number, default: 0 },
  },

  t2: {
    // 机场内送机 包团
    //smType1      : { type: Number, default: 1 },      类型1: 1 送   2 接
    //smType2      : { type: Number, default: 1 },      类型2: 1 内   2 外
    //teamType     : { type: String, default: '包团' }, 类型 包团 / 散拼
    // 基本服务费 : 基本起步价格basStepPrice 最高价格basMaxPrice
    basStepPrice: { type: Number, default: 5000 },
    basMaxPrice:  { type: Number, default: 5000 },

    // 加班费     : 开始时间addStartTime 截止时间addEndTime 收费addPrice
    addStartTime: { type: String, default: '00:00' },
    addEndTime:   { type: String, default: '08:00' },
    addPrice:     { type: Number, default: 1000 },

    // 人数补贴   : 人数下限putPersonNum 超出下限部分人数的收费/人 putPrice
    putPersonNum: { type: Number, default: 50 },
    putPrice:     { type: Number, default: 100 },
  },

  t3: {
    // 机场内接机 散拼
    //smType1      : { type: Number, default: 2 },      类型1: 1 送   2 接
    //smType2      : { type: Number, default: 1 },      类型2: 1 内   2 外
    //teamType     : { type: String, default: '散拼' }, 类型 包团 / 散拼
    // 基本服务费 : 基本起步价格basStepPrice 最高价格basMaxPrice
    basStepPrice: { type: Number, default: 5000 },
    basMaxPrice:  { type: Number, default: 5000 },

    // 加班费     : 开始时间addStartTime 截止时间addEndTime 收费addPrice
    addStartTime: { type: String, default: '21:00' },
    addEndTime:   { type: String, default: '08:00' },
    addPrice:     { type: Number, default: 3000 },

    // 人数补贴   : 人数下限putPersonNum 超出下限部分人数的收费/人 putPrice
    putPersonNum: { type: Number, default: 50 },
    putPrice:     { type: Number, default: 100 },
  },

  t4: {
    // 机场内接机 包团
    //smType1      : { type: Number, default: 2 },      类型1: 1 送   2 接
    //smType2      : { type: Number, default: 1 },      类型2: 1 内   2 外
    //teamType     : { type: String, default: '包团' }, 类型 包团 / 散拼
    // 基本服务费 : 基本起步价格basStepPrice 最高价格basMaxPrice
    basStepPrice: { type: Number, default: 5000 },
    basMaxPrice:  { type: Number, default: 5000 },

    // 加班费     : 开始时间addStartTime 截止时间addEndTime 收费addPrice
    addStartTime: { type: String, default: '21:00' },
    addEndTime:   { type: String, default: '08:00' },
    addPrice:     { type: Number, default: 3000 },

    // 人数补贴   : 人数下限putPersonNum 超出下限部分人数的收费/人 putPrice
    putPersonNum: { type: Number, default: 50 },
    putPrice:     { type: Number, default: 100 },
  },

  t5: {
    // 机场外送机 散拼
    //smType1      : { type: Number, default: 1 },      类型1: 1 送   2 接
    //smType2      : { type: Number, default: 2 },      类型2: 1 内   2 外
    //teamType     : { type: String, default: '散拼' }, 类型 包团 / 散拼
    // 基本服务费 : 基本起步价格basStepPrice 最高价格basMaxPrice
    basStepPrice: { type: Number, default: 15000 },
    basMaxPrice:  { type: Number, default: 15000 },

    // 加班费     : 开始时间addStartTime 截止时间addEndTime 收费addPrice
    addStartTime: { type: String, default: '00:00' },
    addEndTime:   { type: String, default: '08:00' },
    addPrice:     { type: Number, default: 5000 },

    // 人数补贴   : 人数下限putPersonNum 超出下限部分人数的收费/人 putPrice
    putPersonNum: { type: Number, default: 50 },
    putPrice:     { type: Number, default: 0 },
  },

  t6: {
    // 机场外送机 包团
    //smType1      : { type: Number, default: 1 },      类型1: 1 送   2 接
    //smType2      : { type: Number, default: 2 },      类型2: 1 内   2 外
    //teamType     : { type: String, default: '包团' }, 类型 包团 / 散拼
    // 基本服务费 : 基本起步价格basStepPrice 最高价格basMaxPrice
    basStepPrice: { type: Number, default: 15000 },
    basMaxPrice:  { type: Number, default: 15000 },

    // 加班费     : 开始时间addStartTime 截止时间addEndTime 收费addPrice
    addStartTime: { type: String, default: '00:00' },
    addEndTime:   { type: String, default: '08:00' },
    addPrice:     { type: Number, default: 5000 },

    // 人数补贴   : 人数下限putPersonNum 超出下限部分人数的收费/人 putPrice
    putPersonNum: { type: Number, default: 50 },
    putPrice:     { type: Number, default: 100 },
  },

  t7: {
    // 机场外接机 散拼
    //smType1      : { type: Number, default: 2 },      类型1: 1 送   2 接
    //smType2      : { type: Number, default: 2 },      类型2: 1 内   2 外
    //teamType     : { type: String, default: '散拼' }, 类型 包团 / 散拼
    // 基本服务费 : 基本起步价格basStepPrice 最高价格basMaxPrice
    basStepPrice: { type: Number, default: 15000 },
    basMaxPrice:  { type: Number, default: 15000 },

    // 加班费     : 开始时间addStartTime 截止时间addEndTime 收费addPrice
    addStartTime: { type: String, default: '20:00' },
    addEndTime:   { type: String, default: '08:00' },
    addPrice:     { type: Number, default: 5000 },

    // 人数补贴   : 人数下限putPersonNum 超出下限部分人数的收费/人 putPrice
    putPersonNum: { type: Number, default: 50 },
    putPrice:     { type: Number, default: 100 },
  },

  t8: {
    // 机场外接机 包团
    //smType1      : { type: Number, default: 2 },      类型1: 1 送   2 接
    //smType2      : { type: Number, default: 2 },      类型2: 1 内   2 外
    //teamType     : { type: String, default: '包团' }, 类型 包团 / 散拼
    // 基本服务费 : 基本起步价格basStepPrice 最高价格basMaxPrice
    basStepPrice: { type: Number, default: 15000 },
    basMaxPrice:  { type: Number, default: 5000 },

    // 加班费     : 开始时间addStartTime 截止时间addEndTime 收费addPrice
    addStartTime: { type: String, default: '20:00' },
    addEndTime:   { type: String, default: '08:00' },
    addPrice:     { type: Number, default: 5000 },

    // 人数补贴   : 人数下限putPersonNum 超出下限部分人数的收费/人 putPrice
    putPersonNum: { type: Number, default: 50 },
    putPrice:     { type: Number, default: 100 },
  },

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

FeesTempSchema.pre('save', function (next) {
  if (this.isNew) {
    this.meta.createAt = this.meta.updateAt = Date.now();
  } else {
    this.meta.updateAt = Date.now();
  }

  next();
});

// FeesTempSchema.statics = {
//   findOneById: function (id, cb) {
//     return this.findOne({ _id: id })
//       .exec(cb);
//   },
// };

module.exports = FeesTempSchema;
