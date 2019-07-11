/*
 * 处理access_token以及和微信交互的逻辑
 */
'use strict'

var fs = require('fs');
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var util = require('./util');

var prefix = 'https://api.weixin.qq.com/cgi-bin/';
var api = {
	accessToken:prefix+'token?grant_type=client_credential',
	uploadTempMaterial:prefix+'media/upload?',  //access_token=ACCESS_TOKEN&type=TYPE  上传临时素材
	getTempMaterial:prefix+'media/get?',        //access_token=ACCESS_TOKEN&media_id=MEDIA_ID 获取临时素材，GET请求
	uploadPermNews:prefix+'material/add_news?',   //access_token=ACCESS_TOKEN  上传永久图文
	uploadPermPics:prefix+'media/uploadimg?',   //access_token=ACCESS_TOKEN  上传永久图片
	uploadPermOther:prefix+'material/add_material?',   //access_token=ACCESS_TOKEN  上传永久其他素材
	getPermMaterial:prefix+'material/get_material?',   //access_token=ACCESS_TOKEN 获取永久素材，POST请求
	delPermMaterial:prefix+'material/del_material?',   //access_token=ACCESS_TOKEN 删除永久素材，POST请求
	menu:{
		create:prefix+'menu/create?',  //access_token=ACCESS_TOKEN  创建菜单
		get:prefix+'menu/get?',        //access_token=ACCESS_TOKE  获取菜单,GET请求
		delete:prefix+'menu/delete?',  //access_token=ACCESS_TOKEN	删除菜单,GET请求
		getInfo:prefix+'get_current_selfmenu_info?'  //access_token=ACCESS_TOKEN  获取自定义菜单配置接口
	},
	groups:{
		create:prefix+'groups/create?',  //access_token=ACCESS_TOKEN  创建分组，POST请求
		get:prefix+'groups/get?',        //access_token=ACCESS_TOKE  查询所有分组,GET请求
		getId:prefix+'groups/getid?',    //access_token=ACCESS_TOKEN  查询用户所在分组,POST请求
		update:prefix+'groups/update?',  //access_token=ACCESS_TOKEN  修改分组名,POST请求
		membersUpdate:prefix+'groups/members/update?',  //access_token=ACCESS_TOKEN  移动用户分组,POST请求
		membersBatchupdate:prefix+'groups/members/batchupdate?', //access_token=ACCESS_TOKEN  批量移动用户分组,POST请求
		delete:prefix+'groups/delete?'   //access_token=ACCESS_TOKEN	删除分组,POST请求
	},
	user:{
		updateUserRemark:prefix+'user/info/updateremark?',  //access_token=ACCESS_TOKEN  修改用户备注名，POST请求
		getUserInfo:prefix+'user/info?', //access_token=ACCESS_TOKEN&openid=OPENID&lang=zh_CN  获取用户基本信息，GET请求
		batchGetUserInfo:prefix+'user/info/batchget?',  //access_token=ACCESS_TOKEN，POST请求
		getUserOpenIds:prefix+'user/get?',  //access_token=ACCESS_TOKEN&next_openid=NEXT_OPENID，GET请求
	},
	mass:{
		sendall:prefix+'message/mass/sendall?',  //access_token=ACCESS_TOKEN 群发消息
	}
}

function Wechat(opts){     //构造函数
	var that = this;
	this.appID = opts.appID;
	this.appSecret = opts.appSecret;
	this.getAccessToken = opts.getAccessToken;
	this.saveAccessToken = opts.saveAccessToken;
	this.fetchAccessToken();
}

Wechat.prototype.fetchAccessToken = function(){
	var that = this;

	// 如果this上已经存在有效的access_token，直接返回this对象
	if(this.access_token && this.expires_in){
		if(this.isvalidAccessToken(this)){
			return Promise.resolve(this);
		}
	}

	this.getAccessToken().then(function(data){
		try{
			data = JSON.parse(data);
		}catch(e){
			return that.updateAccessToken();
		}
		if(that.isvalidAccessToken(data)){
			return Promise.resolve(data);
		}else{
			return that.updateAccessToken();
		}
	}).then(function(data){
		that.access_token = data.access_token;
		that.expires_in = data.expires_in;
		that.saveAccessToken(JSON.stringify(data));
		return Promise.resolve(data);
	});
}

Wechat.prototype.isvalidAccessToken = function(data){
	if(!data || !data.access_token || !data.expires_in) return false;
	var access_token = data.access_token;
	var expires_in = data.expires_in;
	var now = new Date().getTime();
	return (now < expires_in) ? true : false;
}

Wechat.prototype.updateAccessToken = function(){
	var appID = this.appID;
	var appSecret = this.appSecret;
	var url = api.accessToken + '&appid='+ appID +'&secret='+ appSecret;

	return new Promise(function(resolve,reject){
		request({url:url,json:true}).then(function(response){
			var data = response.body;
			var now = new Date().getTime();
			var expires_in = now + (data.expires_in - 20) * 1000;   //考虑到网络延迟、服务器计算时间,故提前20秒发起请求
			data.expires_in = expires_in;
			resolve(data);
		});
	});
}

Wechat.prototype.uploadTempMaterial = function(type,filepath){
	var that = this;
	var form = {  //构造表单
		media:fs.createReadStream(filepath)
	}
	return new Promise(function(resolve,reject){
		that.fetchAccessToken().then(function(data){
			var url = api.uploadTempMaterial + 'access_token=' + data.access_token + '&type=' + type;
			request({url:url,method:'POST',formData:form,json:true}).then(function(response){
				var _data = response.body;
				if(_data){
					resolve(_data)
				}else{
					throw new Error('upload temporary material failed!');
				}
			}).catch(function(err){
				reject(err);
			});
		});
	});
}

Wechat.prototype.uploadPermMaterial = function(type,material){
	var that = this;
	var form = {}
	var uploadUrl = '';
	if(type === 'pic') uploadUrl = api.uploadPermPics;
	if(type === 'other') uploadUrl = api.uploadPermOther;
	if(type === 'news'){
		uploadUrl = api.uploadPermNews;
		form = material
	}else{
		form.media = fs.createReadStream(material);
	}
	return new Promise(function(resolve,reject){
		that.fetchAccessToken().then(function(data){
			var url = uploadUrl + 'access_token=' + data.access_token;
			var opts = {
				method:'POST',
				url:url,
				json:true
			}
			if( type === 'news'){
				opts.body = form;
			}else{
				opts.formData = form;
			}
			request(opts).then(function(response){
				var _data = response.body;
				if(_data){
					resolve(_data);
				}else{
					throw new Error('upload permanent material failed!');
				}
			}).catch(function(err){
				reject(err);
			});
		});
	});
}

Wechat.prototype.getMaterial = function(mediaId,permanent){
	var that = this;
	var getUrl = permanent ? api.getPermMaterial : api.getTempMaterial;
	return new Promise(function(resolve,reject){
		that.fetchAccessToken().then(function(data){
			var url = getUrl + 'access_token=' + data.access_token;
			if(!permanent) url += '&media_id=' + mediaId;
			resolve(url)
		});
	});
}

Wechat.prototype.delMaterial = function(mediaId){
	var that = this;
	return new Promise(function(resolve,reject){
		that.fetchAccessToken().then(function(data){
			var url = api.delPermMaterial + 'access_token=' + data.access_token;
			var form = {media_id:mediaId}
			request({url:url,method:'POST',formData:form,json:true}).then(function(response){
				var _data = response.body;
				if(_data.errcode === 0){
					resolve();
				}else{
					throw new Error('delete permanent material failed!');
				}
			}).catch(function(err){
				reject(err);
			});
		});
	});
}

Wechat.prototype.replay = function(){
	var content = this.body;
	var message = this.weixin;

	var xml = util.tpl(content,message);

	this.status = 200;
	this.type = 'application/xml';
	this.body = xml;
}

Wechat.prototype.massSendMsg = function(type,message,groupid){
	var that = this;
	var msg = {
		filter:{},
		msgtype:type
	}
	if(!groupid){
		msg.filter.is_to_all = true
	}else{
		msg.filter.is_to_all = false;
		msg.filter.group_id = groupid;
	}
	msg[type] = message;
	return new Promise(function(resolve,reject){
		that.fetchAccessToken().then(function(data){
			var url = api.mass.sendall + 'access_token=' + data.access_token;
			request({method:'POST',url:url,body:msg,json:true}).then(function(response){
				var _data = response.body;
				if(_data.errcode === 0){
					resolve(_data);
				}else{
					throw new Error('send mass message failed: ' + _data.errmsg);
				}
			}).catch(function(err){
				reject(err);
			});
		});
	});
}

module.exports = Wechat;