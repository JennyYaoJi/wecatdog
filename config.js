/*
 * 配置文件
 * 
 */
'use strict'

var path = require('path');
var util = require('./libs/util');

var wechat_file = path.join(__dirname,'./config/wechat.txt');

var config = {
	wechat:{
		appID:'wx572be70772a7695e',
		appSecret:'d22140df0131cd2d0d1b83acdbfdeb55',
		token:'wechatdog',
		getAccessToken:function(){
			return util.readFileAsync(wechat_file);
		},
		saveAccessToken:function(data){
			return util.writeFileAsync(wechat_file,data);
		},
	}
};

module.exports = config;