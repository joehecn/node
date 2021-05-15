/* jshint
   node: true,        devel: true,
   maxstatements: 28, maxparams: 3, maxdepth: 2,
   maxerr: 50,        nomen: true,  regexp: true
 */

/**
 * idcardsm controller 模块
 * @module app/controllers/idcardsm
 */
'use strict';

var alyunAppcode = '9e1999c4a62a48dc9cd94d7198c011e2';
var avatarKey = '705c841dfae84982bfe13a708abfa59b';

var request = require('request');
var crypto = require('crypto');
var gzt = require('../gzt.js');

// 微信支付商户号 mch_id
var zxwx_mch_id = '1358196902';
var ygwxfw_mch_id = '1439570702';

// 随机字符串产生函数
var createNonceStr = function () {
  return Math.random().toString(36).substr(2, 15);
}

// 时间戳产生函数
var createTimeStamp = function () {
  return parseInt(new Date().getTime() / 1000) + '';
}

// object-->string
var thisraw = function (args) {
  var keys = Object.keys(args);
  keys = keys.sort();
  var newArgs = {};
  keys.forEach(function(key) { 
    newArgs[key] = args[key];
  }) 
  var string = '';
  for (var k in newArgs) { 
    string += '&' + k + '=' + newArgs[k];
  } 
  string = string.substr(1);
  return string;
}

var ordersignjsapi = function (appid, mch_id, nonce_str, transaction_id, keykey) {
  // console.log('ordersignjsapi');
  // console.log(appid);
  // console.log(mch_id);
  // console.log(nonce_str);
  // console.log(transaction_id);
  // console.log(keykey);
  var ret = { 
   appid: appid,
   mch_id: mch_id, 
   nonce_str: nonce_str, 
   transaction_id: transaction_id, 
  };
  var string = thisraw(ret);
  string = string + '&key=' + keykey;
  var sign = crypto.createHash('md5').update(string, 'utf8').digest('hex'); 
  return sign.toUpperCase();
}

// 统一下单接口加密获取sign
var paysignjsapi = function (appid, attach, body, mch_id, nonce_str, notify_url, openid, out_trade_no, spbill_create_ip, total_fee, trade_type, keykey) {
  var ret = { 
   appid: appid, 
   attach: attach, 
   body: body, 
   mch_id: mch_id, 
   nonce_str: nonce_str, 
   notify_url: notify_url, 
   openid: openid, 
   out_trade_no: out_trade_no, 
   spbill_create_ip: spbill_create_ip, 
   total_fee: total_fee, 
   trade_type: trade_type 
  };
  var string = thisraw(ret);
  string = string + '&key=' + keykey;
  var sign = crypto.createHash('md5').update(string, 'utf8').digest('hex'); 
  return sign.toUpperCase();
}

// 支付md5加密获取sign
var paysignjs = function (appid, nonceStr, _package, signType, timeStamp, keykey) {
  var ret = { 
    appId: appid, 
    nonceStr: nonceStr, 
    package: _package, 
    signType: signType, 
    timeStamp: timeStamp 
  };
  var string = thisraw(ret);
  string = string + '&key=' + keykey;
  var sign = crypto.createHash('md5').update(string, 'utf8').digest('hex');
  return sign.toUpperCase();
};

var createCtrl = function (dbHost, dbName) {
  // 16
  var _ERRS = {
    ADD_ERR: '16999',
  };
  var ctrlName = 'idcardsm';
  var Idcardsm = require('../model')(dbHost, dbName, ctrlName);
  var Idcard = require('../model')(dbHost, 'auth', 'idcard');
  var zxutil = require('../zxutil');
  var errCode;

  // var fs = require('fs');
  // var errorLogfile =
  //     fs.createWriteStream(__dirname + 'db_err.log', { flags: 'a' });

  // public methods
  var findIdcard;
  var add;
  var addToIdCard; // 仅仅入库姓名与身份证一致的条目
  var aggregateMessage;
  var aggregateName;
  var addToIdCardFromIdCardSm;
  var getXMLNodeValue;
  var ygwxfwGetOpenid;
  var _orderquery;
  var _tonyiOder;
  var zxwxPostLogin;
  var zxwxPostIdcard;
  var _decodeIdcard;
  var ygwxfwPostLogin;
  var ygwxfwPostIdcard;

  findIdcard = function (obj, callback) {
    Idcard.findOne(obj, function (err, idcard) {
      if (err) {
        errCode = _ERRS.ADD_ERR;
        zxutil.writeLog(ctrlName, errCode, err, obj);
        callback({ idcard: null });
      }

      callback({ idcard: idcard });
    });
  };

  add = function (obj) {
    var newObj = new Idcardsm(obj);

    newObj.save(function (err) {
      if (err) {
        errCode = _ERRS.ADD_ERR;
        zxutil.writeLog(ctrlName, errCode, err, obj);
      }
    });
  };

  addToIdCard = function (obj) {
    // obj: { cardNum, name }
    var newObj = new Idcard(obj);

    newObj.save(function (err) {
      if (err) {
        errCode = _ERRS.ADD_ERR;
        zxutil.writeLog(ctrlName, errCode, err, obj);
      }
    });
  };

  // 按 message 汇总
  aggregateMessage = function (callback) {
    Idcardsm.aggregate([
      { $project: { message: 1, _id: 0 } },
      { $group: { _id: '$message', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).exec(function (err, messages) {
      if (err) { callback([]); }

      callback(messages);
    });
  };

  // 统计重名
  // 姓名与身份证一致
  aggregateName = function (callback) {
    Idcardsm.aggregate([
      { $project: { name: 1, cardNum: 1, _id: 0 } },
      {
        $group: {
          _id: { name: '$name', cardNum: '$cardNum' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 2000 },
    ]).exec(function (err, names) {
      if (err) { callback([]); }

      callback(names);
    });
  };

  // 批处理 addToIdCardFromIdCardSm
  addToIdCardFromIdCardSm = function (callback) {
    Idcardsm.aggregate([
      { $match: { message: '一致' } },
      { $project: { name: 1, cardNum: 1, _id: 0 } },
      {
        $group: {
          _id: { name: '$name', cardNum: '$cardNum' },
          count: { $sum: 1 },
        },
      },
    ]).exec(function (err, pps) {
      var i = 0;
      var len;

      if (err) { callback(i); }

      len = pps.length;

      pps.forEach(function (pp) {
        Idcard.findOneAndUpdate(
          { cardNum: pp._id.cardNum },
          { $set: { name: pp._id.name } },
          { new: false, upsert: true }, function () {
            i += 1;
            if (i === len) {
              callback(len);
            }
          });
      });
    });
  };

  getXMLNodeValue = function (node_name, xml) {
  if (xml.indexOf(node_name) !== -1) {
    var tmp = xml.split('<' + node_name + '>');
    var tmp1 = tmp[1].split('</' + node_name + '>');
    var tmp2 = tmp1[0].split('[');
    var tmp3 = tmp2[2].split(']');
    return tmp3[0];
  } else {
    return null;
  }
};

  // openid
  ygwxfwGetOpenid = function (obj, callback) {
    // 获取code后，请求以下链接获取access_token openid
    // https://api.weixin.qq.com/sns/oauth2/access_token?appid=APPID&secret=SECRET&code=CODE&grant_type=authorization_code
    var url1 = 'https://api.weixin.qq.com/sns/oauth2/access_token?appid=' +
        obj.APPID +
        '&secret=' +
        obj.SECRET +
        '&code=' +
        obj.CODE +
        '&grant_type=authorization_code';

    var bodyObj;

    // login
    request.get({ url: url1}, function (error, response, body) {
      if (error || response.statusCode !== 200) {
        callback({});
        return;
      }

      try {
        bodyObj = JSON.parse(body);
        callback(bodyObj);
      } catch(e) {
        callback({});
      }
    });
  };

  _orderquery = function (mch_id, obj, bodyObj, callback) {
    // https://api.mch.weixin.qq.com/pay/orderquery
    // appid
    // mch_id
    // transaction_id
    // nonce_str
    // sign

    var nonce_str = createNonceStr();

    var formData = '<xml>';
    formData += '<appid>' + obj.APPID + '</appid>'; // appid
    formData += '<mch_id>' + mch_id + '</mch_id>'; //商户号 
    formData += '<nonce_str>' + nonce_str + '</nonce_str>'; //随机字符串，不长于32位。 
    formData += '<transaction_id>' + obj.id + '</transaction_id>'; //随机字符串，不长于32位。 
    formData += '<sign>' +
      ordersignjsapi(
        obj.APPID,
        mch_id,
        nonce_str,
        obj.id,
        obj.keykey
      ) + '</sign>';
    formData += '</xml>';

    request({
      url: 'https://api.mch.weixin.qq.com/pay/orderquery', 
      method: 'POST', 
      body: formData
    }, function (error, response, body) {
      if (error || response.statusCode !== 200) {
        callback({});
        return;
      }

      var _bodystr = body.toString('utf-8');
      // console.log('-------order bodystr');
      // console.log(_bodystr)

      var openid = getXMLNodeValue('openid', _bodystr);
      if (!openid) {
        callback({});
        return;
      }

      var attach = getXMLNodeValue('attach', _bodystr);
      if (!openid) {
        callback({});
        return;
      }

      callback({ openid: openid, attach: attach });
    });
  }

  // 统一下单
  _tonyiOder = function (mch_id, obj, bodyObj, callback) {
    // appid obj.APPID 小程序ID
    // mch_id 微信支付商户号
    // nonce_str createNonceStr() 随机字符串，不长于32位
    // sign paysignjsapi() 签名
    // appid, attach, body, mch_id, nonce_str, notify_url, openid, 
    // out_trade_no, spbill_create_ip, total_fee, trade_type
    // body 智享阳光服务-身份验证 商品简单描述 该字段须严格按照规范传递
    // attach '测试' 附加数据
    // out_trade_no  'idcard' + createNonceStr() + createTimeStamp() 商户系统内部的订单号
    // total_fee obj.total_fee 100 订单总金额，单位为分
    // spbill_create_ip obj.spbill_create_ip 用户IP
    // notify_url https://node.zxsl.net.cn/zxwx/notify
    // trade_type JSAPI
    // openid body.openid
    var nonce_str = createNonceStr();
    var timeStamp = createTimeStamp();
    var out_trade_no = 'idcard' + nonce_str + timeStamp;

    var formData = '<xml>';
    formData += '<appid>' + obj.APPID + '</appid>'; // appid
    formData += '<mch_id>' + mch_id + '</mch_id>'; //商户号 
    formData += '<nonce_str>' + nonce_str + '</nonce_str>'; //随机字符串，不长于32位。 
    formData += '<sign>' +
      paysignjsapi(
        obj.APPID,
        obj.attach,
        obj.body,
        mch_id,
        nonce_str,
        obj.notify_url,
        bodyObj.openid,
        out_trade_no,
        obj.spbill_create_ip,
        obj.total_fee,
        'JSAPI',
        obj.keykey
      ) + '</sign>';
    formData += '<body>' + obj.body + '</body>';
    formData += '<attach>' + obj.attach + '</attach>'; //附加数据 
    formData += '<out_trade_no>' + out_trade_no + '</out_trade_no>';
    formData += '<total_fee>' + obj.total_fee + '</total_fee>';
    formData += '<spbill_create_ip>' + obj.spbill_create_ip + '</spbill_create_ip>';
    formData += '<notify_url>' + obj.notify_url + '</notify_url>';
    formData += '<trade_type>JSAPI</trade_type>';
    formData += '<openid>' + bodyObj.openid + '</openid>';
    formData += '</xml>';

    request({
      url: 'https://api.mch.weixin.qq.com/pay/unifiedorder', 
      method: 'POST', 
      body: formData
    }, function (error, response, body) {
      if (error || response.statusCode !== 200) {
        callback({});
        return;
      }

      // 再次签名
      var prepay_id = getXMLNodeValue('prepay_id', body.toString('utf-8'));
      if (!prepay_id) {
        callback({});
        return;
      }

      var _paySignjs = paysignjs(obj.APPID, nonce_str, 'prepay_id=' + prepay_id, 'MD5', timeStamp, obj.keykey);
      var args = {
       timeStamp: timeStamp, 
       nonceStr: nonce_str,
       package: prepay_id, 
       paySign: _paySignjs,
      };
      callback(args);
    });
  };

  zxwxPostLogin = function (obj, callback) {
    // 小程序
    // https://api.weixin.qq.com/sns/jscode2session?appid=APPID&secret=SECRET&js_code=JSCODE&grant_type=authorization_code
    var url1 = 'https://api.weixin.qq.com/sns/jscode2session?appid=' +
        obj.APPID +
        '&secret=' +
        obj.SECRET +
        '&js_code=' +
        obj.JSCODE +
        '&grant_type=authorization_code';

    var bodyObj;

    // login
    request.get({ url: url1}, function (error, response, body) {
      if (error || response.statusCode !== 200) {
        callback({});
        return;
      }

      // body
      // {"session_key":"cOllXlOYlhPilZKJlDv+FA==","expires_in":2592000,"openid":"o0WP60JsDFq8jHjHMheyDtUhZUJA"}

      try {
        bodyObj = JSON.parse(body);
        if (!bodyObj.openid) {
          callback({});
          return;
        }
      } catch(e) {
        callback({});
        return;
      }

      // 统一下单
      _tonyiOder(zxwx_mch_id, obj, bodyObj, callback);
    });
  };

  // zxwxPostIdcard = function (obj, callback) {
  //   // console.log('------ zxwxPostIdcard')
  //   // console.log(obj)
  //   // 在自己的数据库中找
  //   findIdcard({ cardNum: obj.cardNum }, function (result) {
  //     if (result.idcard) {
  //       if (result.idcard.name === obj.name) {
  //         obj.message = '一致';
  //       } else {
  //         obj.message = '不一致';
  //       }

  //       callback({
  //         error_code: 0,
  //         result: {
  //           message: obj.message,
  //         },
  //       });
  //     } else {
  //       // callback({
  //       //   error_code: 0,
  //       //   result: {
  //       //     message: '找何苗',
  //       //   },
  //       // });

  //       var realname = obj.name;
  //       var idcard = obj.cardNum;

  //       // 阿里云
  //       var url = 'http://jisusfzsm.market.alicloudapi.com/idcardverify/verify?idcard=' +
  //         idcard +
  //         '&realname=' +
  //         encodeURI(realname);

  //       request({
  //         url: url,
  //         json: true,
  //         headers: {
  //           Authorization: 'APPCODE ' + alyunAppcode
  //         }
  //       }, function (error, response, body) {
  //         if (error || (response.statusCode !== 200 && response.statusCode !== 404)) {
  //           // avatardata
  //           // zhixiangshanglv yangguang2016!
  //           url = 'http://api.avatardata.cn/IdCardCertificate/Verify?key=' +
  //             avatarKey +
  //             '&realname=' +
  //             encodeURI(realname) +
  //             '&idcard=' +
  //             idcard;

  //           request.get({ url: url, json: true },
  //               function (error, response, body) {

  //             if (error || response.statusCode !== 200) {
  //               callback({
  //                 error_code: 999,
  //                 reason: '请求失败',
  //               });
  //               return;
  //             }

  //             //body
  //             //{ error_code: 10010, reason: '请求超过次数限制，请购买套餐' }

  //             if (body.error_code === 0) {
  //               // 查询成功
  //               if (body.result.message === '一致') {
  //                 addToIdCard({
  //                   cardNum: obj.cardNum,
  //                   name: obj.name,
  //                 });
  //               }
  //             }

  //             callback(body);
  //           });
  //         } else {
  //           var _body = {
  //             error_code: Number(body.status),
  //             result: {}
  //           };
            
  //           if (response.statusCode === 200 && _body.error_code === 0) {
  //             if (body.result.verifystatus === '0') {
  //               _body.result.message = '一致'
  //             } else {
  //               _body.result.message = body.result.verifymsg
  //             }
  //           } else {
  //             _body.result.message = body.msg
  //           }

  //           if (_body.result.message === '一致') {
  //             addToIdCard({
  //               cardNum: obj.cardNum,
  //               name: obj.name,
  //             });
  //           }

  //           callback(_body);
  //         }
  //       });
  //     }
  //   });
  // };

  zxwxPostIdcard = function (obj, callback) {
    // 在自己的数据库中找
    findIdcard({ cardNum: obj.cardNum }, function (result) {
      if (result.idcard) {
        if (result.idcard.name === obj.name) {
          obj.message = '一致';
        } else {
          obj.message = '不一致';
        }

        callback({
          error_code: 0,
          result: {
            message: obj.message,
          },
        });
      } else {
        var realname = obj.name;
        var idcard = obj.cardNum;
        // 国政通
        // console.log('国政通')
        gzt(obj.name + ',' + obj.cardNum, function (xmlObj) {
          // console.log(xmlObj)
          if (xmlObj.data &&
              xmlObj.data.message.status === '0' &&
              xmlObj.data.policeCheckInfos.policeCheckInfo.message.status === '0') {
            
            var _msg = xmlObj.data.policeCheckInfos.policeCheckInfo.compResult.$t

            // 查询成功
            if (_msg === '一致') {
              addToIdCard({
                cardNum: obj.cardNum,
                name: obj.name,
              });
            }

            callback({
              error_code: 0,
              result: {
                message: _msg,
              },
            });
          } else {
            // avatardata
            // zhixiangshanglv yangguang2016!
            url = 'http://api.avatardata.cn/IdCardCertificate/Verify?key=' +
              avatarKey +
              '&realname=' +
              encodeURI(realname) +
              '&idcard=' +
              idcard;

            request.get({ url: url, json: true },
                function (error, response, body) {

              if (error || response.statusCode !== 200) {
                callback({
                  error_code: 999,
                  reason: '请求失败',
                });
                return;
              }

              //body
              //{ error_code: 10010, reason: '请求超过次数限制，请购买套餐' }

              if (body.error_code === 0) {
                // 查询成功
                if (body.result.message === '一致') {
                  addToIdCard({
                    cardNum: obj.cardNum,
                    name: obj.name,
                  });
                }
              }

              callback(body);
            });
          }
        })
      }
    })
  };

  ygwxfwPostLogin = function (obj, callback) {
    ygwxfwGetOpenid(obj, function (bodyObj) {
      if (bodyObj.openid) {
        _tonyiOder(ygwxfw_mch_id, obj, bodyObj, callback);
      } else {
        callback({});
      }
    });

    // // 获取code后，请求以下链接获取access_token openid
    // // https://api.weixin.qq.com/sns/oauth2/access_token?appid=APPID&secret=SECRET&code=CODE&grant_type=authorization_code
    // var url1 = 'https://api.weixin.qq.com/sns/oauth2/access_token?appid=' +
    //     obj.APPID +
    //     '&secret=' +
    //     obj.SECRET +
    //     '&code=' +
    //     obj.CODE +
    //     '&grant_type=authorization_code';

    // var bodyObj;

    // // login
    // request.get({ url: url1}, function (error, response, body) {
    //   if (error || response.statusCode !== 200) {
    //     callback({});
    //     return;
    //   }

    //   // body
    //   // { "access_token":"ACCESS_TOKEN", "expires_in":7200, "refresh_token":"REFRESH_TOKEN", "openid":"OPENID", "scope":"SCOPE" } 
    //   try {
    //     bodyObj = JSON.parse(body);
    //     console.log(bodyObj);
    //     if (!bodyObj.openid) {
    //       callback({});
    //       return;
    //     }
    //   } catch(e) {
    //     callback({});
    //     return;
    //   }

    //   // 统一下单
    //   _tonyiOder(ygwxfw_mch_id, obj, bodyObj, callback);
    // });
  };

  _decodeIdcard = function (attach) {
    var obj = {};
    var len = attach.length;
    obj.idcard = attach.substr(0, 18);

    var _name = attach.substr(18);
    var _len = _name.length
    var arr = [];
    var i;
    for (i = 0; i < _len; i += 2) {
      arr.push(_name.substr(i, 2));
    }
    _name = '%' + arr.join('%')
    // console.log('----decodeURIComponent')
    // console.log(_name)
    obj.name = decodeURIComponent(_name);

    return obj;
  };

  ygwxfwPostIdcard = function (obj, callback) {
    ygwxfwGetOpenid(obj, function (bodyObj) {
      if (bodyObj.openid) {
        // 通过微信接口查订单
        _orderquery(ygwxfw_mch_id, obj, bodyObj, function (result) {
          // console.log('通过微信接口查订单')
          // console.log(result)
          if (result.openid && result.openid === bodyObj.openid) {
            // 通过 attach 解码 idcard name
            var _obj = _decodeIdcard(result.attach);

            zxwxPostIdcard({
              cardNum: _obj.idcard,
              name: _obj.name
            }, function (res) {
              res.idcard = _obj.idcard;
              res.name = _obj.name;
              callback(res);
            });

          } else {
            callback({
              error_code: 999,
              reason: '不存在此订单',
            });
          }
        });
      } else {
        callback({
          error_code: 999,
          reason: '请求用户失败',
        });
      }
    });
  };

  return {
    findIdcard: findIdcard,
    add: add,
    addToIdCard: addToIdCard,
    aggregateMessage: aggregateMessage,
    aggregateName: aggregateName,
    addToIdCardFromIdCardSm: addToIdCardFromIdCardSm,
    getXMLNodeValue: getXMLNodeValue,
    ygwxfwGetOpenid: ygwxfwGetOpenid,
    zxwxPostLogin: zxwxPostLogin,
    zxwxPostIdcard: zxwxPostIdcard,
    ygwxfwPostLogin: ygwxfwPostLogin,
    ygwxfwPostIdcard: ygwxfwPostIdcard,
  };
};

module.exports = createCtrl;
