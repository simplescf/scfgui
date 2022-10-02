/*
 * @Author: your name
 * @Date: 2020-12-10 23:05:55
 * @LastEditTime: 2021-01-30 21:14:43
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: /scfgui-client/html/js/login.js
 */
const { ipcRenderer } = require('electron')
const model = require('./js/model')

let app = new Vue({
    el: '#main',
    data: {
        state: {
            isreging: false,
            islogin: false,
            isjump: false
        },

        account: {
            accountmail: "",
            accountname: "",
            accountpw: "",
            repw: ""
        },

        id: '',
        key: '',
        name: "",
        appid: "",
        region: "ap-guangzhou",
        left: 0,
        regleft: 0,
        showlogin: true,
        showreg: false
    },
    created: function () {
        this.left = ($(window).width() - 485) / 2
        this.regleft = ($(window).width() - 780) / 2
        this.showlogin = true

        // this.sls()

    },
    mounted: function () {
        $("#main").on("click", ".dlginfobtn", this.dynamicfun);
    },

    methods: {

        sls() {
            process.argv = ['', '', 'deploy', '--debug']
            let sls = require("../serverless/bin/serverless.js")
            sls.deploy()
        },

        uiReg() {
            if (this.account.accountmail == "") {
                model.showModel('注册账号', '邮箱不能为空', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }

            if (this.account.accountname == "") {
                model.showModel('注册账号', '昵称不能为空', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }

            if (this.account.accountpw == "") {
                model.showModel('注册账号', '密码不能为空', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }
            if (this.account.accountpw != this.account.repw) {
                model.showModel('注册账号', '两次密码不相同', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }

            this.state.isreging = true
            let that = this

            ipcRenderer.on('regaccountend', (event, arg) => {
                that.state.isreging = false
                let res = JSON.parse(arg)
                if (res.errorCode == 0) {

                    model.showModel('注册完成', res.data, {
                        confirm: { text: '确定', funname: 'regToLogin' }
                    })
                } else {
                    model.showModel('注册失败', res.errorMessage, {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                }
            })
            ipcRenderer.send('asynchronous-message',
                { post: this.account, type: 'net', cate: "regaccount" })
        },

        /**
         * 注册成功后转入登陆页面
         */
        regToLogin() {
            this.hidDlg()
            this.uiSwitchShow('login')
        },

        uiLogin() {
            if (this.account.accountmail == "") {
                model.showModel('登陆', '邮箱不能为空', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }

            if (this.account.accountpw == "") {
                model.showModel('登陆', '密码不能为空', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }
            this.state.islogin = true
            let that = this

            ipcRenderer.on('loginend', (event, arg) => {
                let res = JSON.parse(arg)
                if (res.errorCode == 0) {
                    that.state.isjump = true
                    sessionStorage.setItem('user', JSON.stringify(res.data));
                    setTimeout(() => {
                        window.location.href = './set.html'
                    }, 500);


                    // model.showModel('登陆', res.data, {
                    //     confirm: { text: '确定', funname: 'regToLogin' }
                    // })
                } else {
                    that.state.islogin = false
                    that.state.isreging = false
                    model.showModel('登陆', res.errorMessage, {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                }
            })
            ipcRenderer.send('asynchronous-message',
                {
                    post: {
                        accountmail: this.account.accountmail,
                        accountpw: this.account.accountpw
                    },
                    type: 'net', cate: "login"
                })
        },


        uiSwitchShow(cate) {
            console.info('uisss')
            if (cate == 'reg') {
                this.showlogin = false
                this.showreg = true
            } else {
                this.showlogin = true
                this.showreg = false
            }
        },

        save: function () {

            if (this.appid == "") {
                dialog.showErrorBox("提示", "请输入APPID")
                return
            }

            if (this.id == "") {
                dialog.showErrorBox("提示", "请输入SecretId")
                return
            }
            if (this.key == "") {
                dialog.showErrorBox("提示", "请输入SecretKey")
                return
            }
            if (this.name == "") {
                dialog.showErrorBox("提示", "请输入项目名称")
                return
            }
            config.addProject(this.appid, this.id, this.key, this.name)
            window.location.href = "./set.html"
            //let sr = config.addProject(this.appid, this.id, this.key, this.name)
        },

        dynamicfun(e) {
            eval('this.' + e.currentTarget.dataset.click + '()')
        },
        hidDlg() {
            model.hiddenModel()
        },
    }
})