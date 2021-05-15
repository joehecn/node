/* jshint
   node: true,        devel: true,
   maxstatements: 50, maxparams: 6, maxdepth: 3,
   maxerr: 50,        nomen: true,  regexp: true
 */
'use strict';

var createCtrl = function (dbHost, dbName) {
  var E_MAIL    = '2246506846%40qq.com';
  var ERR_MSGS1 = [
    '验证码错误',
    '该卡已经被使用',
    '卡号不存在',
    '您填写的密码错误',
  ];

  // 22
  var _ERRS = {
    // xx9 系统级错误
    LIST_SER_FIND_ERR: '22902', // 此错误不抛到客户端
    LIST_COUNT_ERR: '22904',    // 此错误不抛到客户端
    LIST_FIND_ERR: '22906',     // 此错误不抛到客户端
    UPDATE_PINGAN_ERR: '22908',
    SAVE_PINGANS_ERR: '22910',  // 特殊， 客户端直接使用
    FIND_PINGANS_ERR: '22912',
    DOWNLOAD_IMG_ERR: '22999',

    // xx6 黑客
    UPDATE_PINGAN_OK: '22602',
    SAVE_PINGANS_ARR: '22606',
  };
  var LIMIT     = 50;
  var ctrlName  = 'pingan';
  var request   = require('request');
  var https     = require('https');
  var http      = require('http');
  var moment    = require('moment');
  var iconv     = require('iconv-lite');
  var cheerio   = require('cheerio');
  var zxutil    = require('../zxutil');
  var getModel  = require('../model');
  var Pingan    = getModel(dbHost, dbName, ctrlName);
  var Serverman = getModel(dbHost, dbName, 'serverman');
  var Sm        = getModel(dbHost, dbName, 'sm');
  var Company   = getModel(dbHost, 'auth', 'company');

  // var getCtrl   = require('../ctrl');
  // var SmCtrl    = getCtrl(dbHost, dbName, 'sm');

  // var Public    = getModel(dbHost, 'auth', 'public');
  var errCode;

  // private methods
  var _unique;
  var _listFind;

  // pubulic methods
  var list;
  var updatePingan;
  var savePingans;
  var findPingansIn;
  var testRepeatCardNum;

  // kb
  var getServerManCards;

  var chinaDownloadImg;
  var chinaPostData;
  var pinganDownloadImg;
  var pinganPostData;
  var ukeaxPostData;

  // 微信
  // var _checkToken;
  var _getTokenFromWeixin;
  var _getuserinfoFromWeixin;
  var _getuserdetailFromWeixin;

  // var getToken;
  var _addWXUser;
  var getWXInfoSm;
  var getWXInfo;
  var sendWXMessageSm;
  var sendWXMessage;

  var zxwxFindByName;
  var zxwxInsuranceinfo;
  var zxwxImgcode;
  var optLogin;

  // forTest
  _unique = function (arr) {
    var result = [];
    var ids = [];
    var hash = {};
    var len = arr.length;
    var i;
    var elem;

    for (i = 0; i < len; i += 1) {
      elem = arr[i];

      if (!hash[elem]) {
        result.push(elem);
        hash[elem] = true;
      } else {
        ids.push(elem);
      }
    }

    return { result: result, ids: ids };
  };

  _listFind =
    function (search, pageN, servermans, len, callback) {
      var index    = pageN * LIMIT;
      var sortJson = { _id: -1 };

      Pingan.find(search, {
          sm: 0,
          person: 0,
          cardCategory: 0,
          birthday: 0,
          sex: 0,
          cardType: 0,
        }).sort(sortJson)
        .skip(index)
        .limit(LIMIT)
        .exec(
          function (err, cards) {
            if (err) {
              errCode = _ERRS.LIST_FIND_ERR;
              zxutil.writeLog(ctrlName, errCode, err, search);
              return callback({});
            }

            callback({
              cards: cards,
              servermans: servermans,
              totalPage: Math.ceil(len / LIMIT), // 向上取整
            });
          }
        );
    };

  list = function (obj, callback) {
    // obj: { n, livedate, server, filter, cardtype, servermanSearch, search }
    var livedate = obj.livedate;
    var server   = obj.server;
    var filter   = Number(obj.filter);
    var search   = obj.search;

    Serverman.find(
      obj.servermanSearch,
      { _id: 0, name: 1 },
      function (err, servermans) {
        if (err) {
          errCode = _ERRS.LIST_SER_FIND_ERR;
          zxutil.writeLog(ctrlName, errCode, err, obj);
          return callback({});
        }

        search.cardType = obj.cardtype;

        if (livedate && livedate !== 'all') {
          search.liveTime =
            { $gte: moment(livedate), $lt: moment(livedate).add(1, 'd') };
        }

        if (server && server !== 'all') {
          search.serverMan = server;
        }

        if (filter === 1 || filter === 2 || filter === 3) {
          search.isInsurance = filter;
        }

        Pingan.count(search, function (err, len) {
          if (err) {
            errCode = _ERRS.LIST_COUNT_ERR;
            zxutil.writeLog(ctrlName, errCode, err, obj);
            return callback({});
          }

          _listFind(search, Number(obj.n), servermans, len, callback);
        });
      }
    );
  };

  updatePingan = function (obj, callback) {
    Pingan.update({ _id: obj.id }, { $set: obj.set }, function (err, isOk) {
      if (err) {
        errCode = _ERRS.UPDATE_PINGAN_ERR;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        return callback({ success: errCode });
      }

      if (isOk.nModified === 1 && isOk.n === 1) {
        callback({ success: 1 });
      } else {
        errCode = _ERRS.UPDATE_PINGAN_OK;
        zxutil.writeLog(ctrlName, errCode, {}, obj);
        return callback({ success: errCode });
      }
    });
  };

  savePingans = function (arr, callback) {
    var checkedTime;

    if (!(arr instanceof Array)) {
      errCode = _ERRS.SAVE_PINGANS_ARR;
      zxutil.writeLog(ctrlName, errCode, {}, { arr: arr });
      return callback({ success: errCode });
    }

    // 记录导入时间起点
    // 所有成功的记录一定不会在此时间点之前
    checkedTime = Date.now();

    Pingan.create(arr, function (err, p) {
      if (err) {
        errCode = _ERRS.SAVE_PINGANS_ERR;
        zxutil.writeLog(ctrlName, errCode, err, {});
        return callback({ success: errCode, checkedTime: checkedTime });
      }

      if (p) {
        callback({ success: 1 });
      } else {
        errCode = _ERRS.SAVE_PINGANS_ARR;
        zxutil.writeLog(ctrlName, errCode, {}, { arr: arr });
        return callback({ success: errCode });
      }
    });
  };

  findPingansIn = function (arr, callback) {
    Pingan.find(
      { pinganCardNum: { $in: arr } },
      { _id: 0, pinganCardNum: 1, meta: 1 },
      function (err, pingans) {
        if (err) {
          errCode = _ERRS.FIND_PINGANS_ERR;
          zxutil.writeLog(ctrlName, errCode, err, {});
          return callback({ success: errCode });
        }

        callback({ success: 1, pingans: pingans });
      }
    );
  };

  testRepeatCardNum = function (callback) {
    Pingan.find({}, { _id: 0, pinganCardNum: 1 }, function (err, pingans) {
      var arr = [];
      var len = pingans.length;
      var cardObj;
      var cardArrLen;

      pingans.forEach(function (item) {
        arr.push(item.pinganCardNum);
      });

      cardObj = _unique(arr);
      cardArrLen = cardObj.result.length;

      callback({
        len: len,
        cardArrLen: cardArrLen,
        ids: cardObj.ids,
      });
    });
  };

  getServerManCards = function (obj, callback) {
    var id = obj.id;
    var serverMan = obj.serverMan;

    Pingan.find(
      { $or: [{ serverMan: serverMan, isInsurance: 2 }, { sm: id }] },
      {
        pinganCardNum: 1, password: 1, serverMan: 1, isInsurance: 1,
        cardNum: 1, cardType: 1,
      }
    ).exec(function (err, cards) {
      if (err) {
        errCode = _ERRS.FIND_PINGANS_ERR;
        zxutil.writeLog(ctrlName, errCode, err, {});
        return callback([]);
      }

      callback(cards);
    });
  };

  chinaDownloadImg = function (callback) {
    var j = request.jar();
    var url11 = 'http://www.e-chinalife.com/' +
      'selfcard/selfcard/cardActive/cardActiveForm.jsp';
    var url12 = 'http://www.e-chinalife.com/' +
      'selfcard/selfcard/validateNum/image.jsp';

    var Writable = require('stream').Writable;
    var ws = Writable();
    var chunks = [];
    var size = 0;

    var options11 = {
      url: url11,
      encoding: null,
      headers: {
        Accept: 'text/html,application/xhtml+xml,' +
          'application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6',
        Connection: 'keep-alive',
        Host: 'www.e-chinalife.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) ' +
          'Chrome/54.0.2840.71 Safari/537.36',
      },
    };

    var Step11getCookie;
    var cookies;

    ws._write = function (chunk, end, next) {
      size += chunk.length;
      chunks.push(chunk);
      next();
    };

    ws.on('finish', function () {
      var buf = Buffer.concat(chunks, size);
      var data = 'data:image/jpg;base64,' + buf.toString('base64');
      callback({ success: 1, cookies: cookies, data: data });
    });

    Step11getCookie = function (error, response) {
      if (!error && response.statusCode === 200) {
        var session11 = response.headers['set-cookie'];
        var cookie;

        cookies  = [session11[1].split(';')[0].trim()];
        cookie = request.cookie(cookies[0]);
        j.setCookie(cookie, url12);

        request.get(url12, { jar: j }).pipe(ws);
      }
    };

    request(options11, Step11getCookie);
  };

  chinaPostData = function (obj, callback) {
    // console.log(obj);

    var InforceDate = moment().format('YYYY-MM-DD');
    var j = request.jar();
    var PassWord = obj.card.password;
    var Rand = obj.codeNum;
    var url13 = 'http://www.e-chinalife.com/' +
      'selfcard/selfcard/validateNum/ajaxPw.jsp?PassWord=' +
      PassWord + '&Rand=' + Rand;

    var cookies = obj.cookies;
    var cookie = request.cookie(cookies[0]);

    var options13 = {
      url: url13,
      jar: j,
      method: 'POST',
      encoding: 'UTF-8',
      headers: {
        Accept: '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6',
        Connection: 'keep-alive',
        'Content-Type': 'application/x-www-form-urlencoded',
        Host: 'www.e-chinalife.com',
        Origin: 'http://www.e-chinalife.com',
        Referer: 'http://www.e-chinalife.com/' +
          'selfcard/selfcard/cardActive/cardActiveForm.jsp',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) ' +
          'Chrome/54.0.2840.71 Safari/537.36',
      },
    };

    var holder = {};

    var checkAndChangeName = function (name) {
      if (/^[\u4E00-\uFA29]*$/.test(name[0])) {
        // 中文去空格
        name = name.replace(/\s+/, '');

        return {
          name: name,
          nameType: 0,
        };
      } else {
        // 英文转大写,空格处理成+号
        name = name.trim().toUpperCase().replace(/\s+/, '+');

        return {
          name: name,
          nameType: 1,
        };
      }
    };

    var iconvEncodeGbkToString = function (str) {
      var buf = iconv.encode(str, 'gbk');
      var bufArr = [];
      var i;

      for (i = 0; i < buf.length; i += 1) {
        bufArr.push('%' + buf[i].toString(16).toUpperCase()); // 转大写
      }

      return bufArr.join('');
    };

    var getIdType = function (cardCategory) {
      var idType;

      switch (cardCategory) {
        case '身份证':
          idType = 'I';
          break;
        case '护照':
          idType = 'P';
          break;
        case '军官证':
          idType = 'S';
          break;
        default:
          idType = 'O';
      }

      return idType;
    };

    var getBirthday = function (cardNum) {
      return cardNum.substr(6, 4) +
        '-' +
        cardNum.substr(10, 2) +
        '-' +
        cardNum.substr(12, 2);
    };

    var getSex = function (cardNum) {
      return (cardNum.substr(16, 1) % 2 === 0) ? '女' : '男';
    };

    var getHolderSex = function (sex) {
      return sex === '男' ? 'M' : 'F';
    };

    var Step41post = function () {
      var postData41 = [
        'isNewStepInfo=false',
        'ins_list=',

        // 航空旅客意外伤害保险A
        'Card_Name=' +
          '%BA%BD%BF%D5%C2%C3%BF%CD%D2%E2%CD%E2%C9%CB%BA%A6%B1%A3%CF%D5A',
        'Holder_Mobile=' + obj.phone,
      ].join('&');

      var path = '/selfcard/selfcard/cardActive/' +
        'activeSuccess.jsp?Inforce_Date=' +
        InforceDate + '&POST_Y=POST_Y';

      var options41 = {
        hostname: 'www.e-chinalife.com',
        path: path,
        method: 'POST',
        headers: {
          Accept: 'text/html,application/xhtml+xml,' +
            'application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6',
          'Cache-Control': 'max-age=0',
          Connection: 'keep-alive',
          'Content-Length': Buffer.byteLength(postData41),
          'Content-Type': 'application/x-www-form-urlencoded',
          Host: 'www.e-chinalife.com',
          Origin: 'http://www.e-chinalife.com',
          Referer: 'http://www.e-chinalife.com/' +
            'selfcard/selfcard/cardActive/invokeActiveProcess.jsp',
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/54.0.2840.71 Safari/537.36',
          cookie: cookie,
        },
      };

      var req = http.request(options41, function (res) {
        var size = 0;
        var chunks = [];
        res.on('data', function (chunk) {
          size += chunk.length;
          chunks.push(chunk);
        });

        res.on('end', function () {
          var data = Buffer.concat(chunks, size);
          var body = iconv.decode(data, 'gbk');

          // console.log(body);

          if (body.indexOf('投保（激活）成功') !== -1) {
            // 将此条 obj 入库 update pingans
            // 送机单 保险 +1
            Pingan.update(
              { _id: obj.card._id },
              {
                $set: {
                  sm: obj.sm,
                  person: obj.person._id,
                  name: obj.person.name,
                  phone: obj.phone,
                  cardCategory: obj.person.cardCategory,
                  cardNum: obj.person.cardNum,
                  birthday: obj.person.birthday,
                  sex: obj.person.sex,
                  liveTime: Date.now(),
                  isInsurance: 3,
                  canUse: false,
                },
              },
              function (err, pingan) {
                if (err) { console.log(err); }

                if (pingan) {
                  Sm.update(
                    { _id: obj.sm },
                    { $inc: { insurance: 1 } },
                    function (err, sm) {
                      if (err) { console.log(err); }

                      if (sm) {
                        obj.success = 99;
                        callback(obj);
                        return;
                      }
                    }
                  );
                }
              }
            );
          } else {
            obj.success = 39; // 第四屏未知错误
            callback(obj);
          }
        });
      });

      req.on('error', function () {
        obj.success = 39;
        callback(obj);
      });

      req.write(postData41);
      req.end();
    };

    var Step31post = function () {
      var postData31 = [
        'CheckedNewRuleInput=false',                   // 检查新规则输入
        'Holder_Name=' + holder.insured_name,          // 何苗
        'Holder_IdType=' + holder.idType,              // 证件类型 I 身份证 O 其他
        'Holder_IdCard=' + holder.idNo,
        'Holder_Sex=' + holder.sex,                    // M 男 F 女
        'Holder_Birthday=' + obj.person.birthday,
        'Holder_Email=' + E_MAIL,
        'Holder_Mobile=' + obj.phone,
        'Holder_Address=',
        'Holder_Phone=%A3%A8%D1%A1%CC%EE%CF%EE%A3%A9', // （选填项）
        'checkInsCount=1',                             // 被保人总数量
        'Ins_Relation1=5',                             // 是投保人的：5 本人
        'Ipsn_No1=1',
        'Insured_Name1=' + holder.insured_name,                  // 何苗
        'Insured_IdType1=' + holder.idType,
        'Insured_IdCard1=' + holder.idNo,
        'Insured_Sex1=' + holder.sex,
        'Insured_Birthday1=' + obj.person.birthday,
        'Insured_Email1=' + E_MAIL,
        'Insured_Mobile1=' + obj.phone,

        // 目前是否已经参加或正在申请中的其它保险公司包含身故保险责任的人身保险？0 否
        'Check_Else_Amount1=0',
        'Else_Amount1=0',                             // 在其他保险公司投保的保额总和（整数）
        'Ben=1',                                      // 受益人： 法定继承人
        'Ben_Relation=',
        'Ben_Name=',
        'Ben_IdType=' + holder.idType,
        'Ben_IdCard=',
        'Ben_Sex=' + holder.sex,
        'Ben_Birthday=',
        'Con_Relation=5',
        'Con_Name=' + holder.insured_name,                      // 何苗
        'Con_IdType=' + holder.idType,
        'Con_IdCard=' + holder.idNo,
        'Con_Sex=' + holder.sex,
        'Con_Birthday=' + obj.person.birthday,
        'Con_Email=' + E_MAIL,
        'Con_Mobile=' + obj.phone,
        'Inforce_Date=' + InforceDate,
        'POST_Y=POST_Y',
        'Insurance_Dur=10',                          // 保险期间 10
        'Insurance_Dur_Unit=%C8%D5',                 // 日
        'cardNo=' + obj.card.pinganCardNum,

         // 航空旅客意外伤害保险A
        'Card_Name=' +
          '%BA%BD%BF%D5%C2%C3%BF%CD%D2%E2%CD%E2%C9%CB%BA%A6%B1%A3%CF%D5A',
        'Card_NO=' + obj.card.pinganCardNum,
      ].join('&');

      var options31 = {
        hostname: 'www.e-chinalife.com',
        path: '/selfcard/selfcard/cardActive/invokeActiveProcess.jsp',
        method: 'POST',
        headers: {
          Accept: 'text/html,application/xhtml+xml,' +
            'application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6',
          'Cache-Control': 'max-age=0',
          Connection: 'keep-alive',
          'Content-Length': Buffer.byteLength(postData31),
          'Content-Type': 'application/x-www-form-urlencoded',
          Host: 'www.e-chinalife.com',
          Origin: 'http://www.e-chinalife.com',
          Referer: 'http://www.e-chinalife.com/' +
            'selfcard/selfcard/cardActive/invokeActiveInfo.jsp',
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/54.0.2840.71 Safari/537.36',
          cookie: cookie,
        },
      };

      var req = http.request(options31, function (res) {
        var size = 0;
        var chunks = [];
        res.on('data', function (chunk) {
          size += chunk.length;
          chunks.push(chunk);
        });

        res.on('end', function () {
          // var data = Buffer.concat(chunks, size)
          // var body = iconv.decode(data, 'gbk')
          // console.log(body)

          // console.log('-------------invokeActiveProcess');

          Step41post();
        });
      });

      req.on('error', function () {
        obj.success = 38; // 第三屏未知错误
        callback(obj);
      });

      req.write(postData31);
      req.end();
    };

    var Step21post = function () {
      // 中国人寿保险股份有限公司短期保险基本条款.pdf||国寿通泰交通意外伤害保险（A款）（2013版）利益条款.pdf
      var postData21 = 'pdfCheck=on&pdfCheck=on&POST_Y=clauseCheck&PDFname=' +
        '%D6%D0%B9%FA%C8%CB%CA%D9%B1%A3%CF%D5%B9%C9%B7%DD%D3%D0%CF%DE%B9%AB' +
        '%CB%BE%B6%CC%C6%DA%B1%A3%CF%D5%BB%F9%B1%BE%CC%F5%BF%EE.pdf' +
        '%7C%7C%B9%FA%CA%D9%CD%A8%CC%A9%BD%BB%CD%A8%D2%E2%CD%E2%C9%CB%BA%A6' +
        '%B1%A3%CF%D5%A3%A8A%BF%EE%A3%A9%A3%A82013%B0%E6%A3%A9%C0%FB%D2%E6' +
        '%CC%F5%BF%EE.pdf&cardNo=' + obj.card.pinganCardNum;

      var options21 = {
        hostname: 'www.e-chinalife.com',
        path: '/selfcard/selfcard/cardActive/invokeActiveInfo.jsp',
        method: 'POST',
        headers: {
          Accept: 'text/html,application/xhtml+xml,' +
            'application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6',
          'Cache-Control': 'max-age=0',
          Connection: 'keep-alive',
          'Content-Length': Buffer.byteLength(postData21),
          'Content-Type': 'application/x-www-form-urlencoded',
          Host: 'www.e-chinalife.com',
          Origin: 'http://www.e-chinalife.com',
          Referer: 'http://www.e-chinalife.com/' +
            'selfcard/selfcard/cardActive/clauseCheck.jsp',
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/54.0.2840.71 Safari/537.36',
          cookie: cookie,
        },
      };

      // console.log(postData21);
      // console.log(cookie);

      var req = http.request(options21, function (res) {
        var size = 0;
        var chunks = [];
        res.on('data', function (chunk) {
          size += chunk.length;
          chunks.push(chunk);
        });

        res.on('end', function () {
          // var data = Buffer.concat(chunks, size);
          // var body = iconv.decode(data, 'gbk');
          // console.log('------------------invokeActiveInfo');

          Step31post();
        });
      });

      req.on('error', function () {
        // console.log('25-----------error');
        obj.success = 25; // 第二屏未知错误
        callback(obj);
      });

      req.write(postData21);
      req.end();
    };

    var Step13post = function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var session13 = response.headers['set-cookie'];

        PassWord = body.trim();

        // console.log('Step13post--------------password');
        // console.log(PassWord);

        cookies = [session13[0].split(';')[0].trim()];
        cookie = request.cookie(cookies[0]);

        var postData14 = [
          'Card_NO=' + obj.card.pinganCardNum,
          'PassWord=' + PassWord,
          'POST_Y=POST_Y',
          'Rand=' + Rand,
        ].join('&');

        var options14 = {
          hostname: 'www.e-chinalife.com',
          path: '/selfcard/selfcard/cardActive/clauseCheck.jsp',
          method: 'POST',
          headers: {
            Accept: 'text/html,application/' +
              'xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6',
            'Cache-Control': 'max-age=0',
            Connection: 'keep-alive',
            'Content-Length': Buffer.byteLength(postData14),
            'Content-Type': 'application/x-www-form-urlencoded',
            Host: 'www.e-chinalife.com',
            Origin: 'http://www.e-chinalife.com',
            Referer: 'http://www.e-chinalife.com/' +
              'selfcard/selfcard/cardActive/cardActiveForm.jsp',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) ' +
              'AppleWebKit/537.36 (KHTML, like Gecko) ' +
              'Chrome/54.0.2840.71 Safari/537.36',
            cookie: cookie,
          },
        };

        var req = http.request(options14, function (res) {
          var size = 0;
          var chunks = [];
          res.on('data', function (chunk) {
            size += chunk.length;
            chunks.push(chunk);
          });

          res.on('end', function () {
            var data = Buffer.concat(chunks, size);
            var body = iconv.decode(data, 'gbk');

            // console.log('------------------clauseCheck.jsp');

            // console.log(body);

            if (body.indexOf('>302') !== -1) {
              if (body.indexOf('ErrorMessage=OperationError&') !== -1) {
                // 您输入的验证码不正确
                obj.success = 10;
                callback(obj);
              } else if (body.indexOf('ErrorMessage=2&') !== -1 ||
                  body.indexOf('ErrorMessage=3&') !== -1) {

                // 该卡已经激活
                Pingan.update(
                  { _id: obj.card._id },
                  { $set: { isInsurance: 1, notes: '该卡已经被使用' } },
                  function (err, pingan) {
                    if (err) { console.log(err); }

                    if (pingan) {
                      obj.success = 11;
                      callback(obj);
                    }
                  }
                );

                // obj.success = 11;
                // callback(obj);
              } else if (body.indexOf('ErrorMessage=0&') !== -1 ||
                  body.indexOf('ErrorMessage=1&') !== -1) {
                // 您输入的卡号或密码不正确，请重新输入
                obj.success = 13;
                callback(obj);
              }

              return;
            }

            Step21post();
          });
        });

        req.on('error', function () {
          obj.success = 19; // 第一屏未知错误
          callback(obj);
        });

        req.write(postData14);
        req.end();
      }
    };

    // holder
    var changeNameObj = checkAndChangeName(obj.person.name);
    if (changeNameObj.nameType === 0) {
      holder.insured_name = iconvEncodeGbkToString(changeNameObj.name);
    } else {
      holder.insured_name = changeNameObj.name;
    }

    holder.idType       = getIdType(obj.person.cardCategory);
    holder.idNo         = obj.person.cardNum.toUpperCase();   // 转大写

    if (holder.idType === 'I') {
      obj.person.birthday = getBirthday(obj.person.cardNum);
      obj.person.sex      = getSex(obj.person.cardNum);
    }

    holder.sex = getHolderSex(obj.person.sex);

    //-------------------------------------------------

    j.setCookie(cookie, url13);

    // console.log('\n\nchina------debug13');
    // require('request-debug')(request, function (type, data) {
    //   console.log(data.headers);
    // });

    request(options13, Step13post);
  };

  pinganDownloadImg = function (callback) {
    var j = request.jar();
    var url11 = 'http://pingan.com/sics/';
    var url12 = 'http://pingan.com/sics/sicsweb/image.jsp';

    var Writable = require('stream').Writable;
    var ws = Writable();
    var chunks = [];
    var size = 0;

    var options11 = {
      url: url11,
      encoding: null,
      headers: {
        Host: 'www.pingan.com',
        Connection: 'Keep-Alive',
        'Cache-Control': 'max-age=0',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) ' +
          'Chrome/52.0.2743.116 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,' +
          'application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6',
      },
    };

    var Step11getCookie;

    ws._write = function (chunk, end, next) {
      size += chunk.length;
      chunks.push(chunk);
      next();
    };

    ws.on('finish', function () {
      var cookies  = [];
      var cookieString12 = j.getCookieString(url12);
      var cookieStringArr = cookieString12.split(';');

      cookies.push(cookieStringArr[0].trim());
      cookies.push(cookieStringArr[1].trim());

      var buf = Buffer.concat(chunks, size);
      var data = 'data:image/jpg;base64,' + buf.toString('base64');
      callback({ success: 1, cookies: cookies, data: data });
    });

    Step11getCookie = function (error, response) {
      if (!error && response.statusCode === 200) {
        // var cookieString11 = j.getCookieString(url11);  // 测试 cookie
        // var session11 = response.headers['set-cookie']; // 测试 cookie
        // console.log('pingan-------------------cookieString11');
        // console.log(cookieString11);                    // 测试 cookie
        // console.log('pingan-------------------session11');   // 测试 cookie
        // console.log(session11);                         // 测试 cookie

        // 接收 Cookie 2 个
        // -- WLS_HTTP_BRIDGE_SICS
        // -- BIGipServerSICS_PrdPool

        // 发送 Cookie 2 个
        // console.log('pingan-------------------- debug_1_2');
        // require('request-debug')(request, function (type, data) {
        //   console.log(data.headers);
        // });

        request.get(url12, { jar: j }).pipe(ws);
      }
    };

    request(options11, Step11getCookie);
  };

  pinganPostData = function (obj, callback) {
    var j = request.jar();
    var url15 = 'http://pingan.com/sics/checkLogin_sics.do';
    var url21 = 'https://pingan.com/sics/checkLogin_sics.do';

    var url41  = 'https://pingan.com/sics/generalPacardPolicyNo.do';

    var options15 = {
      url: url15,  //请求的URL
      jar: j,
      method: 'POST',  //POST方式请求
      encoding: null,  //由于Node默认是UTF-8，而平安用的GBK，所以不进行转码
      headers: {
        Host: 'pingan.com',
        Connection: 'Keep-Alive',
        Accept: 'text/html, */*; q=0.01',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) ' +
          'Chrome/52.0.2743.116 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Referer: 'http://pingan.com/sics/',
        'Accept-Language': 'zh-Hans-CN,zh-Hans;q=0.5',
      },

      //formData:
      form: {  // 请求体，参数
        flag: '101',
        corpsite: 'null',
        cardno: obj.card.pinganCardNum,
        cardpwd: obj.card.password,
        checkCode: obj.codeNum,
      },
    };

    var options21 = {
      url: url21,  //请求的URL
      jar: j,
      method: 'POST',  //POST方式请求
      encoding: null,  //由于Node默认是UTF-8，而平安用的GBK，所以不进行转码
      headers: {
        Accept: 'text/html,application/xhtml+xml,' +
          'application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6',
        'Cache-Control': 'max-age=0',
        'Content-Type': 'application/x-www-form-urlencoded',
        Host: 'pingan.com',
        Connection: 'Keep-Alive',
        Referer: 'http://pingan.com/sics/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) ' +
          'Chrome/52.0.2743.116 Safari/537.36',
      },

      // formData :
      form: {  //请求体，参数
        zzk_id: obj.card.pinganCardNum,
        acceptedRulesFlag: '1',
      },
    };

    var options41 = {
      url: url41,  //请求的URL
      jar: j,
      method: 'POST',  // POST方式请求
      encoding: null,  // 由于Node默认是UTF-8，而平安用的GBK，所以不进行转码
      headers: {
        Accept: 'text/html,application/xhtml+xml,' +
          'application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6',
        'Cache-Control': 'max-age=0',
        Connection: 'Keep-Alive',
        'Content-Type': 'application/x-www-form-urlencoded',
        Host: 'pingan.com',
        Referer: 'https://pingan.com/sics/saveProductSics.do',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64; ' +
          'Trident/7.0; rv:11.0) like Gecko/20100101 Firefox/22.0',
      },

      // formData :
      form: {  //请求体，参数
        cardno: obj.card.pinganCardNum,
      },
    };

    var holder = {};

    var cookie1;
    var cookie2;
    var changeNameObj;

    var checkAndChangeName;
    var iconvEncodeGbkToString;
    var getIdType;
    var getBirthday;
    var getSex;
    var getV;
    var getHolderSex;
    var Step15post;
    var Step21post;
    var Step41post;

    checkAndChangeName = function (name) {
      if (/^[\u4E00-\uFA29]*$/.test(name[0])) {
        // 中文去空格
        name = name.replace(/\s+/, '');

        return {
          name: name,
          nameType: 0,
        };
      } else {
        // 英文转大写,空格处理成+号
        name = name.trim().toUpperCase().replace(/\s+/, '+');

        return {
          name: name,
          nameType: 1,
        };
      }
    };

    iconvEncodeGbkToString = function (str) {
      var buf = iconv.encode(str, 'gbk');
      var bufArr = [];
      var i;

      for (i = 0; i < buf.length; i += 1) {
        bufArr.push('%' + buf[i].toString(16).toUpperCase()); // 转大写
      }

      return bufArr.join('');
    };

    getIdType = function (cardCategory) {
      var idType;

      switch (cardCategory) {
        case '身份证':
          idType = '01';
          break;
        case '护照':
          idType = '02';
          break;
        case '军官证':
          idType = '03';
          break;
        case '港澳回乡证':
          idType = '06';
          break;
        default:
          idType = '99';
      }

      return idType;
    };

    getBirthday = function (cardNum) {
      return cardNum.substr(6, 4) +
        '-' +
        cardNum.substr(10, 2) +
        '-' +
        cardNum.substr(12, 2);
    };

    getSex = function (cardNum) {
      return (cardNum.substr(16, 1) % 2 === 0) ? '女' : '男';
    };

    getV = function (birthday) {
      return {
        year: birthday.substr(0, 4),
        month: Number(birthday.substr(5, 2)),
        day: Number(birthday.substr(8, 2)),
      };
    };

    getHolderSex = function (sex) {
      return sex === '男' ? 'M' : 'F';
    };

    // holder
    changeNameObj = checkAndChangeName(obj.person.name);
    if (changeNameObj.nameType === 0) {
      holder.insured_name = iconvEncodeGbkToString(changeNameObj.name);
    } else {
      holder.insured_name = changeNameObj.name;
    }

    holder.idType       = getIdType(obj.person.cardCategory);
    holder.idNo         = obj.person.cardNum.toUpperCase();   // 转大写

    if (holder.idType === '01') {
      obj.person.birthday = getBirthday(obj.person.cardNum);
      obj.person.sex      = getSex(obj.person.cardNum);
    }

    holder.v = getV(obj.person.birthday);
    holder.sex = getHolderSex(obj.person.sex);

    cookie1 = request.cookie(obj.cookies[0]);
    cookie2 = request.cookie(obj.cookies[1]);

    j.setCookie(cookie1, url15);
    j.setCookie(cookie2, url15);

    Step15post = function (error, response, body) {
      if (!error && response.statusCode === 200) {
        body = iconv.decode(body, 'gbk');  //转码

        // console.log(body);
        // console.log(body.indexOf('>错误'));
        // console.log(body.indexOf(ERR_MSGS1[0]));

        // 检测错误
        if (body.indexOf('>错误') !== -1) {
          if (body.indexOf(ERR_MSGS1[0]) !== -1) {
            // 验证码错误
            obj.tryCount += 1;
            obj.success = 10;
            callback(obj);
          } else if (body.indexOf(ERR_MSGS1[1]) !== -1) {
            // 该卡已经被使用
            // 将数据库中该卡的状态改为不可用
            Pingan.update(
              { _id: obj.card._id },
              { $set: { isInsurance: 1, notes: '该卡已经被使用' } },
              function (err, pingan) {
                if (err) { console.log(err); }

                if (pingan) {
                  obj.success = 11;
                  callback(obj);
                }
              }
            );
          } else if (body.indexOf(ERR_MSGS1[2]) !== -1) {
            // 卡号不存在
            // 将数据库中该卡的状态改为不可用
            Pingan.update(
              { _id: obj.card._id },
              { $set: { isInsurance: 1, notes: '卡号不存在' } },
              function (err, pingan) {
                if (err) { console.log(err); }

                if (pingan) {
                  obj.success = 12;
                  callback(obj);
                }
              }
            );
          } else if (body.indexOf(ERR_MSGS1[3]) !== -1) {
            // 您填写的密码错误
            obj.success = 13;
            callback(obj);
          } else {
            // 第一屏未知错误
            obj.success = 19;
            callback(obj);
          }

          return;
        }

        request(options21, Step21post);
      }
    };

    Step21post = function (error, response) {
      if (!error && response.statusCode === 200) {
        var postData = [
          'cardno=' + obj.card.pinganCardNum,
          'actionType=createPolicyInfo',
          'totalno=10203081900264392946', // 'totalno=10203081900118599273',
          'certno=20160816140044154602', //'certno=20131101140083697817',
          'appclientNo=',
          'unit=0',
          'period=10',
          'policyUnit=0',
          'policyPerid=10',
          'cardTypeId=13656', // 'cardTypeId=11535',
          'holder_insured_name=' + holder.insured_name,
          'holder_idType=' + holder.idType,
          'holder_idNo=' + holder.idNo,
          'holder_v_year=' + holder.v.year,
          'holder_v_month=' + holder.v.month,
          'holder_v_day=' + holder.v.day,
          'holder_sex=' + holder.sex,
          'holder_area_cde1=',
          'holder_tel1=',
          'holder_area_cde2=',
          'holder_tel2=',
          'holder_mobile=' + obj.phone,
          'holder_email=' + E_MAIL,
          'holder_bloodtype=1',
          'clientNo=',
          'clientType=01',
          'insured_name=' + holder.insured_name,
          'idType=' + holder.idType,
          'idNo=' + holder.idNo,
          'v_year=' + holder.v.year,
          'v_month=' + holder.v.month,
          'v_day=' + holder.v.day,
          'sex=' + holder.sex,
          'area_cde1=',
          'tel1=',
          'area_cde2=',
          'tel2=',
          'mobile=' + obj.phone,
          'regionname=',
          'province=' + iconvEncodeGbkToString('请选择'),
          'regioncode=%25',
          'address=',
          'postcode=',
          'topSelect=',
          'midSelect=',
          'profCatalog=',
          'profcode=',
          'email=' + E_MAIL,
          'selectPolicyPeriod=Y',
        ].join('&');

        var options = {
          hostname: 'pingan.com',
          port: 443,
          path: '/sics/saveProductSics.do',
          method: 'POST',
          headers: {
            Accept: 'text/html,application/xhtml+xml,' +
              'application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6',
            'Cache-Control': 'max-age=0',
            Connection: 'Keep-Alive',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
            Host: 'pingan.com',
            Referer: url15,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) ' +
              'AppleWebKit/537.36 (KHTML, like Gecko) ' +
              'Chrome/52.0.2743.116 Safari/537.36',
            Cookie: obj.cookies[0] + '; ' + obj.cookies[1],
          },
        };

        var req = https.request(options, function (res) {
          var size = 0;
          var chunks = [];
          res.on('data', function (chunk) {
            size += chunk.length;
            chunks.push(chunk);
          });

          res.on('end', function () {
            var data = Buffer.concat(chunks, size);
            var body = iconv.decode(data, 'gbk'); //gbk解码

            // console.log('-----------saveProductSics.do');
            // console.log(body);

            if (body.indexOf('英文姓名只能由大写英文字母和空格组成') !== -1) {
              obj.success = 21;
              callback(obj);
            } else if (body.indexOf('累计投保份数超过规定份数') !== -1) {
              obj.success = 22;
              callback(obj);
            } else if (body.indexOf('姓名只能由中文') !== -1) {
              obj.success = 23;
              callback(obj);
            } else if (body.indexOf('保险期限的开始日期格式不正确') !== -1) {
              obj.success = 24;
              callback(obj);
            } else {
              request(options41, Step41post);
            }
          });
        });

        req.on('error', function () {
          obj.success = 25;
          callback(obj);
        });

        req.write(postData);
        req.end();
      }
    };

    Step41post = function (error, response, body) {
      if (!error && response.statusCode === 200) {
        // 第四屏通过, 判断是否成功
        body = iconv.decode(body, 'gbk');  //转码
        //console.log(body);
        if (body.indexOf('中国平安-保险-自助保险卡专区-完成投保') !== -1) {
          // 将此条 obj 入库 update pingans
          // 送机单 保险 +1
          Pingan.update(
            { _id: obj.card._id },
            {
              $set: {
                sm: obj.sm,
                person: obj.person._id,
                name: obj.person.name,
                phone: obj.phone,
                cardCategory: obj.person.cardCategory,
                cardNum: obj.person.cardNum,
                birthday: obj.person.birthday,
                sex: obj.person.sex,
                liveTime: Date.now(),
                isInsurance: 3,
                canUse: false,
              },
            },
            function (err, pingan) {
              if (err) { console.log(err); }

              if (pingan) {
                Sm.update(
                  { _id: obj.sm },
                  { $inc: { insurance: 1 } },
                  function (err, sm) {
                    if (err) { console.log(err); }

                    if (sm) {
                      obj.success = 99;
                      callback(obj);
                      return;
                    }
                  }
                );
              }
            }
          );
        } else if (body.indexOf('系统繁忙') !== -1) {
          obj.success = 31;
          callback(obj);
        } else if (body.indexOf('请您按照正确的投保流程进行投保') !== -1) {
          obj.success = 32;
          callback(obj);
        } else {
          obj.success = 39;
          callback(obj);
        }
      }
    };

    request(options15, Step15post);
  };

  // ukeaxPostData = function (obj, callback) {
  //   obj.success = 99;
  //   callback(obj);
  // }
  ukeaxPostData = function (obj, callback) {
    // tools
    // var getIdType = function (cardCategory) {
    //   if (cardCategory === '身份证') {
    //     return '2'
    //   } else {
    //     return '1'
    //   }
    // }
    var getIdType = function (cardCategory) {
      var idType;

      switch (cardCategory) {
        case '身份证':
          idType = '2';
          break;
        case '护照':
          idType = '82';
          break;
        case '港澳回乡证':
          idType = '84';
          break;
        case '台胞证':
          idType = '86';
          break;
        case '军官证':
          idType = '83';
          break;
        default:
          idType = '1';
      }

      return idType;
    }

    var getSex = function (sex) {
      return (sex === '男') ? '1' : '2'
    }

    // request
    var j = request.jar()
    var r = request.defaults({jar: j})
    // var url1 = 'http://www.ukeax.com/card/'
    // // jsessionid: 4C7E176AE96FA41274385E8670C41FA7
    // var url2 = 'http://www.ukeax.com/card/cardActive;jsessionid=' // +jsessionid
    // var url3 = 'http://www.ukeax.com/card/toinsure'
    // var url4 = 'http://www.ukeax.com/card/cus-insure'

    var url1 = 'http://www.ukeax.com/youk/'
    var url2 = 'http://www.ukeax.com/youk/youkActive;jsessionid=' // +jsessionid
    var url3 = 'http://www.ukeax.com/youk/toinsure'
    var url4 = 'http://www.ukeax.com/youk/youk-insure'

    var options1 = {
      url: url1
    }
    var options2 = {
      // url
      method: 'POST',
      form: {
        cardId: obj.card.pinganCardNum,
        cardPwd: obj.card.password
      }
    }
    var options3 = {
      url: url3,
      method: 'POST',
      form: {
        cardId: obj.card.pinganCardNum,
        cardPwd: obj.card.password
      }
    }
    var options4 = {
      url: url4,
      method: 'POST',
      form: {
        insured: obj.person.name,
        phoneNumber: obj.phone,
        idType: getIdType(obj.person.cardCategory),
        idNumber: obj.person.cardNum,
        sex: getSex(obj.person.sex),
        birthday: obj.person.birthday,
        email: E_MAIL,
        // effectiveDateStr: 2018-06-11
        // effectiveTimeStr: 05:40
        flightDate: '',
        duration: 10,
        flightNumber: '',
        // insuranceId: 16
        cardId: obj.card.pinganCardNum,
        cardPwd: obj.card.password,
        createType: 'only-create'
      }
    }

    function postStep1 (error, response, body) {
      if (!error && response.statusCode === 200) {
        var sessions = response.headers['set-cookie']
        var cookie = sessions[0].split(';')[0].trim()
        var jsessionid = cookie.split('=')[1]

        options2.url = url2 + jsessionid
        r(options2, postStep2)
      } else {
        obj.success = 17 // 第一屏网络请求错误
        callback(obj)
      }
    }
    function postStep2 (error, response, body) {
      if (!error && response.statusCode === 200) {
        var $ = cheerio.load(body)

        // if ($('div.insurance>form').attr('action') === '/card/toinsure') {
        if ($('div.insurance>form').attr('action') === '/youk/toinsure') {
          options3.form.insuranceId = $('input[name=insuranceId]').val()
          r(options3, postStep3)
        } else {
          obj.success = 14 // 卡号或密码有误
          callback(obj)
        }
      } else {
        obj.success = 27 // 第二屏网络请求错误
        callback(obj)
      }
    }
    function postStep3 (error, response, body) {
      if (!error && response.statusCode === 200) {
        options4.form.effectiveDateStr = moment().format('YYYY-MM-DD')
        options4.form.effectiveTimeStr = moment().format('HH:mm')
        options4.form.insuranceId = options3.form.insuranceId

        r(options4, postStep4)
      } else {
        obj.success = 37 // 第三屏网络请求错误
        callback(obj)
      }
    }

    function postStep4 (error, response, body) {
      if (!error && response.statusCode === 200) {
        // callback(body)
        if (body.indexOf('>激活下一张<') !== -1) {
          // 将此条 obj 入库 update pingans
          // 送机单 保险 +1
          Pingan.update(
            { _id: obj.card._id },
            {
              $set: {
                sm: obj.sm,
                person: obj.person._id,
                name: obj.person.name,
                phone: obj.phone,
                cardCategory: obj.person.cardCategory,
                cardNum: obj.person.cardNum,
                birthday: obj.person.birthday,
                sex: obj.person.sex,
                liveTime: Date.now(),
                isInsurance: 3,
                canUse: false,
              },
            },
            function (err, pingan) {
              if (err) { console.log(err); }

              if (pingan) {
                Sm.update(
                  { _id: obj.sm },
                  { $inc: { insurance: 1 } },
                  function (err, sm) {
                    if (err) { console.log(err); }

                    if (sm) {
                      obj.success = 99;
                      callback(obj);
                      return;
                    }
                  }
                );
              }
            }
          );
        } else {
          obj.success = 39 // 第四屏未知错误, 告诉老何
          callback(obj)
        }
      } else {
        obj.success = 47 // 第四屏网络请求错误
        callback(obj)
      }
    }

    r(options1, postStep1)
  }

  // // weixin
  // _checkToken = function (t) {
  //   return moment(t).add(7150, 's').isBefore(moment());
  // };

  // 获取AccessToken
  // GET
  // https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=id&corpsecret=secrect
  _getTokenFromWeixin = function (callback) {
    var url = 'https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=' +
        'wx522d6435e5dfe41e&corpsecret=' +
        'eF0yAEsFzjUePOqeg3ifj_8yXBY32jgvEbwV1ECJ5GOXmu1h5rMlnSHNRkodfgom';

    request({
      url: url,
      json: true,
    }, function (error, response, body) {
      if (!error && response.statusCode === 200 && body.access_token) {
        callback(body.access_token);
      } else {
        callback('');
      }
    });
  };

  // 获取成员信息
  // GET
  // https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=ACCESS_TOKEN&code=CODE
  _getuserinfoFromWeixin = function (token, code, callback) {
    var url = 'https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=' +
      token + '&code=' +
      code;

    request({
      url: url,
      json: true,
    }, function (error, response, body) {
      if (!error && response.statusCode === 200 && body.UserId) {
        callback(body.UserId);
      } else {
        callback('');
      }
    });
  };

  // 获取成员详情
  // POST
  // https://qyapi.weixin.qq.com/cgi-bin/user/getuserdetail?access_token=ACCESS_TOKEN
  _getuserdetailFromWeixin = function (token, UserId, callback) {
    var url = 'https://qyapi.weixin.qq.com/' +
      'cgi-bin/user/get?access_token=' +
      token + '&userid=' + UserId;

    request({
      url: url,
      json: true,
    }, function (error, response, body) {
      if (!error && response.statusCode === 200 && body.errcode === 0) {
        callback(body);
      } else {
        callback(null);
      }
    });
  };

  // getToken = function (callback) {
  //   Public.findOne({ name: 'wxaccesstoken' }, function (err, token) {
  //     if (err) {
  //       console.log(err);
  //       return callback({ success: 0 });
  //     }

  //     if (token) {
  //       if (_checkToken(token.createAt)) {
  //         callback({ success: 1, token: token });
  //       } else {
  //         var oldToken = token.access_token;

  //         _getTokenFromWeixin(function (token) {
  //           if (token) {
  //             if (token === oldToken) {

  //             }
  //           } else {
  //             callback({ success: 0 });
  //           }
  //         });
  //       }
  //     } else {
  //     }
  //   });
  // };

  // https://qyapi.weixin.qq.com/cgi-bin/user/create?access_token=ACCESS_TOKEN
  _addWXUser = function (obj, token, callback) {
    var url = 'https://qyapi.weixin.qq.com/' +
      'cgi-bin/user/create?access_token=' +
      token;

    request({
      url: url,
      method: 'POST',
      json: true,
      body: {
        userid: obj.phone,
        name: obj.operator,
        department: [200],
        mobile: obj.phone,
        extattr: {
          attrs: [{
            name: 'cid',
            value: obj.cid
          }]
        }
      },
    }, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        // body 是 Object
        if (body.errcode === 0) {
          callback({ success: 1, body: { status: 4 } });
        } else {
          callback({ success: 0 });
        }
      } else {
        callback({ success: 0 });
      }
    });
  };

  // TODO 比 getWXInfo 少了 _addWXUser
  getWXInfoSm = function (phone, callback) {
    _getTokenFromWeixin(function (token) {
      if (token) {
        var url = 'https://qyapi.weixin.qq.com/' +
          'cgi-bin/user/get?access_token=' +
          token + '&userid=' + phone;

        request({
          url: url,
          json: true,
        }, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            // body 是 Object
            if (body.errcode === 0) {
              callback({ success: 1, token: token });
            } else {
              callback({ success: 0 });
            }
          } else {
            callback({ success: 0 });
          }
        });
      } else {
        callback({ success: 0 });
      }
    });
  };

  getWXInfo = function (obj, callback) {
    _getTokenFromWeixin(function (token) {
      if (token) {
        var url = 'https://qyapi.weixin.qq.com/' +
          'cgi-bin/user/get?access_token=' +
          token + '&userid=' + obj.phone;

        request({
          url: url,
          json: true,
        }, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            // body 是 Object
            if (body.errcode === 0) {
              callback({ success: 1, body: body });
            } else if (body.errcode === 60111) {
              // userid not found
              // 添加用户
              _addWXUser(obj, token, callback);
            } else {
              callback({ success: 0 });
            }
          } else {
            callback({ success: 0 });
          }
        });
      } else {
        callback({ success: 0 });
      }
    });
  };

  // 比 sendWXMessage 少了 _getTokenFromWeixin
  //  https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=ACCESS_TOKEN
  sendWXMessageSm = function (obj, callback) {
    var url = 'https://qyapi.weixin.qq.com/' +
      'cgi-bin/message/send?access_token=' +
      obj.token;

    request({
      url: url,
      method: 'POST',
      json: true,
      body: {
        touser: obj.userNames.join('|'),
        msgtype: 'text',
        agentid: 0,
        text: {
          content: obj.msg
        }
      },
    }, function (error, response, body) {
      // if (!error && response.statusCode === 200) {
      //   // body 是 Object
      //   if (body.errcode === 0) {
      //     callback({ success: 1 });
      //   } else {
      //     callback({ success: 0 });
      //   }
      // } else {
      //   callback({ success: 0 });
      // }
      console.log(error)
      console.log(body)
      callback()
    });
  };

  sendWXMessage = function (obj, callback) {
    _getTokenFromWeixin(function (token) {
      if (token) {
        var url = 'https://qyapi.weixin.qq.com/' +
          'cgi-bin/message/send?access_token=' +
          token;

        request({
          url: url,
          method: 'POST',
          json: true,
          body: {
            touser: obj.userNames.join('|'),
            msgtype: 'text',
            agentid: 0,
            text: {
              content: obj.msg,
            },
          },
        }, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            // body 是 Object
            if (body.errcode === 0) {
              callback({ success: 1 });

              // SmCtrl.kanbanUpdate(obj, callback);
            } else {
              callback({ success: 0 });
            }
          } else {
            callback({ success: 0 });
          }
        });
      } else {
        callback({ success: 0 });
      }
    });
  };

  zxwxFindByName = function (obj, callback) {
    var search = { name: obj.name };
    var startDate =  moment().subtract(30, 'days');
    search.liveTime = { $gte: startDate };

    Pingan.find(search, {
      _id: 0,
      pinganCardNum: 1,
      password: 1,
      cardNum: 1,
      liveTime: 1,
      birthday: 1,
      sex: 1,
      cardType: 1,
      cardCategory: 1
    }, function (err, pingans) {
      if (err) {
        return callback([]);
      }

      var _pingans = [];

      var len = pingans.length;
      var i;

      for (i = 0; i < len; i++) {
        _pingans.push({
          pinganCardNum: pingans[i].pinganCardNum,
          password: pingans[i].password,
          cardNum: pingans[i].cardNum,
          liveTime: moment(pingans[i].liveTime).format('YYYY-MM-DD'),
          name: obj.name,
          birthday: pingans[i].birthday,
          sex: pingans[i].sex,
          cardType: pingans[i].cardType,
          cardCategory: pingans[i].cardCategory
        });
      }

      callback(_pingans);
    });
  };

  zxwxInsuranceinfo = function (obj, callback) {
    var j = request.jar();
    var url1 = 'http://pingan.com/sics/';
    var url2 = 'http://pingan.com/sics/searchPolicyByClient.do';

    request({
      url: url1,
      jar: j,
      method: 'GET',
      encoding: null,
      headers: {
        Host: 'www.pingan.com',
        Connection: 'Keep-Alive',
        'Cache-Control': 'max-age=0',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) ' +
          'Chrome/52.0.2743.116 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,' +
          'application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6',
      }
    }, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var $;
        var randomNumHidden;

        body = iconv.decode(body, 'gbk');  //转码

        $ = cheerio.load(body, { decodeEntities: false });
        randomNumHidden = $('form[name=form1]').find('input[name=randomNumHidden]').val();

        request({
          url: url2,
          jar: j,
          method: 'POST',  // POST方式请求
          encoding: null,  // 由于Node默认是UTF-8，而平安用的GBK，所以不进行转码
          headers: {
            Accept: 'text/html, */*; q=0.01',
            'Accept-Language': 'zh-CN,zh;q=0.8',
            Connection: 'Keep-Alive',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            Host: 'pingan.com',
            Origin: 'http://pingan.com',
            Referer: 'http://pingan.com/sics/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64; ' +
              'Trident/7.0; rv:11.0) like Gecko/20100101 Firefox/22.0',
            'X-Requested-With': 'XMLHttpRequest'
          },
          form: {
            flag: '104',
            randomNumHidden: randomNumHidden,
            ins_group_nexturl: '/new/insurance',
            cardpwd: obj.cardpwd,
            cardno: obj.pinganCardNum,
            idno: obj.cardNum
          }
        }, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            var cardType1 = '';
            var cardNum1 = '';
            var phone1 = '';
            var insuranceTime = '';
            var sales = '';
            var $table;
            var $trs;
            var trLen;
            var i;
            var $ths;
            var $th0;

            body = iconv.decode(body, 'gbk');  //转码
            $ = cheerio.load(body, { decodeEntities: false });

            $table = $('.detail_info_tb');
            if ($table.length) {
              $trs = $table.find('tr');
              trLen = $trs.length;
              for (i = 0; i < trLen; i++) {
                // 证件类型
                // 证件号码
                // 移动电话
                // 保险期间
                // 销售机构
                $ths = $trs.eq(i).find('th');
                if ($ths.length) {
                  $th0 = $ths.eq(0);
                  if ($th0.text().indexOf('证件类型') !== -1) {
                    if (!cardType1) {
                      cardType1 = $th0.next().text();
                      cardNum1 = $th0.next().next().next().text();
                    }

                  } else if ($th0.text().indexOf('移动电话') !== -1) {
                    if (!phone1) {
                      phone1 = $th0.next().text();
                    }
                  } else if ($th0.text().indexOf('保险期间') !== -1) {
                    insuranceTime = $th0.next().text();
                  } else if ($th0.text().indexOf('销售机构') !== -1) {
                    sales = $th0.next().text();
                  }
                }
              }

              callback({
                caption: $table.find('caption').html(),
                cardType1: cardType1,
                cardNum1: cardNum1,
                phone1: phone1,
                insuranceTime: insuranceTime,
                sales: sales
              });
            } else {
              callback({});
            }            
          } else {
            callback({});
          }
        });
      } else {
        callback({});
      }
    });
  };

  zxwxImgcode = function (obj, callback) {
    // https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=APPID&secret=APPSECRET
    // https://api.weixin.qq.com/cgi-bin/wxaapp/createwxaqrcode?access_token=ACCESS_TOKEN
    var url11 = 'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=' + obj.APPID + '&secret=' + obj.SECRET;
    var url12 = 'https://api.weixin.qq.com/cgi-bin/wxaapp/createwxaqrcode?access_token=';

    var Writable = require('stream').Writable;
    var ws = Writable();
    var chunks = [];
    var size = 0;

    var _step12;

    ws._write = function (chunk, end, next) {
      size += chunk.length;
      chunks.push(chunk);
      next();
    };

    ws.on('finish', function () {
      var buf = Buffer.concat(chunks, size);
      var data = 'data:image/jpg;base64,' + buf.toString('base64');
      callback({ success: 1, data: data });
    });

    _step12 = function (error, response, body) {
      if (!error && response.statusCode === 200) {
        console.log(body);
        var token = JSON.parse(body).access_token;

        request({
          url: url12 + token,
          method: 'POST',
          json: true,
          body: {
            path: 'page/' + obj.page + '/' + obj.page,
            width: 430,
          },
        }).pipe(ws);
      }
    };

    request.get(url11, _step12);
  };

  optLogin = function (code, callback) {
    _getTokenFromWeixin(function (token) {
      if (token) {
        _getuserinfoFromWeixin(token, code, function (UserId) {
          if (UserId) {
            _getuserdetailFromWeixin(token, UserId, function (user) {
              if (user && user.extattr.attrs[0].value) {
                Company.findOne({ _id: user.extattr.attrs[0].value }, { city: 1 }, function (err, company) {
                  if (!err && company && company.city) {
                    callback({ success: 1, company: company });
                  } else {
                    callback({ success: 0, msg: 'unCompany' });
                  }
                })
              } else {
                callback({ success: 0, msg: 'unUser' });
              }
            })
          } else {
            callback({ success: 0, msg: 'unUserId' });
          }
        })
      } else {
        callback({ success: 0, msg: 'unToken' });
      }
    })
  }

  return {
    _listFind: _listFind,
    list: list,
    updatePingan: updatePingan,
    savePingans: savePingans,
    findPingansIn: findPingansIn,
    testRepeatCardNum: testRepeatCardNum,
    getServerManCards: getServerManCards,

    chinaDownloadImg: chinaDownloadImg,
    chinaPostData: chinaPostData,
    pinganDownloadImg: pinganDownloadImg,
    pinganPostData: pinganPostData,
    ukeaxPostData: ukeaxPostData,

    // getToken: getToken,
    getWXInfoSm: getWXInfoSm,
    getWXInfo: getWXInfo,
    sendWXMessageSm: sendWXMessageSm,
    sendWXMessage: sendWXMessage,

    zxwxFindByName: zxwxFindByName,
    zxwxInsuranceinfo: zxwxInsuranceinfo,
    zxwxImgcode: zxwxImgcode,

    optLogin: optLogin,
  };
};

module.exports = createCtrl;
