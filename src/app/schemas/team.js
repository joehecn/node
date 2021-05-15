/* jshint
   node:  true, devel:  true, maxstatements: 6, maxparams: 4,
   maxerr: 50, nomen: true, regexp: true
 */

/**
 * team Schema 模块
 * @module app/schemas/team
 */
'use strict';

// 团队单
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var TeamSchema = new Schema({
  user: ObjectId,
  company: ObjectId,
  companyAbbr: String,       // 公司简称（服务商只读）（不用反馈）
  // departmentName: String,    // 部门 （服务商只读）（不用反馈）
  name: String,              // 制单人 （服务商只读）（不用反馈）
  isOpen: Boolean, // 是否公有，开放给同部门共用 (false 私有) (true 公有)

  teamNum: String,           // 团号 （服务商只读）（不用反馈）
  lineName: String,          // 线路名 （服务商只读）（不用反馈）
  operator: String,          // 操作人（列表中显示）（服务商只读）要反馈！
  teamType: String,          // 类型 包团 / 散拼
  planNumber: Number,        // 计划人数 （对服务商不可见）（不用反馈）
  realNumber: Number,        // 名单人数
  teamNote: String,          // 团队注意事项 （对服务商不可见）（不用反馈）

  smFlag: String,            // 出发地旗号
  sendDriver: String,        // 去程送机司机
  meetDriver: String,         // 回程接机司机

  sendDestinationFlag: String,     // 地接旗号 送机
  guide: String,                   // 地接人员 送机

  // sendDestinationDriver: String, // 地接司机

  departureDate: Date,
  departureTraffics: [
    {
      type: ObjectId,
      ref: 'Sm',
    },
  ],
  returnDate: Date,
  returnTraffics: [
    {
      type: ObjectId,
      ref: 'Sm',
    },
  ],
  users: [
    {
      _id: ObjectId,
      batchs: [
        {
          type: ObjectId,
          ref: 'Batch',
        },
      ],
    },
  ],
  isDownload: { type: Boolean, default: false }, // 是否已下载 （对服务商不可见）（不用反馈）
  lock: {
    isLocked: { type: Boolean, default: false },
    page: String,
    id: String,
    user_id: String,
    editName: String,
    beginTime: Date,
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

TeamSchema.pre('save', function (next) {
  if (this.isNew) {
    this.meta.createAt = this.meta.updateAt = Date.now();
  } else {
    this.meta.updateAt = Date.now();
  }

  next();
});

TeamSchema.statics = {
  findByUser: function (userId, cb) {
    return this.find({ user: userId })
      .exec(cb);
  },

  findOneById: function (id, cb) {
    return this.findOne({ _id: id })
      .exec(cb);
  },
};

module.exports = TeamSchema;
