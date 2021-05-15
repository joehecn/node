/* jshint
   node: true,        devel: true,
   maxstatements: 77, maxparams: 3, maxdepth: 7,
   maxerr: 50,        nomen: true,  regexp: true
 */

/**
 * djp controller 模块
 * @module app/controllers/djp
 */
'use strict';

var createCtrl = function (dbHost, dbName) {
  // 23
  var _ERRS = {
    // xx9 系统级错误
    LIST_ERR_1: '23902', // 此错误不抛到客户端
    LIST_ERR_2: '23904', // 此错误不抛到客户端
    LIST_ERR_3: '23906', // 此错误不抛到客户端
    ISPRINTT_ERR: '23908',
    DJPNOTE_ERR: '23910',
    DOWNLOAD_ERR_1: '23912',
    DOWNLOAD_ERR_2: '23914',
    DOWNLOAD_ERR_3: '23916',
    DOWNLOAD_ERR_4: '23918', // 此错误不抛到客户端
    DJPLIST_ERR_1: '23920',  // 此错误不抛到客户端
    DJPLIST_ERR_2: '23922',  // 此错误不抛到客户端
    DJPLIST_ERR_3: '23924',  // 此错误不抛到客户端
    SETNAME_ERR_1: '23926',
    SETNAME_ERR_2: '23928',
    SETNAME_ERR_3: '23930',
    SETNAME_ERR_4: '23932',
    SETNAME_ERR_5: '23934',
    SETNOTE_ERR_1: '23936',
    SETNOTE_ERR_2: '23938',

    // xx0 一般错误
    USER_ERROR: '23002',
    MOTH_ERROR: '23004',
    ISPRINTT_ISOK: '23006',
    DJPNOTE_ISOK: '23008',
    DOWNLOAD_ISOK: '23010', // 此错误不抛到客户端
    DOWNLOAD_FIND_1: '23012',
    DOWNLOAD_FIND_2: '23014',
    DOWNLOAD_FIND_3: '23016',
    SETNAME_ISOK_1: '23018',
    SETNAME_ISOK_2: '23020',
    SETNOTE_ISOK: '23022',
    SETNOTE_ERROR: '23024',
  };
  var ctrlName  = 'djp';
  var moment    = require('moment');
  var getModel  = require('../model');
  var zxutil    = require('../zxutil');
  var Dengjipai = getModel(dbHost, dbName, 'dengjipai');
  var Djp       = getModel(dbHost, dbName, ctrlName);
  var Sm        = getModel(dbHost, dbName, 'sm');
  var Team      = getModel(dbHost, dbName, 'team');
  var errCode;

  // public methods
  // ---------------------- 登机牌客户端 djp.zxsl.net.cn
  var list;
  var isdownload;
  var isprint;
  var djpnote;

  // ------------------------

  var djplist;
  var setName;
  var setNote;

  list = function (obj, callback) {
    var name = obj.name;
    var password = obj.password;
    var smDate   = obj.searchDate;
    var djpArr   = [];
    var smMonth;

    // 检查权限
    Dengjipai.findOne(
      { name: name, password: password },
      function (err, dengjipai) {
        if (err) {
          errCode = _ERRS.LIST_ERR_1;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({ success: 1, djpArr: [] });
        }

        if (dengjipai) {
          if (smDate.substr(0, 4) === '2000') {
            if (Number(smDate.substr(8, 2)) < 13) {
              smMonth = '201' + smDate.substr(6, 4) + '-01';

              Djp.find({ name: name },
                { sm: 1, name: 1, isDownload: 1, isPrint: 1, djpNote: 1 }
              ).populate(
                { path: 'sm',
                  select: '_id flight smRealNumber',
                  match: {
                    'flight.flightDate': {
                      $gte: moment(smMonth),
                      $lt: moment(smMonth).add(1, 'M'),
                    },
                  },
                }
              ).exec(function (err, djps) {
                  var i;

                  if (err) {
                    errCode = _ERRS.LIST_ERR_2;
                    zxutil.writeLog(ctrlName, errCode, err, obj);
                    return callback({ success: 1, djpArr: [] });
                  }

                  for (i = 0; i < djps.length; i += 1) {
                    if (djps[i].sm) {
                      djpArr.push(djps[i]);
                    }
                  }

                  callback({
                    success: 1,
                    djpArr: djpArr,
                  });
                });
            } else {
              callback({ success: _ERRS.MOTH_ERROR });
            }
          } else {
            Djp.find(
              { name: name },
              { sm: 1, name: 1, isDownload: 1, isPrint: 1, djpNote: 1 }
            ).populate({
              path: 'sm',
              select: '_id flight smRealNumber',
              match: { 'flight.flightDate': moment(smDate) },
            }).exec(function (err, djps) {
              var i;

              if (err) {
                errCode = _ERRS.LIST_ERR_3;
                zxutil.writeLog(ctrlName, errCode, err, obj);
                return callback({ success: 1, djpArr: [] });
              }

              if (djps) {
                for (i = 0; i < djps.length; i += 1) {
                  if (djps[i].sm) {
                    djpArr.push(djps[i]);
                  }
                }

                callback({
                  success: 1,
                  djpArr: djpArr,
                });
              } else {
                callback({ success: 1, djpArr: [] });
              }
            });
          }
        } else {
          callback({ success: _ERRS.USER_ERROR });
        }
      }
    );
  };

  isdownload = function (obj, callback) {
    var id = obj.id;
    var isDownload = obj.isDownload;

    getModel(dbHost, dbName, 'batch');

    // 下载 Djp
    Djp.findOne({ _id: id }, { sm: 1 }, function (err, djp) {
      if (err) {
        errCode = _ERRS.DOWNLOAD_ERR_1;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      if (djp) {
        Sm.findOne({ _id: djp.sm }).exec(function (err, sm) {
          if (err) {
            errCode = _ERRS.DOWNLOAD_ERR_2;
            zxutil.writeLog(ctrlName, errCode, err, obj);
            return callback({ success: errCode });
          }

          if (sm) {
            Team.findOne({ _id: sm.team })
              .populate('departureTraffics')
              .populate('returnTraffics')
              .populate('users.batchs')
              .exec(function (err, team) {
                var sn = 0;
                var users = [];
                var j;
                var lenJ;
                var teamUser;
                var user;
                var batchs;
                var i;
                var lenI;
                var teamUserBatch;
                var batch;
                var batchInfo;
                var persons;
                var isBatchOk;
                var k;
                var lenK;
                var teamUserBatchPerson;
                var person;
                var setData;

                if (err) {
                  errCode = _ERRS.DOWNLOAD_ERR_3;
                  zxutil.writeLog(ctrlName, errCode, err, obj);
                  return callback({ success: errCode });
                }

                if (team) {
                  for (j = 0, lenJ = team.users.length; j < lenJ; j += 1) {
                    teamUser = team.users[j];
                    user = {};
                    batchs = [];

                    for (i = 0, lenI = teamUser.batchs.length;
                        i < lenI; i += 1) {
                      teamUserBatch = teamUser.batchs[i];
                      batch = {};
                      if (
                          (
                            teamUserBatch.departureTraffic._id.toString() ===
                              djp.sm.toString() &&
                            teamUserBatch.departureTraffic.isSm === true
                          ) ||
                          (
                            teamUserBatch.returnTraffic._id.toString() ===
                              djp.sm.toString() &&
                            teamUserBatch.returnTraffic.isSm === true
                          )
                        ) {
                        batch.batchNum = teamUserBatch.batchNum;

                        batchInfo = [];
                        if (
                            teamUserBatch.sendBatchNote &&
                            teamUserBatch.sendBatchNote !== ''
                          ) {
                          batchInfo.push({
                            item: '备注:' + teamUserBatch.sendBatchNote,
                          });
                        }

                        batch.batchInfo = batchInfo;

                        persons = [];
                        isBatchOk = false;
                        for (k = 0, lenK = teamUserBatch.persons.length;
                            k < lenK; k += 1) {
                          teamUserBatchPerson = teamUserBatch.persons[k];
                          person = {};
                          if (teamUserBatchPerson.isSend === true) {
                            if (isBatchOk) {
                              sn += 1;
                              person.sn = sn;
                              person.name = teamUserBatchPerson.name;
                              person.cardNum = teamUserBatchPerson.cardNum;
                              person.phone = teamUserBatchPerson.phone;
                              person.teamPersonNote =
                                teamUserBatchPerson.sendPersonNote;
                              persons.push(person);
                            } else {
                              sn += 1;
                              batch.sn = sn;
                              batch.name = teamUserBatchPerson.name;
                              batch.cardNum = teamUserBatchPerson.cardNum;
                              batch.phone = teamUserBatchPerson.phone;
                              batch.teamPersonNote =
                                teamUserBatchPerson.sendPersonNote;

                              isBatchOk = true;
                            }
                          }
                        }

                        if (isBatchOk) {
                          batch.len = 1 + persons.length;
                          batch.persons = persons;
                          batchs.push(batch);
                        }
                      }
                    }

                    if (batchs.length > 0) {
                      user.batchs = batchs;
                      users.push(user);
                    }
                  }

                  setData = {};

                  setData.smDate =
                    moment(sm.flight.flightDate).format('YYYY-MM-DD');
                  setData.teamType = team.teamType;       // 团队类型
                  setData.smFlight = sm.flight.flightNum; // 送机航班
                  setData.smFlightAll =
                    sm.flight.flightNum + ' ' +
                    sm.flight.flightStartCity + '-' +
                    sm.flight.flightEndCity + ' ' +
                    moment(sm.flight.flightStartTime).format('HH:mm') + '-' +
                    moment(sm.flight.flightEndTime).format('HH:mm');
                  setData.smRealNumber = sm.smRealNumber; // 名单人数
                  setData.smNote = sm.smNote;    // 送机备注

                  setData.users = users;

                  // 即使更新出错了，依然 setData
                  if (isDownload === 'false') {
                    Djp.update(
                      { _id: id },
                      { isDownload: true },
                      function (err, isOk) {
                        if (err) {
                          errCode = _ERRS.DOWNLOAD_ERR_4;
                          zxutil.writeLog(ctrlName, errCode, err, obj);
                        }

                        if (!(isOk.nModified === 1 && isOk.n === 1)) {
                          errCode = _ERRS.DOWNLOAD_ISOK;
                          zxutil.writeLog(ctrlName, errCode, {}, obj);
                        }
                      }
                    );
                  }

                  callback({
                    success: 1,
                    setData: setData,
                  });
                } else {
                  errCode = _ERRS.DOWNLOAD_FIND_3;
                  zxutil.writeLog(ctrlName, errCode, {}, obj);
                  return callback({ success: errCode });
                }
              });
          } else {
            errCode = _ERRS.DOWNLOAD_FIND_2;
            zxutil.writeLog(ctrlName, errCode, {}, obj);
            return callback({ success: errCode });
          }
        });
      } else {
        errCode = _ERRS.DOWNLOAD_FIND_1;
        zxutil.writeLog(ctrlName, errCode, {}, obj);
        return callback({ success: errCode });
      }
    });
  };

  isprint = function (obj, callback) {
    var id = obj.id;
    var isPrint = obj.isPrint;

    Djp.update(
      { _id: id },
      { isPrint: isPrint },
      function (err, isOk) {
        if (err) {
          errCode = _ERRS.ISPRINTT_ERR;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({ success: errCode });
        }

        if (isOk.nModified === 1 && isOk.n === 1) {
          callback({ success: 1 });
        } else {
          errCode = _ERRS.ISPRINTT_ISOK;
          zxutil.writeLog(ctrlName, errCode, {}, obj);
          return callback({ success: errCode });
        }
      }
    );
  };

  djpnote = function (obj, callback) {
    var id = obj.id;
    var djpNote = obj.djpNote;

    Djp.update(
      { _id: id },
      { djpNote: djpNote },
      function (err, isOk) {
        if (err) {
          errCode = _ERRS.DJPNOTE_ERR;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({ success: errCode });
        }

        if (isOk.nModified === 1 && isOk.n === 1) {
          callback({ success: 1 });
        } else {
          errCode = _ERRS.DJPNOTE_ISOK;
          zxutil.writeLog(ctrlName, errCode, {}, obj);
          return callback({ success: errCode });
        }
      }
    );
  };

  djplist = function (obj, CITY, callback) {
    // obj { smDate }
    var smDate   = obj.smdate;
    var sortJson = { _id: -1 };
    var search = { smStatus: { $gt: 0 } };

    search['flight.flightStartCity'] = CITY;

    if (smDate === '') {
      smDate = moment(Date.now()).format('YYYY-MM-DD');
    }

    search['flight.flightDate'] = moment(smDate);

    Sm.find(search, {
      smRealNumber: 1,
      smTimeSpace: 1,
      smType2: 1,
      flight: 1,
      operator: 1,
    }).sort(sortJson).exec(function (err, notice) {
      var iLen = notice.length;
      var i;
      var item;
      var sm;
      var sms = [];
      var smSort = [];

      if (err) {
        errCode = _ERRS.DJPLIST_ERR_1;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({});
      }

      for (i = 0; i < iLen; i += 1) {
        item = notice[i];
        sm = {
          _id: item._id,
          smRealNumber: item.smRealNumber,
          smTimeSpace: item.smTimeSpace,
          smType2: item.smType2,
          operator: item.operator,
          flight: item.flight,
        };

        sm.smSetTime =
          zxutil.getSetTime(sm.flight.flightStartTime, sm.smTimeSpace);

        sms.push(sm);
      }

      // 排序
      smSort = sms.sort(function (a, b) {
        return moment(a.smSetTime).diff(moment(b.smSetTime));
      });

      // 登机牌
      Djp.find({}, {
        sm: 1,
        name: 1,
        isDownload: 1,
        isPrint: 1,
        djpNote: 1,
      }).populate({
        path: 'sm',
        select: '_id',
        match: { 'flight.flightDate': moment(smDate) },
      }).exec(function (err, djps) {
        if (err) {
          errCode = _ERRS.DJPLIST_ERR_2;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({});
        }

        var djpObj = {};
        var kLen = djps.length;
        var k;

        for (k = 0; k < kLen; k += 1) {
          if (djps[k].sm) {
            djpObj[djps[k].sm._id] = djps[k];
          }
        }

        // 登机牌用户
        Dengjipai.find({}, { name: 1 }, function (err, dengjipais) {
          if (err) {
            errCode = _ERRS.DJPLIST_ERR_3;
            zxutil.writeLog(ctrlName, errCode, err, obj);
            return callback({});
          }

          return callback({
            smSort: smSort, // array
            dengjipais: dengjipais, // 登机牌用户 array
            djpObj: djpObj, // 登机牌
          });
        });
      });
    });
  };

  setName = function (obj, callback) {
    // obj: { sm, name }
    var sm = obj.sm;
    var name = obj.name;

    if (name === '待定' || name === '') {
      Djp.findOne({ sm: sm }, function (err, djp) {
        if (err) {
          errCode = _ERRS.SETNAME_ERR_1;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({ success: errCode });
        }

        if (djp) {
          // 删除 djp
          Djp.remove({ sm: sm }, function (err, isOk) {
            if (err) {
              errCode = _ERRS.SETNAME_ERR_2;
              zxutil.writeLog(ctrlName, errCode, err, obj);
              return callback({ success: errCode });
            }

            if (isOk.result.ok === 1 && isOk.result.n === 1) {
              callback({ success: 1 }); // ok
            } else {
              errCode = _ERRS.SETNAME_ISOK_1;
              zxutil.writeLog(ctrlName, errCode, {}, {});
              return callback({ success: errCode });
            }
          });
        } else {
          callback({ success: 1 });
        }
      });
    } else {
      Djp.findOne({ sm: sm }, function (err, djp) {
        if (err) {
          errCode = _ERRS.SETNAME_ERR_3;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({ success: errCode });
        }

        if (djp) {
          // 更新djp
          Djp.update(
            { sm: sm },
            { $set: { name: name } },
            function (err, isOk) {
              if (err) {
                errCode = _ERRS.SETNAME_ERR_4;
                zxutil.writeLog(ctrlName, errCode, err, obj);
                return callback({ success: errCode });
              }

              if (isOk.nModified === 1 && isOk.n === 1) {
                callback({ success: 1 }); // ok
              } else {
                errCode = _ERRS.SETNAME_ISOK_2;
                zxutil.writeLog(ctrlName, errCode, {}, obj);
                return callback({ success: errCode });
              }
            }
          );
        } else {
          // 新增djp
          var newDjp = new Djp(obj);

          newDjp.save(function (err) {
            if (err) {
              errCode = _ERRS.SETNAME_ERR_5;
              zxutil.writeLog(ctrlName, errCode, err, obj);
              return callback({ success: errCode });
            }

            callback({ success: 1 });
          });
        }
      });
    }
  };

  setNote = function (obj, callback) {
    // obj: { sm, djpNote }
    var sm = obj.sm;
    var djpNote = obj.djpNote;

    Djp.findOne({ sm: sm }, function (err, djp) {
        if (err) {
          errCode = _ERRS.SETNOTE_ERR_1;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({ success: errCode });
        }

        if (djp) {
          // 更新djp
          Djp.update(
            { sm: sm },
            { $set: { djpNote: djpNote } },
            function (err, isOk) {
              if (err) {
                errCode = _ERRS.SETNOTE_ERR_2;
                zxutil.writeLog(ctrlName, errCode, err, obj);
                return callback({ success: errCode });
              }

              if (isOk.nModified === 1 && isOk.n === 1) {
                callback({ success: 1 }); // ok
              } else {
                errCode = _ERRS.SETNOTE_ISOK;
                zxutil.writeLog(ctrlName, errCode, {}, obj);
                return callback({ success: errCode });
              }
            }
          );
        } else {
          errCode = _ERRS.SETNOTE_ERROR;
          zxutil.writeLog(ctrlName, errCode, {}, obj);
          return callback({ success: errCode });
        }
      });
  };

  return {
    // ---------------------- 登机牌客户端 djp.zxsl.net.cn
    list: list,
    isdownload: isdownload,
    isprint: isprint,
    djpnote: djpnote,

    // -------------
    djplist: djplist,
    setName: setName,
    setNote: setNote,
  };
};

module.exports = createCtrl;
