/*
 * @Author: your name
 * @Date: 2021-01-13 20:25:55
 * @LastEditTime: 2021-02-04 20:35:29
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: /scfgui-client/html/js/teamproject.js
 */
var rsa = require("./rsa")
const { ipcRenderer } = require('electron')
const model = require("./model");

let teamProject = {
    finFun: null,

    getLogin() {
        let user = sessionStorage.getItem('user')
        if (user == null) {
            model.showModel('登陆信息异常', '请重新登陆', {
                confirm: { text: '重新登陆', funname: 'toLogin' }
            })
            return
        }
        return JSON.parse(user)
    },


    regFlushProjectFin(fun) {
        this.finFun = fun
    },

    flushAllProject() {
        let that = this
        ipcRenderer.once('listownend', (event, arg) => {
            let res = JSON.parse(arg)
            if (res.errorCode == 0) {
                //有团队项目
                if (res.data.teams.length > 0) {
                    that.decode(res.data, res.data.teams[0].teamname)
                } else if (res.data.persions.length > 0) {
                    //只有个人项目
                    that.decode(res.data, res.data.persions[0].teamname)
                } else {
                    that.saveProject(res.data)
                }
            } else {
                model.showModel('查询项目信息失败', res.errorMessage, {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
            }
        })

        let post = {
            code: this.getLogin().code,
            account: this.getLogin().accountmail
        }
        ipcRenderer.send('asynchronous-message',
            { post: post, type: 'net', cate: 'listown' })
    },

    //保存项目信息到内存
    saveProject(data) {
        ipcRenderer.sendSync('synchronous-message',
            { type: 'setglobalteam', data: data });
        if (this.finFun != null) {
            this.finFun()
        }
    },

    //依次解密,先多人项目, 再个人项目
    decode(pros, teamname) {
        let that = this
        ipcRenderer.once('privatepemend', (event, arg) => {
            for (let i = 0; i < pros.teams.length; ++i) {
                if (pros.teams[i].teamname == teamname) {
                    if (pros.teams[i].hasOwnProperty('project')) {
                        pros.teams[i].project = rsa.decryptProject(pros.teams[i].project, arg)
                    }
                    let tmp = ''
                    if (i == pros.teams.length - 1) {
                        if (pros.persions.length == 0) {
                            that.saveProject(pros)
                            return
                        }
                        tmp = pros.persions[0].teamname
                    } else {
                        tmp = pros.teams[i + 1].teamname
                    }
                    that.decode(pros, tmp)
                    return
                }
            }

            for (let i = 0; i < pros.persions.length; ++i) {
                if (pros.persions[i].teamname == teamname) {
                    console.info('dec persions:', i, pros.persions.length)
                    if (pros.persions[i].hasOwnProperty('project')) {
                        pros.persions[i].project = rsa.decryptProject(pros.persions[i].project, arg)
                    }
                    if (i == pros.persions.length - 1) {
                        console.info('end dec')
                        that.saveProject(pros)
                        return
                    }
                    that.decode(pros, pros.persions[i + 1].teamname)
                }
            }

        })

        //公钥
        ipcRenderer.send('asynchronous-message',
            {
                name: teamname,
                type: 'getprivatepem'
            })
    },

    getProjects() {
        return ipcRenderer.sendSync('synchronous-message', { type: 'getglobalteam' });
    },

    /**
     * 获取指定类型的项目列表
     * @param {*} cate 
     */
    getSpecProjects(cate) {
        let set = this.getProjects()
        if (cate == 'persion') {
            return set.persions
        } else {
            return set.teams
        }
    },

    valTeam(teamid, cate) {

        let ex = false
        let team = {}

        for (let tmpteam of this.getSpecProjects(cate)) {
            if (tmpteam._id == teamid) {
                ex = true
                team = tmpteam
                break
            }
        }

        if (!ex) {
            model.showModel('您已无法查看该项目', '', {
                confirm: { text: '确定', funname: 'hidDlg' }
            })
            return false
        }

        if (!team.hasOwnProperty('project')) {
            model.showModel('项目未配置', '您尚未对该项目进行配置<br>请先去"云配置信息"配置', {
                confirm: { text: '去配置', funname: 'toSet' },
                cancel: { text: '取消', funname: 'hidDlg' }
            })
            return false
        }
        if (team.project.secretId === false) {
            model.showModel('解密失败', "您的密钥配置不正确,请修改", {
                confirm: { text: '去配置', funname: 'toSet' },
                cancel: { text: '取消', funname: 'hidDlg' }
            })
            return false
        }
        if (team.isjoin === false) {
            model.showModel('您尚未同意加入', "请去'云配置信息'先同意该项目邀请", {
                confirm: { text: '去加入', funname: 'toSet' },
                cancel: { text: '取消', funname: 'hidDlg' }
            })
            return false
        }

        return team
    },

    /**
     * 当前默认项目
     * @param {*} cate 
     * @param {*} teamid 
     * @returns
     */
    saveChkTeam(cate, teamid) {
        return ipcRenderer.sendSync('synchronous-message',
            { type: 'writefile', filetype: 'set', json: { cate: cate, teamid: teamid } });
    },

    delTeam(teamid){
        let teams = this.getProjects()
        
        for(let i=0;i< teams.persions.length;++i){
            if(teams.persions[i]._id==teamid){
                teams.persions.splice(i, 1)
                break
            }
        }
        for(let i=0;i< teams.teams.length;++i){
            if(teams.teams[i]._id==teamid){
                teams.teams.splice(i, 1)
                break
            }
        }
        console.info('delTeam',teams)
        this.saveProject(teams)
    },

    getChkTeam() {
        let set = ipcRenderer.sendSync('synchronous-message',
            { type: 'readfile', filetype: 'set' });
        console.info(set)
        if (set === false) {
            return false;
        }

        set = JSON.parse(set)
        if (!set.hasOwnProperty('cate') || !set.hasOwnProperty('teamid')) {
            return false
        }

        let ts = this.getSpecProjects(set.cate)
        for (let tmp of ts) {
            if (tmp._id == set.teamid) {
                set.team = tmp
                return set
            }
        }
        return false;
    }

}
module.exports = teamProject