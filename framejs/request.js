/*
 * @Author: tsr
 * @Date: 2020-12-10 19:12:53
 * @LastEditTime: 2021-02-04 22:31:31
 * @LastEditors: Please set LastEditors
 * @Description: 发送各类url请求
 * @FilePath: /scfgui-client/framejs/request.js
 */
const { net } = require('electron');

let request = {

    getUrl(cate) {
        let req = {
            protocol: "https:",
            hostname: "service-n1nmux9g-1251165361.gz.apigw.tencentcs.com",
            port: 443,
            path: ""
        }
        switch (cate) {
            case 'regaccount':
                req.path = "/release/scfgui/account/addaccount"
                return req;
            case 'addteam':
                req.path = "/release/scfgui/account/addteam"
                return req;
            case 'login':
                req.path = "/release/scfgui/account/login"
                return req;
            case 'listteams':
                //查看团队项目列表
                req.path = "/release/scfgui/project/listteams"
                return req;
            case 'listpersions':
                //查看个人项目列表
                req.path = "/release/scfgui/project/listpersions"
                return req;
            case 'getproject':
                //查看个人项目列表
                req.path = "/release/scfgui/project/getproject"
                return req;
            case 'setproject':
                //查看个人项目列表
                req.path = "/release/scfgui/project/setproject"
                return req;
            case 'deljoin':
                //删除团队成员
                req.path = "/release/scfgui/project/deljoin"
                return req;
            case 'accjoin':
                //删除团队成员
                req.path = "/release/scfgui/project/accjoin"
                return req;
            case 'listown':
                //删除团队成员
                req.path = "/release/scfgui/project/listown"
                return req;
            case 'savefunction':
                req.path = "/release/scfgui/project/savefunction"
                return req;
            case 'getymls':
                req.path = "/release/scfgui/project/getymls"
                return req;
            case 'getfunction':
                req.path = "/release/scfgui/project/getfunction"
                return req;
            case 'deployfunction':
                req.path = "/release/scfgui/project/deployfunction"
                return req;
            case 'editfunction':
                req.path = "/release/scfgui/project/editfunction"
                return req;
        }
        return false
    },
    post(event, arg) {
        console.info('post', arg)
        let req = this.getUrl(arg.cate)
        console.info('getUrl', req)
        var postData = JSON.stringify(arg.post)
        const request = net.request({
            method: 'POST',
            protocol: req.protocol,
            hostname: req.hostname,
            port: 443,
            path: req.path
        })
        request.on('response', (response) => {
            let data = ''
            // console.log(`HEADERS: ${JSON.stringify(response.headers)}`)
            response.on('data', (chunk) => {
                data += chunk
            })
            response.on('end', () => {
                event.reply(arg.cate + "end", data)
            })
        })
        request.write(postData);
        request.end()
    },
}

module.exports = request