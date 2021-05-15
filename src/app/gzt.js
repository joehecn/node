/*
 * 国政通-身份证验证: DEMO with nodejs 
 * leanbrown@live.cn 2017-07-07
 **/

var crypto = require('crypto');
var iconv = require('iconv-lite');
var soap = require('soap');
var parser = require('xml2json');

// key iv 相同
var KEY = '12345678';
// 4个参数
var userName = 'szzxwebservice';
var password = 'szzxwebservice_b~Pn4LSi';
var type = '1A020201';
// param

var key = Buffer.from(KEY);
var iv = key;

var converToGb18030 = function(plaintext) {
  return iconv.encode(plaintext, 'gb18030');
}

// 加密解密
var des = {
  encrypt:function(plainText){
    var cipher = crypto.createCipheriv('des-cbc', key, iv);
    cipher.setAutoPadding(true);
    var ciph = cipher.update(converToGb18030(plainText), 'utf8', 'base64');
    ciph += cipher.final('base64');
    return ciph;
  },
  decrypt:function(encryptText){
    var decipher = crypto.createDecipheriv('des-cbc', key, iv);
    decipher.setAutoPadding(true);
    var txt = decipher.update(encryptText, 'base64', 'latin1');
    txt += decipher.final();
    return txt;
  }
};

// des 分别加密4个参数
var userName_ = des.encrypt(userName);
var password_ = des.encrypt(password);
var type_ = des.encrypt(type);
// param

var url = 'http://gbossapp.id5.cn/services/QueryValidatorServices?wsdl';

// param: '何苗,432322197706060039'
var soapQuerySingle = function (param, callback) {
  var param_ = des.encrypt(param);
  var args = {
    userName_: userName_,
    password_: password_,
    type_: type_,
    param_: param_
  };

  soap.createClient(url, function(err, client) {
    if(err) {
      callback({});
    } else {
      client.querySingle(args, function(err, result) {
        if (err) {
          callback({});
        }else {
          var res = des.decrypt(result.querySingleReturn);
          var str = iconv.decode(Buffer.from(res, 'latin1'), 'gb18030')
          var obj =  parser.toJson(str, {
            object: true
          });
          callback(obj);
        }  
      });
    }
  });
}

module.exports = soapQuerySingle;
