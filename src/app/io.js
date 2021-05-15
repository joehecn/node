/* jshint
   node:  true, devel:  true, maxstatements: 130, maxparams: 6,
   maxerr: 50, nomen: true, regexp: true, maxdepth: 5
 */

/**
 * socket.io 模块
 * @module app/io
 */
'use strict';

// var alyunAppcode = '9e1999c4a62a48dc9cd94d7198c011e2';
// var avatarKey = '705c841dfae84982bfe13a708abfa59b';
var AppCode = 'ff5ba5464deb49b1af2cca75e402d17a';

var request = require('request');
// var gzt = require('./gzt.js');

// static variable
var IO_NAME = 'io';
var _ERRS = {
  // user
  changePassword: '20602',
  companylist: '20604',     // 此错误不抛到客户端
  userlist: '20605',        // 此错误不抛到客户端
  companyupdate: '20606',
  changeStatus: '20608',
  addUser: '20610',
  GET_BP_LIST: '20612',     // 此错误不抛到客户端
  ADD_BP: '20614',
  UPDATE_BP: '20616',
  REMOVE_BP: '20618',
  PINGAN_LIST: '20620',     // 此错误不抛到客户端
  UPPDATE_PINGAN: '20622',
  SAVE_PINGANS: '20624',    // 特殊， 客户端直接使用
  FIND_PINGANS: '20626',
  DJP_LIST: '20628',
  DJP_SETNAME: '20630',
  DJP_NOTE: '20632',
  FALG_LIST: '20634',       // 此错误不抛到客户端
  FLAG_ADD: '20636',
  FLAG_UPDATE: '20638',
  FLAG_REMOVE: '20640',
  GUIDE_LIST: '20642',      // 此错误不抛到客户端
  GUIDE_ADD: '20644',
  GUIDE_UPDATE: '20646',
  GUIDE_REMOVE: '20648',
  GUEST_LIST: '20650',      // 此错误不抛到客户端
  GUEST_ADD: '20652',
  GUEST_UPDATE: '20654',
  GUEST_REMOVE: '20656',
  OPERATOR_LIST: '20658',   // 此错误不抛到客户端
  OPERATOR_ADD: '20660',
  OPERATOR_UPDATE: '20662',
  OPERATOR_REMOVE: '20664',
  GET_MY_FEESTEMP: '20666', // 此错误不抛到客户端
  GET_ONE_COMPANY_BILL_LIST: '20668', // 此错误不抛到客户端
  GET_TEAM_LIST: '20670',   // 此错误不抛到客户端
  TEAM_DOWNLOAD: '20672',   // 此错误不抛到客户端
  GET_SM_LIST: '20674',     // 此错误不抛到客户端
  SM_DOWNLOAD: '20675',     // 此错误不抛到客户端
  GET_TEAM_USER: '20676',
  CHANGE_SATISFATION: '20678',
  CHANGE_CARFEES: '20680',
  CHANGE_ADDFEES: '20682',
  CHANGE_SMSTATUS: '20684',
  CHANGE_PHONEMSGTATUS: '20686',
  CHANGE_INSURANCE: '20681',
  TEAM_GETTEAMBYID: '20690',
  TEAM_POSTFLIGHTINFO: '20691',
  TEAM_ADDTEAM: '20685',
  TEAM_SAVETEAM: '20687',
  TEAM_REMOVETEAM: '20688',
  SM_GETSMBYID: '20692',
  SM_REPLACESM: '20694',
  SM_SETSENDTIME: '20696',
  SM_SAVESM: '20698',
  SM_SETDEFAULTFLAG: '20670',
  servermanadd: '20110',
  servermanupdate: '20111',
  servermanremove: '20112',
  feestempadd: '20190',
  feestempupdate: '20191',
  dengjipaiadd: '20120',
  dengjipaiupdate: '20121',
  dengjipairemove: '20122',
  TEAM_BY_COMPANYS: '20800',
};
var DB_CITY = require('./zxutil').DB_CITY;
var writeLog = require('./zxutil').writeLog;
var ROOMS = Object.keys(DB_CITY); // Array

// alidayu
var TopClient = require('./topClient').TopClient;
var client = new TopClient({
  appkey: '23337731',
  appsecret: '1cd2a1fedf8cda6bfa0869c3ef735772',
  REST_URL: 'http://gw.api.taobao.com/router/rest',
});

// var SMSClient = require('./dysms/index')
// // ACCESS_KEY_ID/ACCESS_KEY_SECRET 根据实际申请的账号信息进行替换
// var accessKeyId = 'LTAIFZFQRIgeosTY'
// var secretAccessKey = 'P8hpFerMEQ9ZT2GyzEEG9TCrnAGyg5'
// //在云通信页面开通相应业务消息后，就能在页面上获得对应的queueName,不用填最后面一段
// var queueName = 'Alicom-Queue-1092064338910274-'
// //初始化sms_client
// var smsClient = new SMSClient({accessKeyId, secretAccessKey})

// 记录想要登录的客户端
// { '$uid': {'$sid' : true} }
var wantOnlineObj = {};

// 记录在房间的用户
// { uid: userObj }
var onlineObj = {};

var errCode;

// private methods
var _getWantOnlineObj;
var _setWantOnlineObj;
var _delWantOnlineObj;

var _getOnlineObj;
var _setOnlineObj;
var _delOnlineObj;

// module.exports
var listen;

_getWantOnlineObj = function (uid) {
  return wantOnlineObj[uid];
};

_setWantOnlineObj = function (uid, sid) {
  if (!wantOnlineObj[uid]) {
    wantOnlineObj[uid] = {};
  }

  wantOnlineObj[uid][sid] = true;
};

_delWantOnlineObj = function (uid) {
  delete wantOnlineObj[uid];
};

_getOnlineObj = function () {
  return onlineObj;
};

_setOnlineObj = function (userObj) {
  onlineObj[userObj._id] = userObj;
};

_delOnlineObj = function (uid) {
  if (onlineObj[uid]) {
    delete onlineObj[uid];
  }
};

listen = function (serv) {
  var io = require('socket.io').listen(serv);
  var ioJwt = require('socketio-jwt');

  var nspzx = io.of('/nspzx');
  var nspkb = io.of('/nspkb');

  var getCtrl = require('./ctrl');

  // One roundtrip
  nspzx.use(ioJwt.authorize({
    secret: process.env.JWT_TOKEN_SECRET,
    handshake: true,
  }));

  nspzx.on('connection', function (socket) {
    // 记录当前用户
    // { company: { _id, city, category, feestemp },
    //   _id,
    //   name,
    //   userName,
    //   status,
    //   role,
    //   companyAbbr }
    var userObj = {};

    var uid = socket.decoded_token.uid;
    var dbName = socket.handshake.query.dbName;

    // 权限
    var checkSys99 = false;
    var checkSys30 = false;
    var checkSys20 = false;
    var checkSys10 = false;
    var checkCus30 = false;
    var checkCus20 = false;
    var checkCus10 = false;

    // Ctrl
    var User;
    var Setplace;
    var Feestemp;
    var Dengjipai;
    var Serverman;
    var Bp;
    var Pingan;
    var Djp;
    var Flag;
    var Guide;
    var Guest;
    var Operator;
    var Team;
    var Sm;
    var Idcardsm;

    // private methods
    var _initUser;
    var _checkUidInRoom;
    var _joinRoom;

    _initUser = function (nspzx, socket, uid, dbName) {
      User = getCtrl(process.env.DB_HOST, dbName, 'user');
      User.initUser({
        uid: uid,
        dbName: dbName,
      }, function (results) {
        var ret;

        if (results.success === 1) {
          userObj = results.user;

          ret = _checkUidInRoom(nspzx, socket, uid);
          if (ret.somebodyInRoom) {
            // -A 服务器通知甲, 乙已经使用此账号进入房间了
            // 是否要踢乙, 由甲决定
            socket.emit('semit-somebodyIsOnlined');
          } else {
            // 加入房间
            _joinRoom(User, nspzx, socket, uid, dbName, userObj);
          }
        } else {
          socket.emit('semit-joinRoomFail', results);
        }
      });
    };

    _checkUidInRoom = function (nspzx, socket, uid) {
      var leni = ROOMS.length;
      var i;
      var roomObj;
      var socketIdArr;
      var lenj;
      var j;
      var socketAnother;

      for (i = 0; i < leni; i += 1) {
        roomObj = socket.adapter.rooms[ROOMS[i]];
        if (roomObj) {
          socketIdArr = Object.keys(roomObj.sockets);
          lenj = socketIdArr.length;
          for (j = 0; j < lenj; j += 1) {
            socketAnother = nspzx.connected[socketIdArr[j]];
            if (socketAnother.id !== socket.id &&
              socketAnother.decoded_token.uid === uid) {

              return {
                somebodyInRoom: true,
                id: socketAnother.id,
              };
            }
          }
        }
      }

      return {
        somebodyInRoom: false,
      };
    };

    _joinRoom = function (User, nspzx, socket, uid, dbName, userObj) {
      // 加入房间前清场
      ROOMS.forEach(function (roomName) {
        var roomObj = socket.adapter.rooms[roomName];
        var socketIdArr;
        if (roomObj) {
          socketIdArr = Object.keys(roomObj.sockets);
          socketIdArr.forEach(function (socketId) {
            var socketAnother = nspzx.connected[socketId];
            if (socketAnother.decoded_token.uid === uid) {
              if (socketAnother.id === socket.id) {
                socketAnother.leave(roomName);
              } else {
                // 通知对方下线
                socket.broadcast.to(socketId)
                  .emit('semit-cancelSomebodyOnline');
              }
            }
          });
        }
      });

      socket.join(dbName);

      _setOnlineObj({
        dbName: dbName,
        socketId: socket.id,

        companyId: userObj.company._id,
        companyCategory: userObj.company.category,
        companyCity: userObj.company.city,

        _id: userObj._id,
        name: userObj.name,
        userName: userObj.userName,
        status: userObj.status,
        role: userObj.role,
        companyAbbr: userObj.companyAbbr,
      });

      // 服务器通知自己被加入房间
      socket.emit('semit-somebodyIsJoinRoom', userObj);

      // 业务逻辑
      // 统一计算权限
      // 权限
      checkSys99 = false;
      checkSys30 = false;
      checkSys20 = false;
      checkSys10 = false;
      checkCus30 = false;
      checkCus20 = false;
      checkCus10 = false;

      if (userObj.role === 99) {
        checkSys99 = true;
      } else if (userObj.company.category === 30) {
        if (userObj.role === 30) {
          checkSys30 = true;
          checkSys20 = true;
          checkSys10 = true;
        } else if (userObj.role === 20) {
          checkSys20 = true;
          checkSys10 = true;
        } else if (userObj.role === 10) {
          checkSys10 = true;
        }
      } else {
        if (userObj.role === 30) {
          checkCus30 = true;
          checkCus20 = true;
          checkCus10 = true;
        } else if (userObj.role === 20) {
          checkCus20 = true;
          checkCus10 = true;
        } else if (userObj.role === 10) {
          checkCus10 = true;
        }
      }

      // 初始化 controllers
      Setplace = getCtrl(process.env.DB_HOST, dbName, 'setplace');
      Feestemp = getCtrl(process.env.DB_HOST, dbName, 'feestemp');
      Dengjipai = getCtrl(process.env.DB_HOST, dbName, 'dengjipai');
      Serverman = getCtrl(process.env.DB_HOST, dbName, 'serverman');
      Bp = getCtrl(process.env.DB_HOST, dbName, 'bp');
      Pingan = getCtrl(process.env.DB_HOST, dbName, 'pingan');
      Djp = getCtrl(process.env.DB_HOST, dbName, 'djp');
      Flag = getCtrl(process.env.DB_HOST, dbName, 'flag');
      Guide = getCtrl(process.env.DB_HOST, dbName, 'guide');
      Guest = getCtrl(process.env.DB_HOST, dbName, 'guest');
      Operator = getCtrl(process.env.DB_HOST, dbName, 'operator');
      Team = getCtrl(process.env.DB_HOST, dbName, 'team');
      Sm = getCtrl(process.env.DB_HOST, dbName, 'sm');
      Idcardsm = getCtrl(process.env.DB_HOST, dbName, 'idcardsm');
    };

    // Start -----------------------------------------------------------
    // 检测用户相应权限
    _initUser(nspzx, socket, uid, dbName);

    // -D 服务器收到来自甲的通知，甲想要登录房间
    socket.on('cemit-somebodyWantOnline', function () {
      var ret = _checkUidInRoom(nspzx, socket, uid);

      if (ret.somebodyInRoom) {
        // 记录
        _setWantOnlineObj(uid, socket.id);

        // 服务器广播通乙，甲想要登录
        // 是否拒绝甲, 由乙决定
        socket.broadcast.to(ret.id)
          .emit('sbroadcast-somebodyWantOnline', socket.id);
      }
    });

    // 通知服务器自己进入房间
    socket.on('cemit-somebodyJoinRoom', function () {
      // 加入房间
      _joinRoom(User, nspzx, socket, uid, dbName, userObj);
    });

    // 通知服务器是否拒绝其他人进入房间
    socket.on('cemit-cancelSomebodyOnline', function (iscancel) {
      // console.log('-----------BEGIN socket.on cemit-cancelSomebodyOnline');
      var wantOnlineSocketIdArrs = [];
      var wantOnlineUidObj = _getWantOnlineObj(uid);

      if (wantOnlineUidObj) {
        wantOnlineSocketIdArrs = Object.keys(wantOnlineUidObj);
        _delWantOnlineObj(uid);
      }

      wantOnlineSocketIdArrs.forEach(function (socketId) {
        if (nspzx.connected[socketId]) {

          if (!iscancel) {
            // 通知自己下线
            socket.emit('semit-cancelSomebodyOnline');

            // 则有且仅有一个 iscancel = false
            iscancel = true;
          } else {
            // 通知对方下线
            socket.broadcast.to(socketId).emit('semit-cancelSomebodyOnline');
          }
        }
      });

      // console.log('-----------END socket.on cemit-cancelSomebodyOnline');
    });

    // // 切换城市 checkCus10
    // socket.on('cemit-changeRoom', function (dbname) {
    //   dbName = dbname;

    //   _initUser(nspzx, socket, uid, dbName);
    // });

    // 修改密码 checkSys10 or checkCus10
    socket.on('cemit-changePassword', function (obj, callback) {
      if (checkSys10 || checkCus10) {
        User.changePassword(obj, callback);
      } else {
        errCode = _ERRS.changePassword;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode }); // 权限不够
      }
    });

    // 团队单列表
    socket.on('cemit-getTeamList', function (obj, callback) {
      if (checkCus10 || checkSys20) {
        if (checkCus10) {
          obj.cid = userObj.company._id;
          obj.uid = userObj._id;
        }

        Team.list(obj, callback);
      } else {
        errCode = _ERRS.GET_TEAM_LIST;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({});
      }
    });

    // -- 团队单列表 下载团队单
    socket.on('cemit-downloadTeam', function (obj, callback) {
      // obj: { id, isDownload }
      if (checkCus10 || checkSys20) {
        obj.CITY = DB_CITY[dbName];
        Team.downloadTeam(obj, callback);
      } else {
        errCode = _ERRS.TEAM_DOWNLOAD;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({});
      }
    });

    // get 团队单详情页 -getTeamById
    socket.on('cemit-getTeamById', function (obj, callback) {
      if (checkCus10 || checkSys10) {
        Team.getTeamById(obj, callback);
      } else {
        errCode = _ERRS.TEAM_GETTEAMBYID;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({});
      }
    });

    // 新建团队单 - 获取ObjectId
    socket.on('cemit-getObjectIdsFromServer', function (len, callback) {
      Team.getObjectIds(len, callback);
    });

    // 团队单 - 获取航班信息
    socket.on('cemit-postFlightInfo', function (obj, callback) {
      if ((checkCus10 || checkSys10) &&
        obj.flightDate.trim() && obj.flightNum.trim()) {
        Team.postFlightInfo(obj, callback);
      } else {
        errCode = _ERRS.TEAM_POSTFLIGHTINFO;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    socket.on('cemit-addTeam', function (obj, callback) {
      if (checkCus10 || checkSys20) {
        Team.addTeam(obj, callback);
      } else {
        errCode = _ERRS.TEAM_ADDTEAM;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    socket.on('cemit-saveTeam', function (obj, callback) {
      if (checkCus10 || checkSys20) {
        Team.saveTeam(obj, function (result) {

          if (result.success === 1 && result.messages) {
            // TODO: 只发给相关用户
            // 对除自己外的其它所有用户发布修改单成功消息
            var i;
            for (i = 0; i < result.messages.length; i += 1) {
              socket.broadcast.emit('on-socket-broadcast-message',
                result.messages[i]);
            }
          }

          callback({ success: result.success });
        });
      } else {
        errCode = _ERRS.TEAM_SAVETEAM;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    // socket.on('cemit-saveTeam', function (obj, callback) {
    //   if (checkCus10 || checkSys20) {
    //     Team.saveTeam(obj, callback);
    //   } else {
    //     errCode = _ERRS.TEAM_SAVETEAM;
    //     writeLog(IO_NAME, errCode, {}, userObj);
    //     callback({ success: errCode });
    //   }
    // });

    // // 添加送机单 接机单 team 和 sm 结合
    // // 应该和 saveSm 结合
    // socket.on('cemit-newOrAddSm', function (obj, callback) {
    //   Sm.newOrAddSm(obj, function (result) {
    //     if (result.isNew === true) {
    //       socket.broadcast.emit('on-socket-broadcast-message',
    //         result.message);
    //     }

    //     callback(result);
    //   });
    // });

    socket.on('cemit-removeTeam', function (obj, callback) {
      if (checkCus10 || checkSys20) {
        Team.removeTeam(obj, callback);
      } else {
        errCode = _ERRS.TEAM_REMOVETEAM;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    // 服务单列表
    socket.on('cemit-getSmList', function (obj, callback) {
      if (checkCus10 || checkSys10) {
        obj.cid = userObj.company._id;
        obj.uid = userObj._id;
        obj.CITY = DB_CITY[dbName];
        obj.category = userObj.company.category;

        Sm.list(obj, callback);
      } else {
        errCode = _ERRS.GET_SM_LIST;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({});
      }
    });

    // -- 服务单列表 下载服务单
    socket.on('cemit-downloadSm', function (obj, callback) {
      if (checkCus10 || checkSys10) {
        obj.CITY = DB_CITY[dbName];
        Sm.downloadSm(obj, callback);
      } else {
        errCode = _ERRS.SM_DOWNLOAD;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({});
      }
    });

    // 服务单列表 - changeSatisfaction 服务满意度
    socket.on('cemit-changeSatisfaction', function (obj, callback) {
      if (checkCus10) {
        Sm.changeSatisfaction(obj, callback);
      } else {
        errCode = _ERRS.CHANGE_SATISFATION;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    // 服务单列表 - changeCarFees 交通
    socket.on('cemit-changeCarFees', function (obj, callback) {
      if (checkSys20) {
        Sm.changeCarFees(obj, callback);
      } else {
        errCode = _ERRS.CHANGE_CARFEES;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    // 服务单列表 - changeAddFees 服务费 addFees 部分
    socket.on('cemit-changeAddFees', function (obj, callback) {
      if (checkSys20) {
        Sm.changeAddFees(obj, callback);
      } else {
        errCode = _ERRS.CHANGE_ADDFEES;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    // 服务单列表 - 状态
    socket.on('cemit-changeSmStatus', function (obj, callback) {
      if (checkSys10) {
        Sm.changeSmStatus(obj, callback);
      } else {
        errCode = _ERRS.CHANGE_SMSTATUS;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    // 服务单列表 - 短信
    socket.on('cemit-changePhoneMsgStatus', function (obj, callback) {
      if (checkSys10) {
        Sm.changePhoneMsgStatus(obj, callback);
      } else {
        errCode = _ERRS.CHANGE_PHONEMSGTATUS;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    // 服务单列表 - 保险
    socket.on('cemit-changeInsurance', function (obj, callback) {
      if (checkSys10) {
        Sm.changeInsurance(obj, callback);
      } else {
        errCode = _ERRS.CHANGE_INSURANCE;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    // get 服务单（送机单接机单）详情页 -getSmById
    socket.on('cemit-getSmById', function (obj, callback) {
      if (checkCus10 || checkSys10) {
        obj.CITY = DB_CITY[dbName];
        Sm.getSmById(obj, callback);
      } else {
        errCode = _ERRS.SM_GETSMBYID;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({});
      }
    });

    // 离弦之箭
    socket.on('cemit-setIdcardsmfees', function (obj) {
      if (checkCus10 || checkSys10) {
        Sm.setIdcardsmfees(obj);
      }
    });

    // 自动验证
    // 建立自己的数据库，先查自己的数据库
    // 查找 cardNum
    // 如果找到了 返回 姓名一致不一致
    // 如果没找到 向收费服务器继续请求
    // 将收费服务器一致的条目入此库，离弦之箭
    socket.on('cemit-getAvatarIdcardsmCertificate', function (obj, callback) {
      // 在自己的数据库中找
      Idcardsm.findIdcard({ cardNum: obj.cardNum }, function (result) {
        if (result.idcard) {
          if (result.idcard.name === obj.name) {
            obj.message = '一致';
          } else {
            obj.message = '不一致';
          }

          Idcardsm.add(obj);

          callback({
            error_code: 0,
            result: {
              message: obj.message,
            },
          });
        } else {
          // 阿里云易源数据
          // https://market.aliyun.com/products/57000002/cmapi015837.html?spm=5176.2020520132.101.6.17927218Vrhcl0#sku=yuncode983700006

          // { showapi_res_error: '',
          //   showapi_res_id: '0358287eeb55445393781a9f706eee53',
          //   showapi_res_code: 0,
          //   showapi_res_body:
          //    { ret_code: 0,
          //      code: 0,
          //      msg: '匹配',
          //      birthday: '1977-06-06',
          //      sex: 'M',
          //      address: '湖南南县' } }
          
          var url =
            'http://idcard3.market.alicloudapi.com/idcardAudit?idcard=' +
            obj.cardNum +
            '&name=' +
            encodeURI(obj.name);

          request({
            url: url,
            json: true,
            headers: {
              Authorization: 'APPCODE ' + AppCode
            }
          }, function (error, response, body) {
            if (error || (response.statusCode !== 200 && response.statusCode !== 404)) {
              callback({
                error_code: 999,
                reason: '请求失败',
              });
            } else {
              var _body = {
                error_code: body.showapi_res_code,
                result: {}
              };

              if (response.statusCode === 200 && _body.error_code === 0) {
                if (body.showapi_res_body.code === 0) {
                  _body.result.message = '一致'
                } else {
                  _body.result.message = body.showapi_res_body.msg
                }
              } else {
                _body.result.message = body.showapi_res_error
              }

              obj.message = _body.result.message;
              if (obj.message) { // BUG: 有时候会出现没有 message 的情况，还没有找到原因
                // console.log('Idcardsm.add')
                Idcardsm.add(obj);
              }

              if (obj.message === '一致') {
                // console.log('Idcardsm.addToIdCard')
                Idcardsm.addToIdCard({
                  cardNum: obj.cardNum,
                  name: obj.name,
                });
              }

              callback(_body);
            }
          });

          // var realname = obj.name;
          // var idcard = obj.cardNum;

          // 国政通
          // console.log('国政通')
          // gzt(obj.name + ',' + obj.cardNum, function (xmlObj) {
          //   // console.log(xmlObj)
          //   if (xmlObj.data &&
          //       xmlObj.data.message.status === '0' &&
          //       xmlObj.data.policeCheckInfos.policeCheckInfo.message.status === '0') {
              
          //     var _msg = xmlObj.data.policeCheckInfos.policeCheckInfo.compResult.$t
              
          //     obj.message = _msg;
          //     Idcardsm.add(obj);

          //     // 查询成功
          //     if (_msg === '一致') {
          //       Idcardsm.addToIdCard({
          //         cardNum: obj.cardNum,
          //         name: obj.name,
          //       });
          //     }

          //     callback({
          //       error_code: 0,
          //       result: {
          //         message: _msg,
          //       },
          //     });
          //   } else {
          //     // avatardata
          //     // zhixiangshanglv yangguang2016!
          //     url = 'http://api.avatardata.cn/IdCardCertificate/Verify?key=' +
          //       avatarKey +
          //       '&realname=' +
          //       encodeURI(realname) +
          //       '&idcard=' +
          //       idcard;

          //     request.get({ url: url, json: true },
          //         function (error, response, body) {

          //       if (error || response.statusCode !== 200) {
          //         callback({
          //           error_code: 999,
          //           reason: '请求失败',
          //         });
          //         return;
          //       }

          //       //body
          //       //{ error_code: 10010, reason: '请求超过次数限制，请购买套餐' }

          //       if (body.error_code === 0) {
          //         // 查询成功
          //         // 写入数据库
          //         obj.message = body.result.message;
          //         Idcardsm.add(obj);

          //         if (obj.message === '一致') {
          //           Idcardsm.addToIdCard({
          //             cardNum: obj.cardNum,
          //             name: obj.name,
          //           });
          //         }
          //       }

          //       callback(body);
          //     });
          //   }
          // })

          // // 阿里云
          // var url = 'http://jisusfzsm.market.alicloudapi.com/idcardverify/verify?idcard=' +
          //   idcard +
          //   '&realname=' +
          //   encodeURI(realname);

          // request({
          //   url: url,
          //   json: true,
          //   headers: {
          //     Authorization: 'APPCODE ' + alyunAppcode
          //   }
          // }, function (error, response, body) {
          //   if (error || (response.statusCode !== 200 && response.statusCode !== 404)) {
          //     // avatardata
          //     // zhixiangshanglv yangguang2016!
          //     url = 'http://api.avatardata.cn/IdCardCertificate/Verify?key=' +
          //       avatarKey +
          //       '&realname=' +
          //       encodeURI(realname) +
          //       '&idcard=' +
          //       idcard;

          //     request.get({ url: url, json: true },
          //         function (error, response, body) {

          //       if (error || response.statusCode !== 200) {
          //         callback({
          //           error_code: 999,
          //           reason: '请求失败',
          //         });
          //         return;
          //       }

          //       //body
          //       //{ error_code: 10010, reason: '请求超过次数限制，请购买套餐' }

          //       if (body.error_code === 0) {
          //         // 查询成功
          //         // 写入数据库
          //         obj.message = body.result.message;
          //         Idcardsm.add(obj);

          //         if (obj.message === '一致') {
          //           Idcardsm.addToIdCard({
          //             cardNum: obj.cardNum,
          //             name: obj.name,
          //           });
          //         }
          //       }

          //       callback(body);
          //     });
          //   } else {
          //     var _body = {
          //       error_code: Number(body.status),
          //       result: {}
          //     };

          //     if (response.statusCode === 200 && _body.error_code === 0) {
          //       if (body.result.verifystatus === '0') {
          //         _body.result.message = '一致'
          //       } else {
          //         _body.result.message = body.result.verifymsg
          //       }
          //     } else {
          //       _body.result.message = body.msg
          //     }

          //     obj.message = _body.result.message;
          //     if (obj.message) { // BUG: 有时候会出现没有 message 的情况，还没有找到原因
          //       Idcardsm.add(obj);
          //     }

          //     if (obj.message === '一致') {
          //       Idcardsm.addToIdCard({
          //         cardNum: obj.cardNum,
          //         name: obj.name,
          //       });
          //     }

          //     callback(_body);
          //   }
          // });
        }
      });

      // // 模拟
      // setTimeout(function () {
      //   console.log('moni');
      //   var n = Math.floor(Math.random() * 10);
      //   if (n === 5) {
      //     obj.message = '不一致';
      //   } else {
      //     obj.message = '一致';
      //   }

      //   // Idcardsm.add(obj);

      //   callback({
      //     error_code: 0,
      //     result: {
      //       message: obj.message,
      //     },
      //   });
      // }, 1000);
    });

    // 送机单改变默认送机提前时间
    // 地接社 只能自己改自己，这里强行替换 _id, 偷笑
    socket.on('cemit-setSendSetTime', function (obj, callback) {
      if (checkCus10 || checkSys10) {
        if (checkCus10) {
          obj._id = userObj._id;
        }

        User.changeSendSetTime(obj, callback);
      } else {
        errCode = _ERRS.SM_SETSENDTIME;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    // 送机单接机单 alidayu 短信接口
    socket.on('cemit-alidayuSm', function (alidayu, callback) {
      /*var response = { result: { model: '101092261040^0', success: true },
                  request_id: 'zqdxrknti789' };*/

      /*{ result: { err_code: '0',
          model: '101091947527^1101570334261',
          success: true },
        request_id: '1476oi920ggsh' }

      { result: { model: '101092261040^0', success: true },
        request_id: 'zqdxrknti789' }*/
      client.execute(
        'alibaba.aliqin.fc.sms.num.send',
        alidayu.alidayu,
        function (error, response) {
          if (error) { console.log(error); }

          if (response && response.result && response.result.success) {
            // change phoneMsgStatus = 1
            Sm.changePhoneMsgStatus(
              { id: alidayu.sm_id, phoneMsgStatus: 1 },
              function (result) {
                response.dbinfo = result;
                callback(response);
              }
            );
          } else {
            callback(response);
          }
        }
      );

      //发送短信
      // smsClient.sendSMS({
      //     PhoneNumbers: alidayu.alidayu.rec_num,
      //     SignName: alidayu.alidayu.sms_free_sign_name,
      //     TemplateCode: alidayu.alidayu.sms_template_code,
      //     TemplateParam: JSON.stringify(alidayu.alidayu.sms_param)
      // }).then(function (res) {
      //   console.log(res)
      //   callback(res)
      //   // let {Code}=res
      //   // if (Code === 'OK') {
      //   //     //处理返回参数
      //   //     console.log(res)
      //   // }
      // }, function (err) {
      //     console.log(err)
      //     callback(err)
      // })

      //   , function (error, response) {
      //   if (error) { console.log(error); }
      //   console.log(response)
      //   // if (response && response.Code === 'OK') {

      //   // }
      //   callback(response)
      // })
    });

    // save sm
    socket.on('cemit-saveSmWithMessage', function (obj, callback) {
      if (checkCus10 || checkSys10) {
        Sm.saveSmWithMessage(obj, function (result) {
          if (result.success === 1) {
            // TODO: 只发给相关用户
            // 对除自己外的其它所有用户发布修改单成功消息
            socket.broadcast.emit('on-socket-broadcast-message',
              result.message);
          }

          callback(result);
        });
      } else {
        errCode = _ERRS.SM_SAVESM;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    socket.on('cemit-saveSm', function (obj, callback) {
      if (checkCus10 || checkSys10) {
        Sm.replaceSm(obj, callback);
      } else {
        errCode = _ERRS.SM_SAVESM;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    // remove sm
    socket.on('cemit-replaceSm', function (obj, callback) {
      if (checkCus10 || checkSys10) {
        Sm.replaceSm(obj, callback);
      } else {
        errCode = _ERRS.SM_REPLACESM;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    // Idcardsm
    // checkSys99 统计实名验证
    socket.on('cemit-aggregateMessage', function (obj, callback) {
      if (checkSys99) {
        Idcardsm.aggregateMessage(callback);
      } else {
        callback([]);
      }
    });

    socket.on('cemit-aggregateName', function (obj, callback) {
      if (checkSys99) {
        Idcardsm.aggregateName(callback);
      } else {
        callback([]);
      }
    });

    socket.on('cemit-addToIdCardFromIdCardSm', function (obj, callback) {
      if (checkSys99) {
        Idcardsm.addToIdCardFromIdCardSm(callback);
      } else {
        callback(0);
      }
    });

    // 导游旗
    // 地接社强制只能查自己公司
    socket.on('cemit-flagList', function (obj, callback) {
      // { company: _id }
      if (checkCus10 || checkSys20) {
        if (checkCus10) {
          obj.company = userObj.company._id;
        }

        Flag.list(obj, callback);
      } else {
        errCode = _ERRS.FALG_LIST;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback([]);
      }
    });

    // 地接社强制替换
    socket.on('cemit-flagAdd', function (obj, callback) {
      // { company: _id, name: obj.name, color: obj.color }
      if (checkCus10 || checkSys20) {
        if (checkCus10) {
          obj.company = userObj.company._id;
        }

        Flag.add(obj, callback);
      } else {
        errCode = _ERRS.FLAG_ADD;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    socket.on('cemit-flagUpdate', function (obj, callback) {
      if (checkCus10) {
        Flag.update(
          { _id: obj.id, name: obj.name, color: obj.color },
          callback
        );
      } else {
        errCode = _ERRS.FLAG_UPDATE;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    socket.on('cemit-flagRemove', function (obj, callback) {
      if (checkCus10) {
        Flag.remove(obj.id, callback);
      } else {
        errCode = _ERRS.FLAG_REMOVE;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    // 设置默认导游旗
    socket.on('cemit-setDefaultFlag', function (obj, callback) {
      // obj { _id, defaultFlag }
      if (checkCus10 || checkSys20) {
        if (checkCus10) {
          obj._id = userObj._id;
        }

        User.setDefaultFlag(obj, callback);
      } else {
        errCode = _ERRS.SM_SETDEFAULTFLAG;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    // 地接人员
    socket.on('cemit-guideList', function (obj, callback) {
      // { company: _id }
      if (checkCus10 || checkSys20) {
        if (checkCus10) {
          obj.company = userObj.company._id;
        }

        Guide.list(obj, callback);
      } else {
        errCode = _ERRS.GUIDE_LIST;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback([]);
      }
    });

    socket.on('cemit-guideAdd', function (obj, callback) {
      // {
      //   company: userObj.company._id,
      //   name: obj.name,
      //   sex: obj.sex,
      //   phone: obj.phone,
      // }
      if (checkCus10 || checkSys20) {
        if (checkCus10) {
          obj.company = userObj.company._id;
        }

        Guide.add(obj, callback);
      } else {
        errCode = _ERRS.GUIDE_ADD;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    socket.on('cemit-guideUpdate', function (obj, callback) {
      if (checkCus10) {
        Guide.update(
          {
            _id: obj.id,
            name: obj.name,
            sex: obj.sex,
            phone: obj.phone,
          },
          callback
        );
      } else {
        errCode = _ERRS.GUIDE_UPDATE;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    socket.on('cemit-guideRemove', function (obj, callback) {
      if (checkCus10) {
        Guide.remove(obj.id, callback);
      } else {
        errCode = _ERRS.GUIDE_REMOVE;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    // 收客单位
    socket.on('cemit-guestList', function (obj, callback) {
      // { company: _id }
      if (checkCus10 || checkSys20) {
        if (checkCus10) {
          obj.company = userObj.company._id;
        }

        Guest.list(obj, callback);
      } else {
        errCode = _ERRS.GUEST_LIST;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback([]);
      }
    });

    socket.on('cemit-guestAdd', function (obj, callback) {
      // {
      //   company: userObj.company._id,
      //   companyAbbr: obj.companyAbbr,
      //   name: obj.name,
      //   phone: obj.phone,
      // }
      if (checkCus10 || checkSys20) {
        if (checkCus10) {
          obj.company = userObj.company._id;
        }

        Guest.add(obj, callback);
      } else {
        errCode = _ERRS.GUEST_ADD;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    socket.on('cemit-guestUpdate', function (obj, callback) {
      if (checkCus10) {
        Guest.update(
          {
            _id: obj.id,
            companyAbbr: obj.companyAbbr,
            name: obj.name,
            phone: obj.phone,
          },
          callback
        );
      } else {
        errCode = _ERRS.GUEST_UPDATE;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    socket.on('cemit-guestRemove', function (obj, callback) {
      if (checkCus10) {
        Guest.remove(obj.id, callback);
      } else {
        errCode = _ERRS.GUEST_REMOVE;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    // 团队操作人
    socket.on('cemit-operatorList', function (obj, callback) {
      // { company: _id }
      if (checkCus10 || checkSys20) {
        if (checkCus10) {
          obj.company = userObj.company._id;
        }

        Operator.list(obj, callback);
      } else {
        errCode = _ERRS.OPERATOR_LIST;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback([]);
      }
    });

    socket.on('cemit-operatorAdd', function (obj, callback) {
      // {
      //   company: userObj.company._id,
      //   companyAbbr: obj.companyAbbr,
      //   name: obj.name,
      //   phone: obj.phone,
      // }
      if (checkCus10 || checkSys20) {
        if (checkCus10) {
          obj.company = userObj.company._id;
        }

        Operator.add(obj, callback);
      } else {
        errCode = _ERRS.OPERATOR_ADD;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    socket.on('cemit-operatorUpdate', function (obj, callback) {
      if (checkCus10) {
        Operator.update(
          {
            _id: obj.id,
            companyAbbr: obj.companyAbbr,
            name: obj.name,
            phone: obj.phone,
          },
          callback
        );
      } else {
        errCode = _ERRS.OPERATOR_UPDATE;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    socket.on('cemit-operatorRemove', function (obj, callback) {
      if (checkCus10) {
        Operator.remove(obj.id, callback);
      } else {
        errCode = _ERRS.OPERATOR_REMOVE;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode });
      }
    });

    // 服务费用标准
    socket.on('cemit-getMyFeestemp', function (obj, callback) {
      if (checkCus10) {
        Feestemp.getMyFeestemp({
          feestemp: userObj.company.feestemp,
        }, callback);
      } else {
        errCode = _ERRS.GET_MY_FEESTEMP;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({});
      }
    });

    // 对账单列表
    socket.on('cemit-getOneCompanyBillList', function (obj, callback) {
      var company;

      if (checkCus10 || checkSys20) {
        if (checkCus10) {
          company = userObj.company._id;
        } else {
          company = obj.cid || userObj.company._id;
        }

        Bp.getOneCompanyBillList({ company: company }, callback);
      } else {
        errCode = _ERRS.GET_ONE_COMPANY_BILL_LIST;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({});
      }
    });

    // 排班表 checkSys10
    // 保险卡 checkSys10
    socket.on('cemit-pinganlist', function (obj, callback) {
      // obj: { n, livedate, server, filter, cardtype }
      if (checkSys10) {
        obj.servermanSearch = {};
        obj.search = {};
        Pingan.list(obj, callback);
      } else {
        errCode = _ERRS.PINGAN_LIST;
        writeLog(IO_NAME, errCode, {}, obj);
        callback({}); // 权限不够
      }
    });

    socket.on('cemit-pinganupdate', function (obj, callback) {
      if (checkSys10) {
        Pingan.updatePingan(obj, callback);
      } else {
        errCode = _ERRS.UPPDATE_PINGAN;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode }); // 权限不够
      }
    });

    socket.on('cemit-pingansSave', function (arr, callback) {
      if (checkSys10) {
        Pingan.savePingans(arr, callback);
      } else {
        errCode = _ERRS.SAVE_PINGANS;
        writeLog(IO_NAME, errCode, {}, {});
        callback({ success: errCode }); // 权限不够
      }
    });

    socket.on('cemit-findPingansIn', function (arr, callback) {
      if (checkSys10) {
        Pingan.findPingansIn(arr, callback);
      } else {
        errCode = _ERRS.FIND_PINGANS;
        writeLog(IO_NAME, errCode, {}, {});
        callback({ success: errCode }); // 权限不够
      }
    });

    // for test
    // 测试保险卡号是否有重复
    socket.on('cemit-pinganTestRepeatCardNum', function (obj, callback) {
      Pingan.testRepeatCardNum(callback);
    });

    // 登机牌 checkSys10
    socket.on('cemit-djplist', function (obj, callback) {
      // obj { smdate }
      if (checkSys10) {
        Djp.djplist(obj, DB_CITY[dbName], callback);
      } else {
        errCode = _ERRS.DJP_LIST;
        writeLog(IO_NAME, errCode, {}, obj);
        callback({}); // 权限不够
      }
    });

    socket.on('cemit-djpSetName', function (obj, callback) {
      // obj: { sm, name }
      if (checkSys10) {
        Djp.setName(obj, callback);
      } else {
        errCode = _ERRS.DJP_SETNAME;
        writeLog(IO_NAME, errCode, {}, obj);
        callback({ success: errCode }); // 权限不够
      }
    });

    socket.on('cemit-djpnote', function (obj, callback) {
      // obj: { sm, djpNote }
      if (checkSys10) {
        Djp.setNote(obj, callback);
      } else {
        errCode = _ERRS.DJP_NOTE;
        writeLog(IO_NAME, errCode, {}, obj);
        callback({ success: errCode }); // 权限不够
      }
    });

    // 现场责任人 checkSys20
    socket.on('cemit-servermanlist', function (obj, callback) {
      if (checkSys20) {
        Serverman.list({ company: userObj.company._id }, callback);
      } else {
        callback([]);
      }
    });

    socket.on('cemit-servermanadd', function (obj, callback) {
      if (checkSys20) {
        Serverman.add(
          { company: userObj.company._id, name: obj.name },
          callback
        );
      } else {
        callback({ success: _ERRS.servermanadd });
      }
    });

    socket.on('cemit-servermanupdate', function (obj, callback) {
      if (checkSys20) {
        Serverman.update(
          { _id: obj.id, company: userObj.company._id, name: obj.name },
          callback
        );
      } else {
        callback({ success: _ERRS.servermanupdate });
      }
    });

    socket.on('cemit-servermanremove', function (obj, callback) {
      if (checkSys20) {
        Serverman.remove(obj.id, callback);
      } else {
        callback({ success: _ERRS.servermanremove });
      }
    });

    // 排班表管理 checkSys20
    // 往来账管理 checkSys20
    socket.on('cemit-getbplist', function (obj, callback) {
      if (checkSys20) {
        Bp.list(obj, { category: 20 }, callback);
      } else {
        errCode = _ERRS.GET_BP_LIST;
        writeLog(IO_NAME, errCode, {}, obj);
        callback({}); // 权限不够
      }
    });

    // -- 添加往来账
    socket.on('cemit-addBp', function (obj, callback) {
      if (checkSys20) {
        Bp.add(obj, callback);
      } else {
        errCode = _ERRS.ADD_BP;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode }); // 权限不够
      }
    });

    // -- 修改往来账
    socket.on('cemit-updateBp', function (obj, callback) {
      if (checkSys20) {
        Bp.update(obj, callback);
      } else {
        errCode = _ERRS.UPDATE_BP;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode }); // 权限不够
      }
    });

    // -- 删除往来账
    socket.on('cemit-removeBp', function (id, callback) {
      if (checkSys20) {
        Bp.remove(id, callback);
      } else {
        errCode = _ERRS.REMOVE_BP;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode }); // 权限不够
      }
    });

    // 应收款 checkSys20
    socket.on('cemit-getbillsnow', function (obj, callback) {
      if (checkSys20) {
        Bp.getbillsnow(callback);
      } else {
        callback({
          companys: [],
          statements: [],
          sms: [],
          bps: [],
        });
      }
    });

    // 对账单 - 公司列表 checkSys20
    socket.on('cemit-getBillByCompanysList', function (obj, callback) {
      if (checkSys20) {
        Bp.getBillByCompanysList(callback);
      } else {
        callback({});
      }
    });

    // 月账单列表 checkSys20
    socket.on('cemit-getbillsitemisedlist', function (obj, callback) {
      if (checkSys20) {
        Bp.billsitemisedlist(obj, callback);
      } else {
        callback({
          companys: [],
          statements: [],
        });
      }
    });

    // -- 月账单明细
    socket.on('cemit-getbillsitemised', function (obj, callback) {
      if (checkSys20) {
        Bp.getbillsitemised(obj, callback);
      } else {
        callback({
          sms: [],
          bps: [],
          companys: [],
          hasStatement: false,
          lastMonthBalance: 0,
          isLock: false,
        });
      }
    });

    // -- 对账单
    socket.on('cemit-getstatement', function (obj, callback) {
      if (checkCus10 || checkSys20) {
        Bp.getstatement(obj, callback);
      } else {
        callback({
          statement: null,
          company: null,
        });
      }
    });

    // -- 新建对账单
    socket.on('cemit-statementadd', function (obj, callback) {
      if (checkSys20) {
        Bp.statementadd(obj, callback);
      } else {
        callback({ success: 0 });
      }
    });

    // -- 删除对账单
    socket.on('cemit-statementremove', function (obj, callback) {
      if (checkSys20) {
        Bp.statementremove(obj, callback);
      } else {
        callback({ success: 0 });
      }
    });

    // -- 确认对账单
    socket.on('cemit-statementlock', function (obj, callback) {
      Bp.statementlock(obj, callback);
    });

    // 月账单汇总报表 checkSys20
    socket.on('cemit-getbillstotal', function (obj, callback) {
      if (checkSys20) {
        Bp.getbillstotal(obj, callback);
      } else {
        callback({
          sms: [],
        });
      }
    });

    // 集合地点管理 checkSys30
    socket.on('cemit-setplacelist', function (obj, callback) {
      if (checkSys30) {
        Setplace.list({}, callback);
      } else {
        callback([]);
      }
    });

    // 服务费模板管理 checkSys30
    socket.on('cemit-feestemplist', function (obj, callback) {
      if (checkSys30) {
        Feestemp.list({}, callback);
      } else {
        callback([]);
      }
    });

    socket.on('cemit-feestempadd', function (obj, callback) {
      if (checkSys30) {
        Feestemp.add(obj, callback);
      } else {
        callback({ success: _ERRS.feestempadd });
      }
    });

    socket.on('cemit-feestempupdate', function (obj, callback) {
      if (checkSys30) {
        Feestemp.update(obj, callback);
      } else {
        callback({ success: _ERRS.feestempupdate });
      }
    });

    // 登机牌用户管理 checkSys30
    socket.on('cemit-dengjipailist', function (obj, callback) {
      if (checkSys30) {
        Dengjipai.list({}, callback);
      } else {
        callback([]);
      }
    });

    socket.on('cemit-dengjipaiadd', function (obj, callback) {
      if (checkSys30) {
        Dengjipai.add(
          { name: obj.name, password: obj.password },
          callback
        );
      } else {
        callback({ success: _ERRS.dengjipaiadd });
      }
    });

    socket.on('cemit-dengjipaiupdate', function (obj, callback) {
      if (checkSys30) {
        Dengjipai.update(
          { _id: obj.id, name: obj.name, password: obj.password },
          callback
        );
      } else {
        callback({ success: _ERRS.dengjipaiupdate });
      }
    });

    socket.on('cemit-dengjipairemove', function (obj, callback) {
      if (checkSys30) {
        Dengjipai.remove(obj.id, callback);
      } else {
        callback({ success: _ERRS.dengjipairemove });
      }
    });

    // 公司列表 for teambycompanys
    socket.on('cemit-teamByCompanys', function (obj, callback) {
      if (checkSys20) {
        User.teamByCompanys(callback);
      } else {
        errCode = _ERRS.TEAM_BY_COMPANYS;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback([]); // 权限不够
      }
    });

    // 公司列表 checkSys20 checkSys99
    // callback({ companys, fees})
    socket.on('cemit-companylist', function (obj, callback) {
      if (checkSys20 || checkSys99) {
        User.companylist({ CITY: DB_CITY[dbName] }, callback);
      } else {
        errCode = _ERRS.companylist;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({}); // 权限不够
      }
    });

    // -- 修改公司信息 - checkSys30 checkSys99
    socket.on('cemit-updateCompany', function (obj, callback) {
      var companyObj = { set: {} };

      if (checkSys30 || checkSys99) {
        companyObj._id = obj.id;

        if (obj.set.name) {
          companyObj.set.name = obj.set.name;
        }

        // 只有超级管理员才能修改 公司类型
        // 超级管理员不能修改自己的公司的公司类型
        if (checkSys99 &&
          userObj.company._id.toString() !== obj.id &&
          (obj.set.category === 20 || obj.set.category === 30)) {
          companyObj.set.category = obj.set.category;
        }

        if (obj.set.hasOwnProperty('bankCard') &&
          typeof obj.set.bankCard === 'string') {

          companyObj.set.bankCard = obj.set.bankCard;
        }

        if (obj.set.feestemp && obj.set.feestemp !== '基础') {
          companyObj.set.feestemp = obj.set.feestemp;
        }

        if (obj.set.isidcard === true) {
          if (obj.set.idcardfee && Number(obj.set.idcardfee) <= 0) {
            companyObj.set.isidcard = false;
          } else {
            companyObj.set.isidcard = true;
          }
        } else {
          companyObj.set.isidcard = false;
        }

        if (obj.set.idcardfee || obj.set.idcardfee === 0) {
          companyObj.set.idcardfee = Number(obj.set.idcardfee);
        }

        User.companyUpdate(companyObj, callback);
      } else {
        errCode = _ERRS.companyupdate;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback({ success: errCode }); // 权限不够
      }
    });

    // 用户列表 checkCus10 checkSys10 checkSys99
    socket.on('cemit-userlist', function (obj, callback) {
      var seach;

      if (checkSys20 || checkSys99) {
        seach = { company: ((obj && obj.cid) || userObj.company._id) };
      } else if (checkSys10 || checkCus10) {
        seach = { company: userObj.company._id, status: true };
      }

      if (checkCus10 || checkSys10 || checkSys99) {
        User.list(seach, callback);
      } else {
        errCode = _ERRS.userlist;
        writeLog(IO_NAME, errCode, {}, userObj);
        callback([]); // 权限不够
      }
    });

    // -- 审核状态改变（通过/不通过）
    socket.on('cemit-changeStatus', function (obj, callback) {
      // obj: {_id, status}
      // 权限
      // checkSys30 || checkSys99
      if (checkSys30 || checkSys99) {
        User.changeStatus(obj, userObj.role, callback);
      } else {
        errCode = _ERRS.changeStatus;
        writeLog(IO_NAME, errCode, {}, obj);
        callback({ success: errCode }); // 权限不够
      }
    });

    // -- 重置密码
    socket.on('cemit-resetPassword', function (obj, callback) {
      // obj: {_id, password}
      // 权限 服务商总负责人30以上修改地接社 或者 userObj.role > obj.role
      User.resetPassword(obj, checkSys30, userObj.role, callback);
    });

    // -- 添加新用户
    socket.on('cemit-addUser', function (obj, callback) {
      // obj: {company, userName, password, name, companyAbbr, phone, role };
      var filterObj = {
        company: obj.company,
        userName: obj.userName,
        password: obj.password,
        name: obj.name,
        companyAbbr: obj.companyAbbr,
        phone: Number(obj.phone),
        role: Number(obj.role) || 0,
      };

      // 权限 1 只能添加自己公司的用户
      // 权限 2 userObj.role > filterObj.role
      // filterObj.company 说明 company存在
      if (userObj.company._id.toString() === filterObj.company &&
        userObj.role > filterObj.role) {

        User.add(filterObj, function (result) {
          // 过滤 user 字段
          if (result.success === 1) {
            callback({
              success: 1,
              user: {
                _id: result.user._id,
                userName: result.user.userName,
                phone: result.user.phone,
                role: result.user.role,
                status: result.user.status,
                name: result.user.name,
                companyAbbr: result.user.companyAbbr,
                meta: result.user.meta,
              },
            });
          } else {
            callback(result);
          }
        });
      } else {
        errCode = _ERRS.addUser;
        writeLog(IO_NAME, errCode, {}, filterObj);
        callback({ success: errCode }); // 权限不够
      }
    });

    // -- 修改用户信息
    socket.on('cemit-updateUser', function (obj, callback) {
      // obj { _id, role?, name?, phone?, companyAbbr? }
      // 权限：
      //   1 role !== 99
      //   2 自己可以修改自己
      //     * 自己不能改自己的 role
      //   3 服务商可以修改地接社
      //   4 同一公司只能修改权限比自己小的用户
      User.update(obj, {
        cid: userObj.company._id.toString(),
        category: userObj.company.category,
        id: userObj._id.toString(),
        role: userObj.role,
      }, callback);
    });

    // 在线用户 checkSys20 || checkSys99
    socket.on('cemit-getusers', function (obj, callback) {
      var len; // = Object.keys(io.sockets.connected);

      if (checkSys20 || checkSys99) {
        len = Object.keys(nspzx.connected).length;
        callback({ cookieUsers: _getOnlineObj(), clientsLength: len });
      } else {
        callback({ cookieUsers: {}, clientsLength: 0 });
      }
    });

    // 断开连接
    socket.on('disconnect', function () {
      _delOnlineObj(uid);

      // 更新用户最后登录时间
      User.changeUpdateAt(uid);
    });
  });

  nspkb.on('connection', function (socket) {
    // Model
    var getCtrl = require('./ctrl');
    var User = getCtrl(process.env.DB_HOST, 'auth', 'user');
    var Kblogin = getCtrl(process.env.DB_HOST, 'auth', 'kblogin');
    var afterCtrls = {}; // Sm

    // 记录当前用户
    var userObj = {};

    var _kbGetLoginObj;
    var _kbSetLoginObj;
    var getDbName;
    var getAfterCtrl;

    _kbGetLoginObj = function (key, callback) {
      Kblogin.getLoginObj(key, callback);
    };

    _kbSetLoginObj = function (userObj, callback) {
      Kblogin.setLoginObj(userObj, callback);
    };

    getDbName = function (key, callback) {
      if (!userObj.dbName) {
        _kbGetLoginObj(key, function (user) {
          if (user) {
            userObj = user;
            callback(userObj.dbName);
          } else {
            callback(null);
          }
        });
      } else {
        callback(userObj.dbName);
      }
    };

    getAfterCtrl = function (ctrlName, key, callback) {
      if (!afterCtrls[ctrlName]) {
        getDbName(key, function (dbName) {
          if (dbName) {
            afterCtrls[ctrlName] =
              getCtrl(process.env.DB_HOST, dbName, ctrlName);
            callback(afterCtrls[ctrlName]);
          } else {
            callback(null);
          }
        });
      } else {
        callback(afterCtrls[ctrlName]);
      }
    };

    // obj: { userName password }
    socket.on('cemit-login', function (obj, callback) {
      User.login(obj, function (results) {
        if (results.success === 1) {
          if (results.category === 30) {
            userObj = {
              // _id: results.profile.uid,
              userName: obj.userName,
              name: results.name,
              CITY: results.CITY,
              dbName: results.dbName,
              key: socket.id,
            };

            _kbSetLoginObj(userObj, callback);
          } else {
            callback({ success: 666001 }); // 公司权限不够
          }
        } else {
          callback(results);
        }
      });
    });

    socket.on('cemit-getServermans', function (obj, callback) {
      getAfterCtrl('sm', obj.key, function (Sm) {
        if (Sm) {
          Sm.getKbServermans(callback);
        } else {
          callback({ success: 'keyErr' });
        }
      });
    });

    // result = {
    //   sms: sms,
    //   servermans: servermans,
    //   kanbans: kanbans,
    //   setPlaces: setPlaces,
    // };
    socket.on('cemit-getSms', function (obj, callback) {
      getAfterCtrl('sm', obj.key, function (Sm) {
        if (Sm) {
          Sm.getKbSms(obj.gotoday, callback);
        } else {
          callback({ success: 'keyErr' });
        }
      });
    });

    // get 服务单（送机单接机单）详情页 -getSmById
    socket.on('cemit-getSmById', function (obj, callback) {
      getAfterCtrl('sm', obj.key, function (Sm) {
        if (Sm) {
          obj.CITY = userObj.CITY;
          Sm.getSmById(obj, callback);
        } else {
          callback({ success: 'keyErr' });
        }
      });
    });

    // 团队单 - 获取航班信息
    socket.on('cemit-postFlightInfo', function (obj, callback) {
      getAfterCtrl('team', obj.key, function (Team) {
        if ((Team) &&
          obj.flightDate.trim() && obj.flightNum.trim()) {

          Team.postFlightInfo(obj, callback);
        } else {
          callback({ success: 'keyErr' });
        }
      });

    });

    socket.on('cemit-smUpdate', function (obj, callback) {
      getAfterCtrl('sm', obj.key, function (Sm) {
        if (Sm) {
          Sm.smUpdate(obj, callback);
        } else {
          callback({ success: 'keyErr' });
        }
      });
    });

    socket.on('cemit-smFix', function (obj, callback) {
      getAfterCtrl('sm', obj.key, function (Sm) {
        if (Sm) {
          Sm.smFix(obj, callback);
        } else {
          callback({ success: 'keyErr' });
        }
      });
    });

    socket.on('cemit-kanbanUpdate', function (obj, callback) {
      getAfterCtrl('sm', obj.key, function (Sm) {
        if (Sm) {
          Sm.kanbanUpdate(obj, callback);
        } else {
          callback({ success: 'keyErr' });
        }
      });
    });

    socket.on('cemit-getServerManCards', function (obj, callback) {
      getAfterCtrl('pingan', obj.key, function (Pingan) {
        if (Pingan) {
          Pingan.getServerManCards(obj, callback);
        } else {
          callback([]);
        }
      });
    });

    socket.on('cemit-chinaDownloadImg', function (obj, callback) {
      getAfterCtrl('pingan', obj.key, function (Pingan) {
        if (Pingan) {
          Pingan.chinaDownloadImg(callback);
        } else {
          callback({ success: 'keyErr' });
        }
      });
    });

    socket.on('cemit-chinaPostData', function (obj, callback) {
      getAfterCtrl('pingan', obj.key, function (Pingan) {
        if (Pingan) {
          Pingan.chinaPostData(obj, callback);
        } else {
          callback({ success: 'keyErr' });
        }
      });
    });

    // code 验证码图片
    socket.on('cemit-pinganDownloadImg', function (obj, callback) {
      getAfterCtrl('pingan', obj.key, function (Pingan) {
        if (Pingan) {
          Pingan.pinganDownloadImg(callback);
        } else {
          callback({ success: 'keyErr' });
        }
      });
    });

    socket.on('cemit-pinganPostData', function (obj, callback) {
      getAfterCtrl('pingan', obj.key, function (Pingan) {
        if (Pingan) {
          Pingan.pinganPostData(obj, callback);
        } else {
          callback({ success: 'keyErr' });
        }
      });
    });

    // ukeax
    socket.on('cemit-ukeaxPostData', function (obj, callback) {
      getAfterCtrl('pingan', obj.key, function (Pingan) {
        if (Pingan) {
          Pingan.ukeaxPostData(obj, callback);
        } else {
          callback({ success: 'keyErr' });
        }
      })
    });

    // weixin
    // socket.on('cemit-getToken', function (obj, callback) {
    //   var Pingan = getAfterCtrl('pingan', obj.key);

    //   if (Pingan) {
    //     Pingan.getToken(obj, callback);
    //   } else {
    //     callback({ success: 'keyErr' });
    //   }
    // });

    socket.on('cemit-getWXInfo', function (obj, callback) {
      getAfterCtrl('pingan', obj.key, function (Pingan) {
        if (Pingan) {
          Pingan.getWXInfo(obj, callback);
        } else {
          callback({ success: 'keyErr' });
        }
      });
    });

    socket.on('cemit-sendWXMessage', function (obj, callback) {
      getAfterCtrl('pingan', obj.key, function (Pingan) {
        if (Pingan) {
          Pingan.sendWXMessage(obj, callback);
        } else {
          callback({ success: 'keyErr' });
        }
      });
    });

    // // 断开连接
    // socket.on('disconnect', function () {
    //   _kbDelOnlineObj(userObj._id);

    //   // 更新用户最后登录时间
    //   // User.changeUpdateAt(uid);
    // });
  });
};

module.exports = listen;
