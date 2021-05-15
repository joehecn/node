/* jshint
   node: true,        devel: true,
   maxstatements: 44, maxparams: 7, maxdepth: 2,
   maxerr: 50,        nomen: true,  regexp: true
 */

/**
 * bp controller 模块
 * @module app/controllers/bp
 */
'use strict';

var createCtrl = function (dbHost, dbName) {
  // 21
  var _ERRS = {
    // xx9 系统级错误
    LIST_ERR: '21902',          // 此错误不抛到客户端
    LIST_COUNT_ERR: '21904',    // 此错误不抛到客户端
    LIST_FIND_ERR: '21906',     // 此错误不抛到客户端
    ADD_ERR: '21908',
    UPDATE_ERR: '21910',
    UPDATE_SAVE_ERR: '21912',
    REMOVE_ERR: '21914',
    GET_ONE_COMPANY_BILL_LIST_ERR_1: '21916', // 此错误不抛到客户端
    GET_ONE_COMPANY_BILL_LIST_ERR_2: '21918', // 此错误不抛到客户端
    GET_BILL_BY_COMPANYS_LIST_ERR_1: '21920', // 此错误不抛到客户端
    GET_BILL_BY_COMPANYS_LIST_ERR_2: '21922', // 此错误不抛到客户端

    // xx6 黑客
    UPDATE_FIND_ERROR: '21602',
    REMOVE_ERROR: '21604',
    GET_ONE_COMPANY_BILL_LIST_ERROR: '21606',

    // xx0 一般错误
  };
  var ctrlName  = 'bp';
  var moment    = require('moment');
  var _         = require('underscore');
  var getModel  = require('../model');
  var zxutil    = require('../zxutil');
  var Sm        = getModel(dbHost, dbName, 'sm');
  var Bp        = getModel(dbHost, dbName, 'bp');
  var Statement = getModel(dbHost, dbName, 'statement');
  var Company   = getModel(dbHost, 'auth', 'company');
  var errCode;

  // private methods
  var _unique;
  var _listFind;

  // public methods
  var list;
  var add;
  var update;
  var remove;
  var getbillsnow;
  var billsitemisedlist;
  var getbillsitemised;
  var getstatement;
  var statementadd;
  var statementremove;
  var statementlock;
  var getbillstotal;
  var getBillByCompanysList;
  var getOneCompanyBillList;

  // 数组去重
  _unique = function (arr) {
    var result = [];
    var hash = {};
    var len = arr.length;
    var i;
    var elem;

    for (i = 0; i < len; i += 1) {
      elem = arr[i];

      if (!hash[elem]) {
        result.push(elem);
        hash[elem] = true;
      }
    }

    return result;
  };

  _listFind =
    function (search, pageN, companys, len, callback) {
      var LIMIT    = 20;
      var index    = pageN * LIMIT;
      var sortJson = { _id: -1 };
      Bp.find(search)
        .sort(sortJson)
        .skip(index)
        .limit(LIMIT)
        .exec(
          function (err, bps) {
            if (err) {
              errCode = _ERRS.LIST_FIND_ERR;
              zxutil.writeLog(ctrlName, errCode, err, search);
              return callback({});
            }

            callback({
              bps: bps,
              companys: companys,
              totalPage: Math.ceil(len / LIMIT), // 向上取整
            });
          }
        );
    };

  // /bplist/:bpmonth/:bpcompany/:n 往来账
  // find: { category: 20 }
  list = function (obj, find, callback) {
    // obj = { bpmonth: 'all', bpcompany: 'all', n: '0' };
    // obj.bpMonth 月份 2015-04
    // obj.bpcompany 公司ID
    var bpcompany = obj.bpcompany;
    var bpmonth   = obj.bpmonth;
    var search    = {};

    Company.find(
      find,
      { name: 1 }
    ).sort({ name: 1 }).exec(function (err, companys) {

      if (err) {
        errCode = _ERRS.LIST_ERR;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({});
      }

      if (bpcompany && bpcompany !== 'all') {
        search.company = bpcompany;
      }

      if (bpmonth && bpmonth !== 'all') {
        search.bpDate =
            { $gte: moment(bpmonth), $lt: moment(bpmonth).add(1, 'M') };
      }

      Bp.count(search, function (err, len) {
        if (err) {
          errCode = _ERRS.LIST_COUNT_ERR;
          zxutil.writeLog(ctrlName, errCode, err, search);
          return callback({});
        }

        _listFind(search, Number(obj.n), companys, len, callback);
      });
    });
  };

  add = function (obj, callback) {
    var newBp;
    obj.bpDate = moment(obj.bpDate);
    newBp = new Bp(obj);
    newBp.save(function (err, bp) {
      if (err) {
        errCode = _ERRS.ADD_ERR;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      callback({ success: 1, bp: bp }); // ok
    });
  };

  update = function (obj, callback) {
    // TODO: 检验用户输入
    // ***所有检验通过，进入正常保存流程***
    Bp.findById(obj._id, function (err, bp) {
      var _bp;

      if (err) {
        errCode = _ERRS.UPDATE_ERR;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      if (bp) {
        if (obj.bpDate) {
          obj.bpDate = moment(obj.bpDate);
        }

        _bp = _.extend(bp, obj);

        _bp.save(function (err) {
          if (err) {
            errCode = _ERRS.UPDATE_SAVE_ERR;
            zxutil.writeLog(ctrlName, errCode, err, _bp);
            return callback({ success: errCode });
          }

          callback({ success: 1 }); // ok
        });
      } else {
        errCode = _ERRS.UPDATE_FIND_ERROR;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }
    });
  };

  remove = function (id, callback) {
    Bp.remove({ _id: id }, function (err, isOk) {
      if (err) {
        errCode = _ERRS.REMOVE_ERR;
        zxutil.writeLog(ctrlName, errCode, err, id);
        return callback({ success: errCode });
      }

      if (isOk.result.ok === 1 && isOk.result.n === 1) {
        callback({ success: 1 }); // ok
      } else {
        //  { ok: 1, n: 0 }
        errCode = _ERRS.REMOVE_ERROR;
        zxutil.writeLog(ctrlName, errCode, {}, {});
        return callback({ success: errCode });
      }
    });
  };

  // 应收款 20
  getbillsnow = function (callback) {
    var bpmonth     = moment().startOf('month');
    var lastMonth   = moment().startOf('month').subtract(1, 'M');
    var nextMonth   = moment().startOf('month').add(1, 'M');
    var matchSm    = {};
    var matchBp    = {};
    var companyIds;
    var statementCompanyIds;
    var smCompanyIds;
    var bpCompanyIds;

    // 上月余额
    // 查找上月对账单
    Statement.find(
      { month: lastMonth },
      { company: 1, thisMonthBalance: 1 },
      function (err, statements) {
        if (err) { console.log(err); }

        /*[
            {
              _id: 55951810b77f37dd3672890f,
              company: 553a55db64d7dffc4b7dce82,
              thisMonthBalance: 58400,
              meta: {},
            },
            {
              _id: 55966bc9b77f37dd36728d83,
              company: 553a55db64d7dffc4b7dce8d,
              thisMonthBalance: 30000,
              meta: {},
            }
        ]*/

        statementCompanyIds = statements.map(function (item) {
          return item.company;
        });

        // 聚合 本月服务单 已收或已付 > 0
        //matchSm['flight.flightDate'] = { $regex : '^' + bpmonth };
        matchSm['flight.flightDate'] =
            { $gte: bpmonth.toDate(), $lt: nextMonth.toDate() };

        matchSm.smStatus = { $gt: 0 };
        matchSm.$or =
            [{ smAgencyFund_y: { $lt: 0 } }, { smPayment_y: { $gt: 0 } }];
        Sm.aggregate([
          {
            $match: matchSm,
          },
          {
            $project: {
              company: 1,
              smAgencyFund_y: 1,
              smPayment_y: 1,
            },
          },
          {
            $group: {
              _id: '$company',
              smAgencyFund_y_sum: { $sum: '$smAgencyFund_y' },
              smPayment_y_sum: { $sum: '$smPayment_y' },
            },
          },
        ]).exec(function (err, sms) {
          if (err) { console.log(err); }

          /*[
              {
                _id: 553a55db64d7dffc4b7dce85,
                smAgencyFund_y_sum: -75000,
                smPayment_y_sum: 0,
              },
              {
                _id: 553a55db64d7dffc4b7dce5e,
                smAgencyFund_y_sum: 0,
                smPayment_y_sum: 54000,
              }
          ]*/
          smCompanyIds = sms.map(function (item) {
            return item._id;
          });

          // 聚合 本月往来账
          //matchBp.bpDate = { $regex : '^' + bpmonth };
          //console.log(bpmonth.format('YYYY-MM-DD'));
          //console.log(nextMonth.format('YYYY-MM-DD'));
          matchBp.bpDate = { $gte: bpmonth.toDate(), $lt: nextMonth.toDate() };

          Bp.aggregate([
            {
              $match: matchBp,
            },
            {
              $project: {
                company: 1,
                bpNum: 1,
              },
            },
            {
              $group: {
                _id: '$company',
                bpNum_sum: { $sum: '$bpNum' },
              },
            },
          ]).exec(function (err, bps) {
            if (err) { console.log(err); }

            /*[
                { _id: 553a55db64d7dffc4b7dce7e, bpNum_sum: -17000 },
                { _id: 5549819ffffc6ba533e32d9a, bpNum_sum: -30200 }
            ]*/
            bpCompanyIds = bps.map(function (item) {
              return item._id;
            });

            companyIds =
                _unique(statementCompanyIds.concat(smCompanyIds, bpCompanyIds));

            Company.find(
              { _id: { $in: companyIds } },
              { name: 1 },
              function (err, companys) {
                if (err) { console.log(err); }

                callback({
                  companys: companys,
                  statements: statements,
                  sms: sms,
                  bps: bps,
                });
              }
            );
          });
        });
      }
    );
  };

  // 月账单列表 20
  billsitemisedlist = function (obj, callback) {
    var searchSm = {};
    var searchBp = {};
    var searchStatement = {};
    var companyIds = [];

    if (obj.bpmonth === '') {
      obj.bpmonth = moment().format('YYYY-MM');
    }

    searchSm['flight.flightDate'] =
        { $gte: moment(obj.bpmonth), $lt: moment(obj.bpmonth).add(1, 'M') };
    searchSm.smStatus = { $gt: 0 };

    searchBp.bpDate =
        { $gte: moment(obj.bpmonth), $lt: moment(obj.bpmonth).add(1, 'M') };

    searchStatement.month = moment(obj.bpmonth).subtract(1, 'M'); // 减 1 个月
    searchStatement.thisMonthBalance = { $ne: 0 };

    // 本月服务单公司去重
    Sm.find(searchSm).distinct('company').exec(function (err, smCompanyIds) {
      if (err) { console.log(err); }

      // 本月往来账公司去重
      Bp.find(searchBp).distinct('company').exec(function (err, bpCompanyIds) {
        if (err) { console.log(err); }

        // 上月对账单本月余额 {thisMonthBalance: {$not:0}} 公司
        Statement.find(searchStatement).distinct('company').exec(
          function (err, statementCompanyIds) {
            if (err) { console.log(err); }

            // 合并三个数组并去重
            companyIds =
                _unique(smCompanyIds.concat(bpCompanyIds, statementCompanyIds));

            Company.find(
              { _id: { $in: companyIds } },
              { name: 1 },
              function (err, companys) {
                if (err) { console.log(err); }

                // 查找本月对账单
                Statement.find(
                  { month: moment(obj.bpmonth) },
                  { company: 1, isLock: 1, thisMonthBalance: 1 },
                  function (err, statements) {
                    if (err) { console.log(err); }

                    callback({
                      companys: companys,
                      statements: statements,
                    });
                  }
                );
              }
            );
          }
        );
      });
    });
  };

  // -- 月账单明细
  getbillsitemised = function (obj, callback) {
    var searchSm             = {};
    var searchBp             = {};
    var searchStatement      = {};
    var searchStatementLast = {};
    var sortJson             = { bpDate: 1 };

    // Company.find({ category: 20 }, { name: 1, idcardfee: 1 }).exec(
    Company.findOne(
      { _id: obj.bpcompany },
      { name: 1, idcardfee: 1 }).exec(

      //function (err, companys) {
      function (err, company) {
        if (err) { console.log(err); }

        if (company) {
          // if (obj.bpcompany === '') {
          //   obj.bpcompany = companys[0]._id;
          // }

          searchSm.company = obj.bpcompany;
          searchBp.company = obj.bpcompany;
          searchStatement.company = obj.bpcompany;
          searchStatementLast.company = obj.bpcompany;

          if (obj.bpmonth === '') {
            obj.bpmonth = moment().format('YYYY-MM');
          }

          //searchSm['flight.flightDate'] = { $regex : '^' + obj.bpmonth };
          searchSm['flight.flightDate'] = {
            $gte: moment(obj.bpmonth),
            $lt: moment(obj.bpmonth).add(1, 'M'),
          };

          //searchBp.bpDate = { $regex : '^' + obj.bpmonth };
          searchBp.bpDate = {
            $gte: moment(obj.bpmonth),
            $lt: moment(obj.bpmonth).add(1, 'M'),
          };

          searchStatement.month = moment(obj.bpmonth);
          searchStatementLast.month = moment(obj.bpmonth).subtract(1, 'M');

          searchSm.smStatus = { $gt: 0 };

          //团队单费用明细表
          Sm.find(
            searchSm,
            {
              team: 1,
              flight: 1,
              operator: 1,
              smType2: 1,
              smRealNumber: 1,
              smAgencyFund_y: 1,
              smPayment_y: 1,
              fees: 1,
              addFees: 1,
              addFeesNote: 1,
              carFees: 1,
              idcardsmfees: 1,
              insurance: 1,
              serverMan: 1,
            }
          ).populate('team', 'teamNum teamType').sort({
            'flight.flightDate': 1,
          }).exec(function (err, sms) {
            if (err) { console.log(err); }

            if (!sms) {
              sms = [];
            }

            // 收支明细表
            Bp.find(searchBp).sort(sortJson).exec(function (err, bps) {

              if (err) { console.log(err); }

              if (!bps) {
                bps = [];
              }

              // 是否有对账单
              Statement.findOne(searchStatement, function (err, statement) {
                var hasStatement;

                if (err) { console.log(err); }

                if (statement) {
                  hasStatement = true;
                } else {
                  hasStatement = false;
                }

                // 是否有上月对账单，如果有，拿到上月对账单的本月余额thisMonthBalance
                Statement.findOne(
                  searchStatementLast,
                  { thisMonthBalance: 1, isLock: 1 },
                  function (err, statement) {
                    var isLock = false;
                    var lastMonthBalance;

                    if (err) { console.log(err); }

                    if (statement) {
                      lastMonthBalance = statement.thisMonthBalance;
                      isLock           = statement.isLock;
                    }

                    callback({
                      sms: sms,
                      bps: bps,
                      company: company,
                      hasStatement: hasStatement,
                      lastMonthBalance: lastMonthBalance,
                      isLock: isLock,
                    });
                  }
                );
              });
            });
          });
        }
      }
    );
  };

  // -- 对账单
  getstatement = function (obj, callback) {
    Statement.findOne({ _id: obj.id }, function (err, statement) {
      if (err) { console.log(err); }

      Company.findOne(
        { _id: statement.company },
        { name: 1 },
        function (err, company) {
          if (err) { console.log(err); }

          callback({
            statement: statement,
            company: company,
          });
        }
      );
    });
  };

  // -- 新建对账单
  statementadd = function (obj, callback) {
    var newStatement;

    obj.month = moment(obj.month);

    newStatement = new Statement(obj);

    newStatement.save(function (err, statement) {
      if (err) {
        console.log(err);
      }

      if (statement) {
        callback({ success: 1 }); // ok
        return;
      }

      callback({ success: 0 }); // 未知错误
    });
  };

  // -- 删除对账单
  statementremove = function (obj, callback) {
    var id = obj.id;

    if (id) {
      Statement.remove({ _id: id }, function (err, isOk) {
        if (err) { console.log(err); }

        callback({ success: isOk.result.ok }); // ok
      });
    }
  };

  // -- 确认对账单
  statementlock = function (obj, callback) {
    var id = obj.id;

    if (id) {
      Statement.update(
        { _id: id },
        { $set: { isLock: true } },
        function (err, isOk) {
          if (err) { console.log(err); }

          callback({ success: isOk.ok }); // ok
        }
      );
    }
  };

  // 月账单汇总 20
  getbillstotal = function (obj, callback) {
    var searchSm = {};

    if (obj.bpmonth === '') {
      obj.bpmonth = moment().format('YYYY-MM');
    }

    searchSm['flight.flightDate'] =
        { $gte: moment(obj.bpmonth), $lt: moment(obj.bpmonth).add(1, 'M') };

    searchSm.smStatus = { $gt: 0 };

    //服务单费用明细表
    Sm.find(
      searchSm,
      {
        team: 1,
        company: 1,
        flight: 1,
        smRealNumber: 1,
        fees: 1,
        addFees: 1,
        idcardsmfees: 1,
        serverMan: 1,
        insurance: 1,
      }
    ).populate('team', 'teamType').exec(function (err, smsArr) {
      var sms = [];
      var companyIds;

      if (err) { console.log(err); }

      if (!smsArr) {
        callback({
          sms: sms,
        });
      } else {
        companyIds = smsArr.map(function (item) {
          return item.company;
        });

        Company.find(
          { _id: { $in: companyIds } },
          { name: 1 },
          function (err, companys) {
            var companyObj = {};

            if (err) { console.log(err); }

            if (companys) {
              companys.forEach(function (item) {
                companyObj[item._id] = item;
              });

              sms = smsArr.map(function (item) {
                var _doc = item._doc;
                _doc.company = companyObj[_doc.company];
                return _doc;
              });

              callback({
                sms: sms,
              });
            }
          }
        );
      }
    });
  };

  getBillByCompanysList = function (callback) {
    // 统计 每个公司未确认的对账单数量
    // 聚合 isLock = false 的 company 数量
    Statement.aggregate([
      { $match: { isLock: false } },
      { $project: { company: 1 } },
      { $group: { _id: '$company', count: { $sum: 1 } } },
    ]).exec(function (err, cps) {
      if (err) {
        errCode = _ERRS.GET_BILL_BY_COMPANYS_LIST_ERR_1;
        zxutil.writeLog(ctrlName, errCode, err, {});
        return callback({});
      }

      var ids = cps.map(function (item) {
        return item._id;
      });

      Company.find(
        { _id: { $in: ids } },
        { name: 1 },
        function (err, companys) {
          if (err) {
            errCode = _ERRS.GET_BILL_BY_COMPANYS_LIST_ERR_2;
            zxutil.writeLog(ctrlName, errCode, err, {});
            return callback({});
          }

          callback({ cps: cps, companys: companys });
        }
      );
    });

    // Statement.find({}, { _id: 0, company: 1 }, function (err, cps) {
    //   if (err) {
    //     errCode = _ERRS.GET_BILL_BY_COMPANYS_LIST_ERR_1;
    //     zxutil.writeLog(ctrlName, errCode, err, {});
    //     return callback([]);
    //   }

    //   var ids = cps.map(function (item) {
    //     return item.company;
    //   });

    //   // 数组去重
    //   var companyIds = _unique(ids);

    //   Company.find(
    //     { _id: { $in: companyIds } },
    //     { name: 1 },
    //     function (err, companys) {
    //       if (err) {
    //         errCode = _ERRS.GET_BILL_BY_COMPANYS_LIST_ERR_2;
    //         zxutil.writeLog(ctrlName, errCode, err, {});
    //         return callback([]);
    //       }

    //       callback(companys);
    //     }
    //   );
    // });
  };

  // 地接社对账单列表
  getOneCompanyBillList = function (obj, callback) {
    // 查找此公司所有对账单
    Statement.find(
      { company: obj.company },
      { month: 1, thisMonthBalance: 1, isLock: 1 }
    ).sort(
      { month: 1 }
    ).exec(function (err, statements) {
      if (err) {
        errCode = _ERRS.GET_ONE_COMPANY_BILL_LIST_ERR_1;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({});
      }

      Company.findOne(
        { _id: obj.company },
        { _id: 0, name: 1 },
        function (err, company) {
          if (err) {
            errCode = _ERRS.GET_ONE_COMPANY_BILL_LIST_ERR_2;
            zxutil.writeLog(ctrlName, errCode, err, obj);
            return callback({});
          }

          if (company) {
            callback({
              statements: statements,
              company: company,
            });
          } else {
            errCode = _ERRS.GET_ONE_COMPANY_BILL_LIST_ERROR;
            zxutil.writeLog(ctrlName, errCode, {}, obj);
            return callback({});
          }
        }
      );
    });
  };

  return {
    _listFind: _listFind,
    list: list,
    add: add,
    update: update,
    remove: remove,
    getbillsnow: getbillsnow,
    billsitemisedlist: billsitemisedlist,
    getbillsitemised: getbillsitemised,
    getstatement: getstatement,
    statementadd: statementadd,
    statementremove: statementremove,
    statementlock: statementlock,
    getbillstotal: getbillstotal,
    getBillByCompanysList: getBillByCompanysList,
    getOneCompanyBillList: getOneCompanyBillList,
  };
};

module.exports = createCtrl;
