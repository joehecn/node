/* jshint
   node: true,        devel: true,
   maxstatements: 140, maxparams: 3, maxdepth: 8,
   maxerr: 50,        nomen: true,  regexp: true
 */

/**
 * sm controller 模块
 * @module app/controllers/sm
 */
'use strict';

var createCtrl = function (dbHost, dbName) {
  // 25
  var _ERRS = {
    // xx9 系统级错误
    LIST_ERR_1: '25902', // 此错误不抛到客户端
    LIST_ERR_2: '25904', // 此错误不抛到客户端
    LIST_ERR_3: '25906', // 此错误不抛到客户端
    CHANGE_SATISFACTION_ERR: '25908',
    CHANGE_CARFEES_ERR: '25910',
    CHANGE_ADDFEES_ERR: '25912',
    CHANGE_SMSTATUS_ERR: '25914',
    CHANGE_PHONEMSGSTATUS_ERR: '25916',
    CHANGE_INSURANCE_ERR: '25918',

    CHANGE_SATISFACTION_ERROR: '25002',
    CHANGE_CARFEES_ERROR: '25004',
    CHANGE_ADDFEES_ERROR: '25006',
    CHANGE_SMSTATUS_ERROR: '25008',
    CHANGE_PHONEMSGSTATUS_ERROR: '25010',
    CHANGE_INSURANCE_ERROR: '25012',

    REPLACESM_1: '25920',
    REPLACESM_2: '25922',
    REPLACESM_3: '25924',
    REPLACESM_4: '25926',
    REPLACESM_5: '25928',
    REPLACESM_6: '25930',
  };
  var ctrlName  = 'sm';
  var moment    = require('moment');
  var getModel  = require('../model');
  var zxutil    = require('../zxutil');
  var Sm        = getModel(dbHost, dbName, ctrlName);
  var SetPlace  = getModel(dbHost, dbName, 'setplace');
  var Team      = getModel(dbHost, dbName, 'team');
  var Idcardsm  = getModel(dbHost, dbName, 'idcardsm');
  var Batch     = getModel(dbHost, dbName, 'batch');
  var Message   = getModel(dbHost, dbName, 'message');

  // var FeesTemp  = getModel(dbHost, dbName, 'feestemp');
  var Company   = getModel(dbHost, 'auth', 'company');
  var User      = getModel(dbHost, 'auth', 'user');

  var getCtrl   = require('../ctrl');
  var Feestemp  = getCtrl(dbHost, dbName, 'feestemp');

  var Serverman = getModel(dbHost, dbName, 'serverman');
  var Kanban    = getModel(dbHost, dbName, 'kanban');

  var errCode;

  // public methods
  var list;
  var downloadSm;
  var changeSatisfaction;
  var changeCarFees;
  var changeAddFees;
  var sendWxMsg;
  var changeSmStatus;
  var changePhoneMsgStatus;
  var changeInsurance;
  var getSmById;
  var setIdcardsmfees;
  var saveSmWithMessage; // 神奇! 调用了replaceSm

  // delete sm 的效果：实际数据库没有删除，只是改变了状态
  // 就是说 删除和保存是一回事
  var replaceSm;

  // kb
  var _unique;
  var getKbServermans;
  var getKbSms;
  var _newHistory;
  var smUpdate;
  var smFix;
  var kanbanUpdate;

  var optGetlist;

  // var changeServerMan; // 看板

  // 通知单（送机单、接机单）列表
  list = function (obj, callback) {
    var CITY      = obj.CITY;
    var LIMIT     = 20;

    var pageN     = Number(obj.n);
    var company   = obj.cid;
    var uid       = obj.uid;

    var category  = obj.category;
    var smDate    = obj.smdate;
    var index     = pageN * LIMIT;
    var sortJson = { _id: -1 };
    var search;

    // var unique = function (arr) {
    //   var result = [];
    //   var hash = {};

    //   for (var i = 0, elem; (elem = arr[i]) !== null; i += 1) {
    //     if (!hash[elem]) {
    //       result.push(elem);
    //       hash[elem] = true;
    //     }
    //   }

    //   return result;
    // };

    // 只选一天不分页
    var smFindBySearch = function (search, callback) {
      Sm.find(search)
        .sort(sortJson)
        .exec(function (err, notice) {
          if (err) {
            errCode = _ERRS.LIST_ERR_3;
            zxutil.writeLog(ctrlName, errCode, err, search);
            return callback([]);
          }

          callback(notice);
        });
    };

    var smFindBySkipSearch = function (search, callback) {
      Sm.count(search, function (err, len) {
        if (err) {
          errCode = _ERRS.LIST_ERR_1;
          zxutil.writeLog(ctrlName, errCode, err, search);
          return callback({ len: 0 });
        }

        if (len > 0) {
          Sm.find(search)
            .sort(sortJson)
            .skip(index)
            .limit(LIMIT)
            .exec(function (err, notice) {
              if (err) {
                errCode = _ERRS.LIST_ERR_2;
                zxutil.writeLog(ctrlName, errCode, err, search);
                return callback({ len: 0 });
              }

              callback({ len: len, notice: notice });
            });
        } else {
          return callback({ len: 0 });
        }
      });
    };

    // var getSms30 = function (notice, len) {
    //   var iLen = notice.length;
    //   var i;
    //   var sms = [];
    //   var smSort;
    //   var sm;

    //   for (i = 0; i < iLen; i += 1) {
    //     sm = {
    //       _id: notice[i]._id,
    //       operator: notice[i].operator,
    //       user: notice[i].user,
    //       companyAbbr: notice[i].companyAbbr,
    //       name: notice[i].name,
    //       team: notice[i].team,
    //       smAgencyFund: notice[i].smAgencyFund,
    //       smAgencyFund_y: notice[i].smAgencyFund_y,
    //       smPayment: notice[i].smPayment,
    //       smPayment_y: notice[i].smPayment_y,
    //       fees: notice[i].fees,
    //       addFees: notice[i].addFees,
    //       addFeesNote: notice[i].addFeesNote,
    //       carFees: notice[i].carFees,
    //       insurance: notice[i].insurance,
    //       satisfaction: notice[i].satisfaction,
    //       satisfactionNote: notice[i].satisfactionNote,
    //       smStatus: notice[i].smStatus,
    //       phoneMsgStatus: notice[i].phoneMsgStatus,
    //       isOpen: notice[i].isOpen,
    //       smRealNumber: notice[i].smRealNumber,
    //       smTimeSpace: notice[i].smTimeSpace,
    //       smType2: notice[i].smType2,
    //       meta: notice[i].meta,
    //       isDownload: notice[i].isDownload,
    //       isSVDownload: notice[i].isSVDownload,
    //       flight: notice[i].flight,
    //       serverMan: notice[i].serverMan,
    //     };

    //     if (sm.flight.flightEndCity.indexOf(CITY) === 0) {
    //       sm.smType1 = 2;
    //       sm.smSetTime =
    //         zxutil.getSetTime(sm.flight.flightEndTime, sm.smTimeSpace);
    //     } else {
    //       sm.smType1 = 1;
    //       sm.smSetTime =
    //         zxutil.getSetTime(sm.flight.flightStartTime, sm.smTimeSpace);
    //     }

    //     sms.push(sm);
    //   }

    //   // 排序
    //   smSort = sms.sort(function (a, b) {
    //     return moment(a.smSetTime).diff(moment(b.smSetTime));
    //   });

    //   // 现场负责人
    //   Serverman.findByCompany(company, function (err, servermans) {
    //     if (err) {
    //       errCode = _ERRS.LIST_ERR_2;
    //       zxutil.writeLog(ctrlName, errCode, err, obj);
    //       return callback({});
    //     }

    //     if (!servermans) { servermans = []; }

    //     return callback({
    //       servermans: servermans,
    //       smSort: smSort,
    //       totalPage: len ? Math.ceil(len / LIMIT) : 1,
    //     });
    //   });
    // };

    var getSms20 = function (notice, len) {
      var iLen = notice.length;
      var i;
      var sms = [];
      var smSort;
      var sm;

      for (i = 0; i < iLen; i += 1) {
        sm = {
          _id: notice[i]._id,
          operator: notice[i].operator,
          user: notice[i].user,
          companyAbbr: notice[i].companyAbbr,
          name: notice[i].name,
          team: notice[i].team,
          smAgencyFund: notice[i].smAgencyFund,
          smAgencyFund_y: notice[i].smAgencyFund_y,
          smPayment: notice[i].smPayment,
          smPayment_y: notice[i].smPayment_y,
          fees: notice[i].fees,
          addFees: notice[i].addFees,
          addFeesNote: notice[i].addFeesNote,
          carFees: notice[i].carFees,
          insurance: notice[i].insurance,
          satisfaction: notice[i].satisfaction,
          satisfactionNote: notice[i].satisfactionNote,
          smStatus: notice[i].smStatus,
          phoneMsgStatus: notice[i].phoneMsgStatus,
          isOpen: notice[i].isOpen,
          smRealNumber: notice[i].smRealNumber,
          smTimeSpace: notice[i].smTimeSpace,
          smType2: notice[i].smType2,
          meta: notice[i].meta,
          isDownload: notice[i].isDownload,
          isSVDownload: notice[i].isSVDownload,
          flight: notice[i].flight,
          serverMan: notice[i].serverMan,
        };

        if (sm.flight.flightEndCity.indexOf(CITY) === 0) {
          sm.smType1 = 2;
          sm.smSetTime =
            zxutil.getSetTime(sm.flight.flightEndTime, sm.smTimeSpace);
        } else {
          sm.smType1 = 1;
          sm.smSetTime =
            zxutil.getSetTime(sm.flight.flightStartTime, sm.smTimeSpace);
        }

        sms.push(sm);
      }

      // 排序
      smSort = sms.sort(function (a, b) {
        return moment(a.smSetTime).diff(moment(b.smSetTime));
      });

      return callback({
        smSort: smSort,
        totalPage: len ? Math.ceil(len / LIMIT) : 1,
      });
    };

    if (category === 30) {
      search = { smStatus: { $gt: 0 } };
      if (smDate === 'all') {
        smFindBySkipSearch(search, function (result) {
          if (result.len > 0) {
            getSms20(result.notice, result.len);
          } else {
            callback({});
          }
        });
      } else {
        search['flight.flightDate'] = moment(smDate); // 一天
        smFindBySearch(search, function (notice) {
          getSms20(notice);
        });
      }
    } else {
      if (smDate === 'all') {
        search = {
          $or: [
            { user: uid, smStatus: { $gt: 0 } },
            { company: company, smStatus: { $gt: 0 } },
          ],
        };
        smFindBySkipSearch(search, function (result) {
          if (result.len > 0) {
            getSms20(result.notice, result.len);
          } else {
            callback({});
          }
        });
      } else {
        // 一天
        search = {
          $or: [
            { user: uid,
              smStatus: { $gt: 0 },
              'flight.flightDate': moment(smDate),
            },
            {
              company: company,
              smStatus: { $gt: 0 },
              'flight.flightDate': moment(smDate),
            },
          ],
        };
        smFindBySearch(search, function (notice) {
          getSms20(notice);
        });
      }
    }
  };

  // 送机单接机单 下载
  downloadSm = function (obj, callback) {
    var id           = obj.id;
    var isDownload   = obj.isDownload;
    var isSVDownload = obj.isSVDownload;
    var isSV         = obj.hasOwnProperty('isSVDownload');
    var PERSON_ISSM  = 'isSend';
    var BatchNote    = 'sendBatchNote';
    var PersonNote   = 'sendPersonNote';
    var AgencyFund   = 'sendAgencyFund';
    var Payment      = 'sendPayment';
    var CHINAWORD    = '送';

    if (id) {
      Sm.findOne({ _id: id }, function (err, sm) {
        var CITY = obj.CITY;

        if (err) { console.log(err); }

        if (sm) {

          if (isSV) {
            if (isSVDownload === false) {
              Sm.update({ _id: id },
                  { $set: { isSVDownload: true } }, function (err) {
                if (err) {
                  console.log(err);
                }
              });
            }
          } else {
            if (isDownload === false) {
              Sm.update({ _id: id },
                  { $set: { isDownload: true } }, function (err) {
                if (err) {
                  console.log(err);
                }
              });
            }
          }

          Team.findOne({ _id: sm.team })
          .populate('departureTraffics')
          .populate('returnTraffics')
          .populate('users.batchs')
          .exec(function (err, team) {
            var ids;
            var smDate;
            var smTime;
            var sn;
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
            var smNumHB;
            var airCode;
            var setData;

            if (err) { console.log(err); }

            if (team) {
              team = team._doc;

              ids = team.users.map(function (item) {
                return item._id;
              });

              User.find({ _id: { $in: ids } }, function (err, users) {
                var usersObj = {};
                var usersArr = [];
                var ii;
                var lenII;

                if (err) { console.log(err); }

                if (users) {
                  lenII = users.length;
                  for (ii = 0; ii < lenII; ii += 1) {
                    usersObj[users[ii]._id] = users[ii];
                  }

                  lenII = team.users.length;
                  for (ii = 0; ii < lenII; ii += 1) {
                    usersArr.push({
                      batchs: team.users[ii].batchs,
                      _id: usersObj[team.users[ii]._id],
                    });
                  }

                  team.users = usersArr;

                  smDate = moment(sm.flight.flightDate).format('MMDD');
                  if (sm.flight.flightEndCity.indexOf(CITY) === 0) {
                    sm.smType1 = 2;
                    smTime = moment(sm.flight.flightEndTime).format('HHmm');
                    PERSON_ISSM = 'isMeet';
                    AgencyFund = 'meetAgencyFund'; // 代收
                    Payment = 'meetPayment';       // 代付
                    BatchNote = 'meetBatchNote';
                    PersonNote = 'meetPersonNote';
                    CHINAWORD = '接';
                    sm.smSetTime =
                      zxutil.getSetTime(
                        sm.flight.flightEndTime, sm.smTimeSpace);
                  } else {
                    sm.smType1 = 1;
                    smTime = moment(sm.flight.flightStartTime).format('HHmm');
                    sm.smSetTime =
                      zxutil.getSetTime(sm.flight.flightStartTime,
                        sm.smTimeSpace);
                  }

                  sm.smNum = smDate +
                      smTime +
                      sm.flight.flightNum +
                      (sm.operator).substr(0, sm.operator.length - 11) +
                      sm.smRealNumber + '人' + (sm.smType2 === 1 ? '内' : '外') +
                      CHINAWORD;
                  sm.smFlight = sm.flight.flightNum + ' ' +
                      sm.flight.flightStartCity + '-' +
                      sm.flight.flightEndCity + ' ' +
                      moment(sm.flight.flightStartTime).format('HH:mm') + '-' +
                      moment(sm.flight.flightEndTime).format('HH:mm');

                  sn = 0;
                  users = [];
                  lenJ = team.users.length;
                  for (j = 0; j < lenJ; j += 1) {
                    teamUser = team.users[j];
                    user = {};
                    batchs = [];

                    user.userName = teamUser._id.name;
                    user.phone = teamUser._id.phone;

                    lenI = teamUser.batchs.length;
                    for (i = 0; i < lenI; i += 1) {
                      teamUserBatch = teamUser.batchs[i];
                      batch = {};

                      if ((teamUserBatch.departureTraffic._id.toString() ===
                          id &&
                          teamUserBatch.departureTraffic.isSm === true) ||
                          (teamUserBatch.returnTraffic._id.toString() === id &&
                          teamUserBatch.returnTraffic.isSm === true)) {
                        batch.batchNum = teamUserBatch.batchNum;

                        batchInfo = [];
                        if (teamUserBatch.guest !== '') {
                          batchInfo.push({ item: '收客:' + teamUserBatch.guest });
                        }

                        if (teamUserBatch[AgencyFund] &&
                            teamUserBatch[AgencyFund] !== '') {
                          batchInfo.push(
                            { item: '代收:' + teamUserBatch[AgencyFund] / (-100) }
                          );
                        }

                        if (teamUserBatch[Payment] &&
                            teamUserBatch[Payment] !== '') {
                          batchInfo.push(
                            { item: '代付:' + teamUserBatch[Payment] / 100 });
                        }

                        if (teamUserBatch[BatchNote] &&
                            teamUserBatch[BatchNote] !== '') {
                          batchInfo.push(
                            { item: '备注:' + teamUserBatch[BatchNote] });
                        }

                        batch.batchInfo = batchInfo;

                        persons = [];
                        isBatchOk = false;
                        lenK = teamUserBatch.persons.length;
                        for (k = 0; k < lenK; k += 1) {
                          teamUserBatchPerson = teamUserBatch.persons[k];
                          person = {};
                          if (teamUserBatchPerson[PERSON_ISSM] === true) {
                            if (isBatchOk) {
                              sn += 1;
                              person.sn = sn;
                              person.name = teamUserBatchPerson.name;
                              person.cardNum = teamUserBatchPerson.cardNum;
                              person.phone = teamUserBatchPerson.phone;
                              person.birthday =
                                teamUserBatchPerson.birthday.replace(/-/g, '');
                              person.sex = teamUserBatchPerson.sex;
                              person.cardCategory =
                                teamUserBatchPerson.cardCategory;
                              person.age = teamUserBatchPerson.age ?
                                teamUserBatchPerson.age : '';
                              person.ageType = teamUserBatchPerson.ageType;
                              person.room = teamUserBatchPerson.room;
                              // console.log(teamUserBatchPerson)
                              person.teamPersonNote =
                                teamUserBatchPerson[PersonNote];
                              persons.push(person);
                            } else {
                              sn += 1;
                              batch.sn = sn;
                              batch.name = teamUserBatchPerson.name;
                              batch.cardNum = teamUserBatchPerson.cardNum;
                              batch.phone = teamUserBatchPerson.phone;
                              batch.birthday =
                                teamUserBatchPerson.birthday.replace(/-/g, '');
                              batch.sex = teamUserBatchPerson.sex;
                              batch.cardCategory =
                                teamUserBatchPerson.cardCategory;
                              batch.age = teamUserBatchPerson.age ?
                                teamUserBatchPerson.age : '';
                              batch.ageType = teamUserBatchPerson.ageType;
                              batch.room = teamUserBatchPerson.room;
                              // console.log(teamUserBatchPerson)
                              batch.teamPersonNote =
                                teamUserBatchPerson[PersonNote];

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

                  smNumHB = ''; // 关联航班

                  lenJ = team.departureTraffics.length;
                  for (j = 0; j < lenJ; j += 1) {
                    if (sm.flight.flightNum !==
                        team.departureTraffics[j].flight.flightNum) {
                      if (team.departureTraffics[j].flight.flightDate) {
                        smNumHB =
                          moment(team.departureTraffics[j].flight.flightDate)
                          .format('YYYY-MM-DD') + ' ' +
                          team.departureTraffics[j].flight.flightNum + ' ' +
                          team.departureTraffics[j].flight.flightStartCity +
                          '-' + team.departureTraffics[j].flight.flightEndCity +
                          ' ' + moment(
                            team.departureTraffics[j].flight.flightStartTime
                          ).format('HH:mm') + '-' +
                          moment(team.departureTraffics[j].flight.flightEndTime)
                          .format('HH:mm');
                      }

                      break;
                    }
                  }

                  if (smNumHB === '') {
                    lenJ = team.returnTraffics.length;
                    for (j = 0; j < lenJ; j += 1) {
                      if (sm.flight.flightNum !==
                          team.returnTraffics[j].flight.flightNum) {
                        if (team.returnTraffics[j].flight.flightDate) {
                          smNumHB =
                            moment(team.returnTraffics[j].flight.flightDate)
                            .format('YYYY-MM-DD') + ' ' +
                            team.returnTraffics[j].flight.flightNum + ' ' +
                            team.returnTraffics[j].flight.flightStartCity +
                            '-' + team.returnTraffics[j].flight.flightEndCity +
                            ' ' + moment(
                              team.returnTraffics[j].flight.flightStartTime
                            ).format('HH:mm') + '-' +
                            moment(team.returnTraffics[j].flight.flightEndTime)
                            .format('HH:mm');
                        }

                        break;
                      }
                    }
                  }

                  // 集合地点 smSetPlace
                  if (sm.smType1 === 1) { // 送
                    airCode = sm.flight.flightNum.substr(0, 2);
                    SetPlace.findOneByAirCode(
                        CITY, airCode, function (err, setplace) {
                      setData = {};

                      if (err) { console.log(err); }

                      if (setplace) {
                        setData.smSetPlace = setplace.place;

                        if (sm.smType2 === 1) {
                          //console.log(setData.smSetPlace);
                          if (CITY === '深圳' &&
                            setData.smSetPlace ===
                              zxutil.config.SZ_SM_SEND_SET_PLACE_6) {
                            setData.smServer = zxutil.config.SZ_SEND_SERVER_6;
                          } else if (CITY === '广州' &&
                            setData.smSetPlace ===
                              zxutil.config.GZ_SM_SEND_SET_PLACE_2) {

                            setData.smServer = zxutil.config.GZ_SEND_SERVER_2;
                          } else if (CITY === '杭州' &&
                            setData.smSetPlace ===
                              zxutil.config.HZ_SM_SEND_SET_PLACE_7) {

                            setData.smServer = zxutil.config.HZ_SEND_SERVER_7;
                          } else {
                            setData.smServer = zxutil.config[CITY].SEND_SERVER;
                          }
                        } else {
                          setData.smServer = '待定';
                        }
                      } else {
                        setData.smSetPlace = '待定';
                        setData.smServer   = '待定';
                      }

                      setData.smDate =
                        moment(sm.flight.flightDate)
                          .format('YYYY-MM-DD');  // 送机日期
                      setData.smNumHB  = smNumHB; // 关联航班

                      setData.companyAbbr = team.companyAbbr;
                      setData.name = team.name;
                      setData.createAt =
                        moment(team.meta.createAt).format('YYYY-MM-DD');

                      setData.CHINAWORD = CHINAWORD;

                      setData.teamNum = team.teamNum;   // 团号
                      setData.lineName = team.lineName; // 线路名
                      setData.operator = team.operator; // 操作人
                      setData.teamType = team.teamType; // 团队类型
                      setData.smFlag = team.smFlag; // 送机旗号
                      setData.sendDriver = team.sendDriver; // 送机司机
                      setData.sendDestinationFlag =
                        team.sendDestinationFlag; // 地接旗号
                      setData.guide = team.guide; // 地接人员

                      setData.smAgencyFund = sm.smAgencyFund / (-100);
                      setData.smPayment = sm.smPayment / 100;

                      setData.smNum = sm.smNum;           // 送机单号
                      setData.smFlight = sm.smFlight;     // 送机航班
                      setData.smSetTime =
                        moment(sm.smSetTime).format('HH:mm'); // 集合时间

                      setData.smType =
                        '机场' + (sm.smType2 === 1 ? '内' : '外') + CHINAWORD + '机';
                      setData.smRealNumber = sm.smRealNumber;

                      setData.smNote = zxutil.delHtml(sm.smNote);

                      setData.users = users;

                      callback({
                        success: 1,
                        id: id,
                        isSV: isSV,
                        setData: setData,
                      });
                    });
                  } else {
                    setData = {};

                    setData.smSetPlace =
                      zxutil.config[CITY].SM_MEET_SET_PLACE; // 集合地点

                    if (sm.smType2 === 1) {
                      setData.smServer = zxutil.config[CITY].MEET_SERVER;
                    } else {
                      setData.smServer = '待定';
                    }

                    setData.smDate =
                      moment(sm.flight.flightDate)
                        .format('YYYY-MM-DD'); // 送机日期
                    setData.smNumHB  = smNumHB; // 关联航班

                    setData.companyAbbr = team.companyAbbr;
                    setData.name = team.name;
                    setData.createAt =
                      moment(team.meta.createAt).format('YYYY-MM-DD');

                    setData.CHINAWORD = CHINAWORD;

                    setData.teamNum = team.teamNum;       // 团号
                    setData.lineName = team.lineName;     // 线路名
                    setData.operator = team.operator;     // 操作人
                    setData.teamType = team.teamType;     // 团队类型
                    setData.smFlag = team.smFlag;         // 接机旗号
                    setData.sendDriver = team.meetDriver; // 接机司机

                    setData.smAgencyFund = sm.smAgencyFund / (-100);
                    setData.smPayment = sm.smPayment / 100;

                    setData.smNum = sm.smNum;           // 送机单号
                    setData.smFlight = sm.smFlight;     // 送机航班
                    setData.smSetTime =
                      moment(sm.smSetTime).format('HH:mm'); // 集合时间
                    setData.smType =
                      '机场' + (sm.smType2 === 1 ? '内' : '外') + CHINAWORD + '机';
                    setData.smRealNumber = sm.smRealNumber;

                    setData.smNote = zxutil.delHtml(sm.smNote);

                    setData.users = users;

                    callback({
                      success: 1,
                      id: id,
                      isSV: isSV,
                      setData: setData,
                    });
                  }
                }
              });
            }
          });
        } else {
          callback({});
        }
      });
    }
  };

  // 服务满意度
  changeSatisfaction = function (obj, callback) {
    var id               = obj.id;
    var satisfaction     = obj.satisfaction;
    var satisfactionNote = obj.satisfactionNote;
    var setData          = { satisfaction: satisfaction };

    if (satisfactionNote) {
      setData.satisfactionNote = satisfactionNote;
    }

    Sm.update({ _id: id }, { $set: setData }, function (err, isOk) {
      if (err) {
        errCode = _ERRS.CHANGE_SATISFACTION_ERR;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      if (isOk.nModified === 1 && isOk.n === 1) {
        callback({ success: 1 });
      } else {
        errCode = _ERRS.CHANGE_SATISFACTION_ERROR;
        zxutil.writeLog(ctrlName, errCode, {}, {
          _id: id,
          set: setData,
        });
        return callback({ success: errCode });
      }
    });
  };

  changeCarFees = function (obj, callback) {
    var id = obj.id;
    var carFees = obj.carFees;

    Sm.update(
      { _id: id },
      { $set: { carFees: carFees } },
      function (err, isOk) {
      if (err) {
        errCode = _ERRS.CHANGE_CARFEES_ERR;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      if (isOk.nModified === 1 && isOk.n === 1) {
        callback({ success: 1 });
      } else {
        errCode = _ERRS.CHANGE_CARFEES_ERROR;
        zxutil.writeLog(ctrlName, errCode, {}, obj);
        return callback({ success: errCode });
      }
    });
  };

  changeAddFees = function (obj, callback) {
    var id          = obj.id;
    var addFees     = obj.addFees;
    var addFeesNote = obj.addFeesNote;

    Sm.update(
      { _id: id },
      { $set: { addFees: addFees, addFeesNote: addFeesNote } },
      function (err, isOk) {
        if (err) {
          errCode = _ERRS.CHANGE_ADDFEES_ERR;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({ success: errCode });
        }

        if (isOk.nModified === 1 && isOk.n === 1) {
          callback({ success: 1 });
        } else {
          errCode = _ERRS.CHANGE_ADDFEES_ERROR;
          zxutil.writeLog(ctrlName, errCode, {}, obj);
          return callback({ success: errCode });
        }
      }
    );
  };

  sendWxMsg = function(id, callback) {
    Sm.findOne({_id: id}, function (err, sm) {
      if (!err && sm && sm.operator) {
        var matchs = sm.operator.match(/\d{11}/);
        var phone;
        var operator;

        if (matchs) {
          phone = matchs[0]
          operator = sm.operator.replace(phone, '')

          var Pingan = getCtrl(dbHost, dbName, 'pingan');
          // 检测 操作人是否在企业号通讯录
          Pingan.getWXInfoSm(phone, function (res) {
            if (res.success === 1) {
              // 发微信
              Pingan.sendWXMessageSm({
                token: res.token,
                userNames: [phone],
                msg: moment(sm.flight.flightDate).format('MM-DD') + ' ' +
                  sm.flight.flightNum + ' ' +
                  operator +
                  sm.smRealNumber +
                  '人团已确认\n请点击<a href=\"http://opt.zxsl.net.cn/detail/' +
                  sm._id + '/' +
                  dbName + '\">服务单详情页</a>查看名单'
              }, callback);
            } else {
              callback();
            }
          })
        } else {
          callback();
        }
      } else {
        callback();
      }
    })
  };

  changeSmStatus = function (obj, callback) {
    var id       = obj.id;
    var smStatus = obj.smStatus;

    Sm.update(
      { _id: id },
      { $set: { smStatus: smStatus } },
      function (err, isOk) {
        if (err) {
          errCode = _ERRS.CHANGE_SMSTATUS_ERR;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({ success: errCode });
        }

        if (isOk.nModified === 1 && isOk.n === 1) {
          // callback({ success: 1 });
          
          // 给操作人发微信
          // TODO: 为了不做大的修改，在这里暂时这样算，未来优化
          // 判断送机单和接机单 dbName
          if (smStatus === 2) {
            sendWxMsg(id, function () {
              callback({ success: 1 });
            })
          } else {
            callback({ success: 1 });
          }
        } else {
          errCode = _ERRS.CHANGE_SMSTATUS_ERROR;
          zxutil.writeLog(ctrlName, errCode, {}, obj);
          return callback({ success: errCode });
        }
      }
    );
  };

  changePhoneMsgStatus = function (obj, callback) {
    var id       = obj.id;
    var phoneMsgStatus = obj.phoneMsgStatus;

    Sm.update(
      { _id: id },
      { $set: { phoneMsgStatus: phoneMsgStatus } },
      function (err, isOk) {
        if (err) {
          errCode = _ERRS.CHANGE_PHONEMSGSTATUS_ERR;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({ success: errCode });
        }

        if (isOk.nModified === 1 && isOk.n === 1) {
          callback({ success: 1 });
        } else {
          errCode = _ERRS.CHANGE_PHONEMSGSTATUS_ERROR;
          zxutil.writeLog(ctrlName, errCode, {}, obj);
          return callback({ success: errCode });
        }
      }
    );
  };

  // TODO: 增加保险费字段和手工录入保险字段
  // （把手工录入的保险与系统生成的保险分开）
  changeInsurance = function (obj, callback) {
    var id       = obj.id;
    var insurance = obj.insurance;

    Sm.update(
      { _id: id },
      { $set: { insurance: insurance } },
      function (err, isOk) {
        if (err) {
          errCode = _ERRS.CHANGE_INSURANCE_ERR;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({ success: errCode });
        }

        if (isOk.nModified === 1 && isOk.n === 1) {
          callback({ success: 1 });
        } else {
          errCode = _ERRS.CHANGE_INSURANCE_ERROR;
          zxutil.writeLog(ctrlName, errCode, {}, obj);
          return callback({ success: errCode });
        }
      }
    );
  };

  // sm
  // company
  // team
  // user
  //  > SetPlace
  //  > Idcardsm
  // get 送机单接机单详情页 -getSmById
  getSmById = function (obj, callback) {
    Sm.findOne({ _id: obj.id }, function (err, sm) {

      if (err) { console.log(err); }

      if (sm) {
        sm = sm._doc;

        Company.findOne(
          { _id: sm.company },
          { isidcard: 1, feestemp: 1 },
          function (err, company) {
          var CITY = obj.CITY;

          var isidcard;

          if (err) { console.log(err); }

          if (company) {
            isidcard = company.isidcard || false;

            Feestemp.getMyFeestemp(
              { feestemp:  company.feestemp },
              function (myfeestemp) {
                if (err) { console.log(err); }

                Team.findOne({ _id: sm.team })
                .populate('departureTraffics')
                .populate('returnTraffics')
                .populate('users.batchs')
                .exec(function (err, team) {
                  var ids;
                  if (err) { console.log(err); }

                  if (team) {
                    team = team._doc;

                    ids = team.users.map(function (item) {
                      return item._id;
                    });

                    User.find(
                      { _id: { $in: ids } },
                      { password: 0 },
                      function (err, users) {
                      var airCode;
                      var userObj = {};
                      var userArr = [];

                      if (err) { console.log(err); }

                      if (users) {
                        users.forEach(function (item) {
                          userObj[item._id] = item;
                        });

                        team.users.forEach(function (item) {
                          userArr.push({
                            batchs: item.batchs,
                            _id: userObj[item._id],
                          });
                        });

                        team.users = userArr;

                        // smSetTime 改由 客户端 计算
                        if (sm.flight.flightEndCity.indexOf(CITY) === 0) {
                          sm.smType1 = 2; // 接

                          // sm.smSetTime =
                          //   zxutil.getSetTime(sm.flight.flightEndTime,
                          //     sm.smTimeSpace);
                        } else {
                          sm.smType1 = 1; // 送

                          // sm.smSetTime =
                          //   zxutil.getSetTime(sm.flight.flightStartTime,
                          //     sm.smTimeSpace);
                        }

                        // 集合地点   smSetPlace
                        // 接送机人员 smServer
                        if (sm.smType1 === 1) { // 送机单
                          airCode = sm.flight.flightNum.substr(0, 2);

                          //console.log(CITY);
                          //console.log(airCode);
                          SetPlace.findOneByAirCode(
                            CITY,
                            airCode,
                            function (err, setplace) {
                              if (err) { console.log(err); }

                              //console.log(setplace);
                              sm.smSetPlace = setplace ? setplace.place : '待定';
                              if (sm.smSetPlace === '待定') {
                                sm.smServer = '待定';
                              } else {
                                if (sm.smType2 === 1) {
                                  if (CITY === '深圳' &&
                                      sm.smSetPlace ===
                                      zxutil.config.SZ_SM_SEND_SET_PLACE_6) {

                                    sm.smServer =
                                      zxutil.config.SZ_SEND_SERVER_6;
                                  } else if (CITY === '广州' &&
                                      sm.smSetPlace ===
                                      zxutil.config.GZ_SM_SEND_SET_PLACE_2) {

                                    sm.smServer =
                                      zxutil.config.GZ_SEND_SERVER_2;
                                  } else if (CITY === '杭州' &&
                                      sm.smSetPlace ===
                                      zxutil.config.HZ_SM_SEND_SET_PLACE_7) {

                                    sm.smServer =
                                      zxutil.config.HZ_SEND_SERVER_7;
                                  } else {
                                    sm.smServer =
                                      zxutil.config[CITY].SEND_SERVER;
                                  }
                                } else {
                                  sm.smServer = '待定';
                                }
                              }

                              Idcardsm.find(
                                { sm: sm._id },
                                {
                                  name: 1,
                                  cardNum: 1,
                                  message: 1,
                                  createAt: 1,
                                },
                                function (err, idcardsms) {

                                  var cards = [];

                                  if (err) {
                                    console.log(err);
                                  }

                                  if (idcardsms) {
                                    cards = idcardsms;
                                  }

                                  // console.log('sm.fees------');
                                  // console.log(sm.fees);

                                  callback({
                                    sm: sm,
                                    team: team,
                                    isidcard: isidcard,
                                    idcardsms: cards,
                                    myfeestemp: myfeestemp,
                                  });
                                }
                              );
                            });
                        } else { // 接机单
                          sm.smSetPlace = zxutil.config[CITY].SM_MEET_SET_PLACE;
                          if (sm.smType2 === 1) { // 内
                            sm.smServer = zxutil.config[CITY].MEET_SERVER;
                          } else {
                            sm.smServer = '待定';
                          }

                          callback({
                            sm: sm,
                            team: team,
                            isidcard: false,
                            idcardsms: [],
                            myfeestemp: myfeestemp,
                          });
                        }
                      }
                    });
                  }
                });
              }
            );
          }
        });
      }
    });
  };

  setIdcardsmfees = function (obj) {
    Sm.update(
      { _id: obj.id },
      { $set: { idcardsmfees: obj.idcardsmfees } },
      function (err) {
        if (err) { console.log(err); }
      }
    );
  };

  saveSmWithMessage = function (obj, callback) {
    // if (obj.message) {
    // 保存到数据库
    var message = obj.message;

    message.createAt = Date.now();
    var newMessage = new Message(message);

    newMessage.save(function (err, message) {
      if (err) { console.log(err); }

      replaceSm(obj, function (result) {
        callback({ success: result.success, message: message });
      });
    });

    // } else {
    //   replaceSm(obj, callback);
    // }
  };

  replaceSm = function (obj, callback) {
    var smObj = obj.sm;
    var batchIds = obj.batchIds;
    var batchs = obj.batchs;

    if (batchIds.length > 0 && batchs.length > 0) {
      Sm.findOneAndUpdate({ _id: smObj._id }, smObj, function (err, sm) {
        if (err) {
          errCode = _ERRS.REPLACESM_1;
          zxutil.writeLog(ctrlName, errCode, {}, batchIds);
          return callback({ success: errCode });
        }

        if (sm) {
          Batch.remove({ $or: batchIds }, function (err) {
            if (err) {
              errCode = _ERRS.REPLACESM_2;
              zxutil.writeLog(ctrlName, errCode, {}, batchIds);
              return callback({ success: errCode });
            }

            Batch.create(batchs, function (err, bat) {
              if (err) {
                errCode = _ERRS.REPLACESM_3;
                zxutil.writeLog(ctrlName, errCode, {}, batchIds);
                return callback({ success: errCode });
              }

              if (bat) {
                callback({ success: 1 });
              } else {
                errCode = _ERRS.REPLACESM_4;
                zxutil.writeLog(ctrlName, errCode, {}, batchIds);
                return callback({ success: errCode });
              }
            });
          });
        } else {
          errCode = _ERRS.REPLACESM_5;
          zxutil.writeLog(ctrlName, errCode, {}, batchIds);
          return callback({ success: errCode });
        }
      });
    } else {
      errCode = _ERRS.REPLACESM_6;
      zxutil.writeLog(ctrlName, errCode, {}, batchIds);
      return callback({ success: errCode });
    }
  };

  // // 应该和saveSm结合
  // 团单中调用来添加送机单接机单
  // newOrAddSm = function (obj, callback) {
  //   callback(obj);
  // };

  // kb
  _unique = function (arr) {
    var result = [];
    var hash = {};
    var len = arr.length;
    var elem;
    var i;

    for (i = 0; i < len; i += 1) {
      elem = arr[i];

      if (!hash[elem]) {
        result.push(elem);
        hash[elem] = true;
      }
    }

    return result;
  };

  getKbServermans = function (callback) {
    Serverman
      .find()
      .distinct('name')
      .exec(function (err, servermans) {
        if (err) { console.log(err);}

        callback({ success: 1, servermans: servermans });
      }
    );
  };

  getKbSms = function (gotoday, callback) {
    // var _gt = moment().isAfter(gotoday) ? 1 : 0;

    Sm.find({ 'flight.flightDate': moment(gotoday), smStatus: { $gt: 1 } }, {
      team: 1,
      smType2: 1,
      operator: 1,
      flight: 1,
      smRealNumber: 1,
      smTimeSpace: 1,
      smAgencyFund: 1,
      smPayment: 1,
      phoneMsgStatus: 1,
      serverMan: 1,
      insurance: 1,
      smStatus: 1,
    }).exec(function (err, sms) {
      var flightNumArr = [];
      var smIds;
      var flightNumIds;

      if (err) { console.log(err);}

      smIds = sms.map(function (item) {
        return item._id;
      });

      flightNumArr = sms.map(function (item) {
        return item.flight.flightNum.substr(0, 2);
      });

      flightNumIds = _unique(flightNumArr);

      SetPlace.find({ airCode: { $in: flightNumIds } },
          { airCode: 1, place: 1 }, function (err, setPlaces) {
        if (err) { console.log(err); }

        Kanban.find(
          { sm: { $in: smIds } },
          {
            _id: 0,
            sm: 1,
            djpState: 1,
            flightState: 1,
            flyingStatusClass: 1,
            smAgencyFundState: 1,
            smPaymentState: 1,
            serverState: 1,
            smSetPlace: 1,
            djpNote: 1,
            serverNote: 1,
            flight_gai: 1,
            historys: 1,
            news: 1,
            wxServerState: 1,
          },
          function (err, kanbans) {
            var data;

            if (err) { console.log(err);}

            data = {
              sms: sms,
              kanbans: kanbans,
              setPlaces: setPlaces,
            };

            callback({ success: 1, data: data });
          }
        );
      });
    });
  };

  // 不用回调
  _newHistory = function (obj) {
    // Serverman.find()
    //   .distinct('name')
    //   .exec(function (err, servermans) {
    //     if (err) {
    //       errCode = _ERRS.CHANGE_INSURANCE_ERR;
    //       zxutil.writeLog(ctrlName, errCode, err, obj);
    //       return;
    //     }

    var history = {
      iTime: moment().format('HH:mm'),
    };

    // var filterServermans;

    var key = Object.keys(obj.set)[0];
    var st;

    if (key === 'serverMan') {
      history.iText =
        obj.name + ' 修改现场:' + obj.set[key];
    } else if (key === 'smStatus') {
      if (obj.set[key] === 3) {
        st = '已完成';
      } else {
        st = '未完成';
      }

      history.iText =
        obj.name + ' 修改服务状态:' + st;
    } else if (key === 'flight') {
      history.iText =
        obj.name +
        ' 将 <del>' +
        moment(obj.old.flightDate).format('MM-DD') +
        ' ' +
        obj.old.flightNum +
        ' ' +
        obj.old.flightStartCity +
        '-' +
        obj.old.flightEndCity +
        ' ' +
        moment(obj.old.flightStartTime).format('HH:mm') +
        '-' +
        moment(obj.old.flightEndTime).format('HH:mm') +
        '</del> 修改 为 ' +
        moment(obj.set.flight.flightDate).format('MM-DD') +
        ' ' +
        obj.set.flight.flightNum +
        ' ' +
        obj.set.flight.flightStartCity +
        '-' +
        obj.set.flight.flightEndCity +
        ' ' +
        moment(obj.set.flight.flightStartTime).format('HH:mm') +
        '-' +
        moment(obj.set.flight.flightEndTime).format('HH:mm');
    } else {
      history.iText = '出错了, 通知老何';
    }

    // // 过滤 obj.name
    // filterServermans = servermans.filter(function (item) {
    //   return item !== obj.name;
    // });

    // 因为不用回调，无需 new 选项
    Kanban.findOneAndUpdate(
      { sm: obj.id },
      {
        $push: { historys: history },

        // $addToSet: { news: { $each: filterServermans } },
      },
      { upsert: true },
      function (err) {
      if (err) {
        errCode = _ERRS.CHANGE_INSURANCE_ERR;
        zxutil.writeLog(ctrlName, errCode, err, obj);
      }
    });

    // });
  };

  smUpdate = function (obj, callback) {
    var id = obj.id;
    var set = obj.set;

    Sm.update(
      { _id: id },
      { $set: set },
      function (err, isOk) {
        if (err) {
          errCode = _ERRS.CHANGE_INSURANCE_ERR;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({ success: errCode });
        }

        if (isOk.nModified === 1 && isOk.n === 1) {
          _newHistory(obj);

          callback({ success: 1 });
        } else {
          errCode = _ERRS.CHANGE_INSURANCE_ERROR;
          zxutil.writeLog(ctrlName, errCode, {}, obj);
          return callback({ success: errCode });
        }
      }
    );
  };

  smFix = function (obj, callback) {
    var id = obj.id;
    var set = obj.set;

    Sm.update(
      { _id: id },
      { $set: set },
      function (err, isOk) {
        if (err) {
          errCode = _ERRS.CHANGE_INSURANCE_ERR;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({ success: errCode });
        }

        if (isOk.nModified === 1 && isOk.n === 1) {
          var kSet = {
            flightDate_old: obj.old.flightDate,
            flightNum_old: obj.old.flightNum,
            flightStartCity_old: obj.old.flightStartCity,
            flightEndCity_old: obj.old.flightEndCity,
            flightStartTime_old: obj.old.flightStartTime,
            flightEndTime_old: obj.old.flightEndTime,
          };

          var history = {
            iTime: moment().format('HH:mm'),
          };

          history.iText =
            obj.name +
            ' 将 <del>' +
            moment(obj.old.flightDate).format('MM-DD') +
            ' ' +
            obj.old.flightNum +
            ' ' +
            obj.old.flightStartCity +
            '-' +
            obj.old.flightEndCity +
            ' ' +
            moment(obj.old.flightStartTime).format('HH:mm') +
            '-' +
            moment(obj.old.flightEndTime).format('HH:mm') +
            '</del> 改签 为 ' +
            moment(obj.set.flight.flightDate).format('MM-DD') +
            ' ' +
            obj.set.flight.flightNum +
            ' ' +
            obj.set.flight.flightStartCity +
            '-' +
            obj.set.flight.flightEndCity +
            ' ' +
            moment(obj.set.flight.flightStartTime).format('HH:mm') +
            '-' +
            moment(obj.set.flight.flightEndTime).format('HH:mm');

          Kanban.findOneAndUpdate(
            { sm: id },
            { $set: { flight_gai: kSet }, $push: { historys: history } },
            { new: true, upsert: true },
            function (err, kb) {
              if (err) {
                errCode = _ERRS.CHANGE_INSURANCE_ERR;
                zxutil.writeLog(ctrlName, errCode, err, obj);
                return callback({ success: errCode });
              }

              if (kb) {
                callback({ success: 1 });
              } else {
                errCode = _ERRS.CHANGE_INSURANCE_ERROR;
                zxutil.writeLog(ctrlName, errCode, {}, obj);
                return callback({ success: errCode });
              }
            }
          );
        } else {
          errCode = _ERRS.CHANGE_INSURANCE_ERROR;
          zxutil.writeLog(ctrlName, errCode, {}, obj);
          return callback({ success: errCode });
        }
      }
    );
  };

  kanbanUpdate = function (obj, callback) {
    var sm = obj.sm;
    var set = obj.set;

    var history = {
      iTime: moment().format('HH:mm'),
    };

    var key = Object.keys(obj.set)[0];

    if (key === 'djpState') {
      history.iText =
        obj.name + ' 修改登机牌状态:' + obj.set[key];
    } else if (key === 'smSetPlace') {
      history.iText =
        obj.name + ' 修改门:' + obj.set[key];
    } else if (key === 'flightState') {
      history.iText =
        obj.name + ' 修改航班状态:' + obj.set[key];
    } else if (key === 'smAgencyFundState') {
      history.iText =
        obj.name + ' 修改代收状态:' + obj.set[key];
    } else if (key === 'smPaymentState') {
      history.iText =
        obj.name + ' 修改代付状态:' + obj.set[key];
    } else if (key === 'djpNote') {
      history.iText =
        obj.name + ' 修改登机牌备注:' + obj.set[key];
    } else if (key === 'serverNote') {
      history.iText =
        obj.name + ' 修改服务备注:' + obj.set[key];
    } else if (key === 'wxServerState') {
      history.iText =
        obj.name + ' 发送完成微信';
    } else {
      history.iText = '出错了, 通知老何';
    }

    Kanban.findOneAndUpdate(
      { sm: sm },
      { $set: set, $push: { historys: history } },
      { new: true, upsert: true },
      function (err, kb) {
        if (err) {
          errCode = _ERRS.CHANGE_INSURANCE_ERR;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({ success: errCode });
        }

        if (kb) {
          callback({ success: 1 });
        } else {
          errCode = _ERRS.CHANGE_INSURANCE_ERROR;
          zxutil.writeLog(ctrlName, errCode, {}, obj);
          return callback({ success: errCode });
        }
      }
    );
  };

  // getKbSms = function (gotoday, callback) {
  //   Sm.find({ 'flight.flightDate': moment(gotoday), smStatus: { $gt: 1 } }, {
  //     team: 1,
  //     smType2: 1,
  //     operator: 1,
  //     flight: 1,
  //     smRealNumber: 1,
  //     smTimeSpace: 1,
  //     smAgencyFund: 1,
  //     smPayment: 1,
  //     phoneMsgStatus: 1,
  //     serverMan: 1,
  //     insurance: 1,
  //   }).exec(function (err, sms) {
  //     var flightNumArr = [];
  //     var smIds;
  //     var flightNumIds;

  //     if (err) { console.log(err);}

  //     smIds = sms.map(function (item) {
  //       return item._id;
  //     });

  //     flightNumArr = sms.map(function (item) {
  //       return item.flight.flightNum.substr(0, 2);
  //     });

  //     flightNumIds = _unique(flightNumArr);

  //     SetPlace.find({ airCode: { $in: flightNumIds } },
  //         { airCode: 1, place: 1 }, function (err, setPlaces) {
  //       if (err) { console.log(err); }

  //       Serverman
  //         .find()
  //         .distinct('name')
  //         .exec(function (err, servermans) {
  //           if (err) { console.log(err);}

  //           Kanban.find(
  //             { sm: { $in: smIds } },
  //             {
  //               _id: 0,
  //               sm: 1,
  //               djpState: 1,
  //               flightState: 1,
  //               flyingStatusClass: 1,
  //               smAgencyFundState: 1,
  //               smPaymentState: 1,
  //               serverState: 1,
  //               smSetPlace: 1,
  //               djpNote: 1,
  //               serverNote: 1,
  //               flight_gai: 1,
  //               historys: 1,
  //               news: 1,
  //             },
  //             function (err, kanbans) {
  //               var data;

  //               if (err) { console.log(err);}

  //               data = {
  //                 sms: sms,
  //                 servermans: servermans,
  //                 kanbans: kanbans,
  //                 setPlaces: setPlaces,
  //               };

  //               callback({ success: 1, data: data });
  //             }
  //           );
  //         });
  //     });
  //   });
  // };

  optGetlist = function (cid, gotoday, callback) {
    // var _gt = moment().isAfter(gotoday) ? 1 : 0;

    Sm.find({ company: cid, 'flight.flightDate': moment(gotoday), smStatus: { $gt: 1 } }, {
      team: 1,
      smType2: 1,
      operator: 1,
      flight: 1,
      smRealNumber: 1,
      smTimeSpace: 1,
      smAgencyFund: 1,
      smPayment: 1,
      phoneMsgStatus: 1,
      serverMan: 1,
      insurance: 1,
      smStatus: 1,
    }).exec(function (err, sms) {
      var flightNumArr = [];
      var smIds;
      var flightNumIds;

      if (err) { console.log(err);}

      smIds = sms.map(function (item) {
        return item._id;
      });

      flightNumArr = sms.map(function (item) {
        return item.flight.flightNum.substr(0, 2);
      });

      flightNumIds = _unique(flightNumArr);

      SetPlace.find({ airCode: { $in: flightNumIds } },
          { airCode: 1, place: 1 }, function (err, setPlaces) {
        if (err) { console.log(err); }

        Kanban.find(
          { sm: { $in: smIds } },
          {
            _id: 0,
            sm: 1,
            djpState: 1,
            flightState: 1,
            flyingStatusClass: 1,
            smAgencyFundState: 1,
            smPaymentState: 1,
            serverState: 1,
            smSetPlace: 1,
            djpNote: 1,
            serverNote: 1,
            flight_gai: 1,
            historys: 1,
            news: 1,
            wxServerState: 1,
          },
          function (err, kanbans) {
            var data;

            if (err) { console.log(err);}

            data = {
              sms: sms,
              kanbans: kanbans,
              setPlaces: setPlaces,
            };

            callback({ success: 1, data: data });
          }
        );
      });
    });
  }

  return {
    list: list,
    downloadSm: downloadSm,
    changeSatisfaction: changeSatisfaction,
    changeCarFees: changeCarFees,
    changeAddFees: changeAddFees,
    changeSmStatus: changeSmStatus,
    changePhoneMsgStatus: changePhoneMsgStatus,
    changeInsurance: changeInsurance,
    getSmById: getSmById,
    setIdcardsmfees: setIdcardsmfees,
    saveSmWithMessage: saveSmWithMessage,
    replaceSm: replaceSm,

    // kb
    getKbServermans: getKbServermans,
    getKbSms: getKbSms,
    smUpdate: smUpdate,
    smFix: smFix,
    kanbanUpdate: kanbanUpdate,
    optGetlist: optGetlist
  };
};

module.exports = createCtrl;
