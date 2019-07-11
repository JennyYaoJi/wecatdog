/*
 * 处理weixin的业务逻辑
 * replay、支付、错误信息的通知等
 */
'use strict'

var config = require('./config');
var Wechat = require('./wechat/wechat');
// var menu = require('./menu');
// var crawler = require('./crawler/crawler')

var wechatApi = new Wechat(config.wechat);

var catQuestions = ['你想知道你适合什么猫咪吗？下面一共有6道测试题，准备开始请输入1， 结束测试请输入0', '你喜欢高冷的还是亲人的猫咪？ A. 高冷   B. 亲人', '你能接受猫咪掉毛吗？ A. 能忍受   B. 不能或不太能忍受', 
	'你有足够的开销用于猫咪的后期养护吗？ A. 有   B. 没有', '你有足够的时间陪伴猫咪吗？ A. 有    B. 没有', 
	'你家里有小baby或者小狗吗？ A. 有   B. 没有', '你更倾向于聪明的猫咪还是呆萌的猫咪呢？ A. 聪明的   B. 呆萌的', '测试结束']
var catAnswer = [];
var validAnswer = [];

exports.reply = function* (next){
	var message = this.weixin;
	if(message.MsgType === 'event'){
		if(message.Event === 'subscribe'){
			if(message.EventKey) {
				console.log('扫描二维码关注：'+ message.EventKey +' '+ message.ticket);
			}
			this.body = '终于等到你，还好我没放弃';
		}else if(message.Event === 'unsubscribe'){
			this.body = '';
			console.log(message.FromUserName + ' 悄悄地走了...');
		}else if(message.Event === 'LOCATION'){
			this.body = '您上报的地理位置是：'+ message.Latitude + ',' + message.Longitude;
		}else if(message.Event === 'SCAN'){
			this.body = '关注后扫描二维码：'+ message.Ticket;
		}
	}else if(message.MsgType === 'text'){
		var content = message.Content;
		var reply = '你说的话：“' + content + '”，我听不懂呀';
		if(content === '猫咪'){
			reply = catQuestions[0];
			catAnswer.push(content);
		}
		if(content === '1' && catAnswer.length === 1 && catAnswer[0] === '猫咪'){
			reply = catQuestions[1];
			catAnswer.push(content);
		}
		/*
			注意：
			如果是被动回复视频消息，不建议在用户发送数字后上传资源再回复用户，
			上传视频需要时间，如果未能在5秒内回复用户的消息，微信会提示系统服务不可用，
			所以视频必须是提前先上传好的，只需要获取其media_id，再回复用户就可以。
		*/ 
		/*
		else if(content === '12'){
			var data = yield wechatApi.uploadTempMaterial('video', __dirname + '/public/vuejs.mp4');
			console.log(data);
			reply = {
				type: 'video',
				title: 'vuejs',
				description: 'vuejs入门介绍',
				mediaId: data.media_id
			}
			console.log(reply);
		}
		*/
		// ... 其他回复类型
		this.body = reply;
	}
	yield next;
}

function isObjectValueEqual(a, b) {
  var aProps = Object.getOwnPropertyNames(a);
  var bProps = Object.getOwnPropertyNames(b);

  if (aProps.length != bProps.length) {
    return false;
  }

  for (var i = 0; i < aProps.length; i++) {
    var propName = aProps[i];

    if(a[propName] instanceof Object ){
			if(!isObjectValueEqual(a[propName],b[propName])) return false;
    }
    else if (a[propName] !== b[propName]) {
      return false;
    }
  }
  return true;
}

// exports.setMenu = function* (next){
// 	var menuData = yield wechatApi.getMenu();
// 	if(!isObjectValueEqual(menuData,menu)){
// 		wechatApi.deleteMenu().then(function(){
// 			return wechatApi.createMenu(menu);
// 		}).then(function(msg){
// 			console.log('createMenu:'+msg);
// 		});
// 	}
// }

exports.sendMsg = function* (next){
	var movieList = yield crawler.getMovieList();
	var articles = [];
	for(var i = 0;i < movieList.length; i++){
		var data = yield wechatApi.uploadPermMaterial('other',__dirname+'/public/king.jpg');
		var article = {
			title: movieList[i].name,
			thumb_media_id: data.media_id,
			author: 'panfen',
			digest: '',
			show_cover_pic: 1,
			content: movieList[i].ftp,
			content_source_url: movieList[i].link		
		}
		articles.push(article);
	};
	var newsData = yield wechatApi.uploadPermMaterial('news',articles);
	var mpnews = {
		filter:{
			is_to_all:true,
			group_id:0
		},
		mpnews:{
			media_id:''
		},
		msgtype:'mpnews'
	}
	yield next;
}