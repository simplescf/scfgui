// const { dialog, shell } = require('electron').remote
var qcloudVpc = null
var qcloudCam = null
var apiGateway = null
var scfnet = null
var model = require("./js/model");
var rsa = null
var teamProject = require("./js/teamProject");
const { ipcRenderer } = require('electron')



let app = new Vue({
    el: '#main',
    data: {
        guid: 10,
        addproject: {
            projectname: "",
            projectdesc: "",
            memberemail: "",
            projectcate: 'team',
            members: [],
            allowrsa: false,
            confirmrsa: false,
            randrsaing: false,
            publickey: '',
            privatekey: ''
        },

        state: {
            isaddteaming: false,
            navCate: 'desc',
            waitNavCate: '',
            loadTeam: false,
            loadPersion: false,

            showApiHelp: false,
            showVpcHelp: false,
            showKeyHelp: true,

            loadApiGateWay: false,
            loadVpc: false,
            loadSubnet: false,

            //密钥验证
            loadVal: false,
            //密钥验证错误信息
            ValInfo: '',
            //查询子用户列表状态
            loadUser: false,
            //添加用户状态
            addUser: false,
            setStep: 0,
            //查询用户密钥
            loadKey: false,
            //vpc查询错误消息
            vpcErrInfo: '',
            //api gateway 查询错误信息
            apiWarnInfo: '',

            //显示密钥内容
            showPublic: false,
            showPrivate: false,
            //保存配置提交状态
            submitadd: false,
            loadpem: false,

            //是否可以添加邮箱成员
            canMail: false,
            addMail: '',

            //密钥对是否可以解密
            candec: false,
            //同意加入团队
            loadAcc: false,
            //退出团队
            loadDel: false,
            //加载项目详情
            loadProject: false,
            //提交新命名空间名称
            submitns: false,
            //显示新增命名空间ui
            showns: false,
            //模块帮助
            showModelHelp: false,
        },
        //符合本软件条件的用户
        accounts: [],

        appid: "",
        id: "",
        key: "",
        name: "",
        chkvpc: "",
        chksubnet: "",


        vpcinfo: "",

        isloadvpc: true,

        showaddproject: true,
        shownetinfo: false,
        scf: {},

        isload: true,
        isloadapi: false,


        //选择的api网关服务id
        apigatewayid: "nosetapigateway",
        //当前账户下配置的api网关服务数量
        apigateways: [],
        //选择的api网关服务id
        chkapigateways: [],
        //api网关查询状态
        loadapigateway: false,
        //查询api网关失败后的错误信息

        //项目配置详情
        //pbVE0bTfi25sRkru2xDF6k7wN5fGclhG
        project: {
            teamId: '', isNew: true, runtime: [], exclude: [], name: "",
            codeUri: '', canInternet: false, canVpc: false, vpcs: [], secretId: '',
            secretKey: '', region: '', apiGateways: [], pem: { public: [], private: [] },
            joins: [], namespaces: ["default"], tags: []
        },
        //新项目的导航配置页面信息
        adminSet: {
            //从腾讯云查询出的VPC信息
            vpcs: [],
            //对应的从腾讯云查询出的子网信息
            subnets: [],
            //UI选中的vpc id
            chkvpc: '',
            //UI选中的子网id
            chksubnet: '',
            //页面表格显示VPC的格式
            showVpcs: [],
            agree: false, id: '',
            key: '', chkuin: '', subKeys: [], chkAccount: {},
            apiGateways: [],
            namespaces: [],
            //新增命名空间
            addns: '',
            //业务功能模块 
            tag: {
                name: '',
                code: ''
            }
        },

        // 团队项目列表
        teams: [],
        // 个人项目列表
        persions: [],

        loginUser: {}
    },
    mounted: function () {
        this.isload = false
        $("#main").on("click", ".dlginfobtn", this.dynamicfun);
        model.initNav('set')
        // $.HSCore.components.HSHeaderSide.init($('#js-header'));
        // process.argv = ['/usr/local/bin/node', '/Users/zhangtao/Documents/project/scfgui/scfgui-client/serverless/bin/sls', 'deploy', '--debug']
        // let sls = require("../serverless/bin/serverless.js")
        // sls.deploy()
    },
    created: function () {
        this.initLogin()
        // let scfs = config.getConfig()
        // for (let i = 0; i < scfs.length; ++i) {
        //     delete scfs[i].showactive
        // }
        // this.scfs = scfs
    },

    methods: {
        uiNextGuid() {
            if (this.guid == 7) {
                this.guid = 10
            } else {
                this.guid++
            }
        },


        getRsa() {
            if (this.rsa == null) {
                this.rsa = require("./js/rsa");
            }
            return this.rsa
        },

        getScfnet() {
            if (this.scfnet == null) {
                this.scfnet = require("../scfnet.js");
            }
            return this.scfnet
        },

        getApiGateway() {
            if (this.apiGateway == null) {
                this.apiGateway = require("../qcloud/apigateway");
            }
            return this.apiGateway
        },

        getCam() {
            if (this.qcloudCam == null) {
                this.qcloudCam = require("../qcloud/cam.js");
            }
            return this.qcloudCam
        },

        getVpc() {
            if (this.qcloudVpc == null) {
                this.qcloudVpc = require("../qcloud/vpc.js");
            }
            return this.qcloudVpc;
        },

        changeRegion(e) {
            console.info(e, this.project.region)
            this.flushProjectUI()
        },
        /**
         * 获取初始状态的项目配置信息
         */
        getInitProject() {
            return {
                teamId: this.getChkTeam()._id, isNew: true,
                runtime: [], exclude: [],
                name: this.getChkTeam().teamname,
                codeUri: '', canInternet: false, canVpc: false,
                vpcs: [],
                secretId: '', secretKey: '', region: '',
                apiGateways: [], joins: [],
                pem: { public: [], private: [] },
                namespaces: ["default"],
                tags: []
            }
        },

        initLogin() {
            this.loginUser = teamProject.getLogin()
            this.loadGuid()
            // teamProject.flushAllProject()
        },

        /**
         * 是否显示引导页
         * @returns 
         */
        loadGuid() {
            let tmp = teamProject.getProjects()
            if (tmp.persions.length == 0 && tmp.teams.length == 0) {
                this.guid = 0
                return
            }

            let set = ipcRenderer.sendSync('synchronous-message', { type: 'readfile', filetype: 'set' })
            let setjson = { guid: false }
            if (set == false) {
                this.guid = 0
            } else {
                set = JSON.parse(set)
                if (!set.hasOwnProperty('guid')) {
                    this.guid = 0
                }
                setjson = set
                setjson.guid = false
               
            }
            ipcRenderer.sendSync('synchronous-message', { type: 'writefile', filetype: 'set', json: setjson })

        },

        uiDelNameSpace(inx){
            this.project.namespaces.splice(inx, 1)
        },

        /**
         * 删除项目
         */
        uiDelTeam(team) {
            console.info(team)
            let info = '您要删除该项目吗'
            //非团队项目直接删除,团队项目根据权限,仅超级权限可删除,其他人为退出
            if (team.isteam && !team.own) {
                info = '您要退出该项目吗?'
            }
            let teamid = team._id
            let cate = 'persion'
            if (team.isteam) {
                cate = 'team'
            }
            model.showModel(team.teamname, info, {
                confirm: { text: '不删除', funname: 'hidDlg' },
                cancel: { text: '删除项目', funname: 'delTeam("' + teamid + '","' + cate + '")' }
            })
        },

        delTeam(teamid, cate) {
            this.hidDlg()
            console.info(teamid, cate)
            let that = this
            let tmps = this.teams
            if(cate=='persion'){
                tmps = this.persions
            }

            for (let i = 0; i < tmps.length; ++i) {
                console.info('del',tmps[i]._id, teamid)
                if (tmps[i]._id == teamid) {
                    tmps[i].loadDel = true
                    ipcRenderer.once('delteamend', (event, arg) => {
                        console.info(arg)
                        let res = JSON.parse(arg)
                       
                        if (res.errorCode == 0) {
                            if(cate=='persion'){
                                that.persions.splice(i, 1)
                            }else{
                                that.teams.splice(i, 1)
                            }
                            teamProject.delTeam(teamid)
                        } else {
                            model.showModel('删除失败', res.errorMessage, {
                                confirm: { text: '确定', funname: 'hidDlg' }
                            })
                        }
                    })
                    let post = { code: this.loginUser.code, account: this.loginUser.accountmail, teamId:teamid}
                    ipcRenderer.send('asynchronous-message',
                        {
                            post: post,
                            type: 'net', cate: 'delteam'
                        })
                    return
                }
            }
        },

        uiAddTag() {
            for (let mo of this.project.tags) {
                if (mo.name == this.adminSet.tag.name ||
                    mo.code == this.adminSet.tag.code) {
                    model.showModel('模块名称或代码不能重复', '', {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                    return
                }
            }
            this.project.tags.push({ name: this.adminSet.tag.name, code: this.adminSet.tag.code })
            this.adminSet.tag.name = ''
            this.adminSet.tag.code = ''
        },

        uiDelTag(inx) {
            this.project.tags.splice(inx, 1)
        },

        uiAddNamespace() {
            if (this.project.namespaces.length == 5) {
                model.showModel('命名空间新增失败', '最多只能5个命名空间', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }
            if (this.project.namespaces[this.project.namespaces.length - 1].trim() == '') {
                model.showModel('命名空间新增失败', '新增空间名称不能为空', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }
            this.project.namespaces.push("")
        },

        /**
         * 点击 网络管理->内网
         */
        uiClickVpc() {
            this.adminSet.vpcs = []
            this.adminSet.subnets = []
            this.adminSet.chkvpc = ''
            this.adminSet.chksubnet = ''
            this.state.vpcErrInfo = ''

            if (this.project.canVpc) {
                console.info("canvpc")
                if (this.project.region == '') {
                    model.showModel('请先选择区域', 'VPC需要依据区域查询', {
                        confirm: { text: '确定', funname: 'hidVpc' }
                    })
                    return
                }
                let that = this
                this.state.loadVpc = true
                this.getVpc().listvpc(this.project.secretId, this.project.secretKey,
                    this.project.region,
                    (res) => {
                        that.state.loadVpc = false
                        if (typeof (res) == 'string') {
                            that.state.vpcErrInfo = '查询VPC失败:' + res
                        } else {
                            that.adminSet.vpcs = res
                        }

                    })
            }

            this.$forceUpdate();
        },
        hidVpc() {
            this.hidDlg()
            this.project.canVpc = false
        },

        /**
         * 添加vpc配置到项目
         */
        uiAddVpc() {
            if (this.adminSet.chksubnet == '') {
                return
            }
            let vpcinx = -1
            //判断是否重复添加
            for (let i = 0; i < this.project.vpcs.length; ++i) {
                if (this.project.vpcs[i].VpcId == this.adminSet.chkvpc) {
                    vpcinx = i
                    for (let sn of this.project.vpcs[i].subnets) {
                        if (sn.SubnetId == this.adminSet.chksubnet) {
                            return
                        }
                    }
                }
            }

            //添加到project和页面展示中, 页面展示需要额外处理
            for (let vpc of this.adminSet.vpcs) {
                if (vpc.VpcId == this.adminSet.chkvpc) {
                    let tmpsubname = ''
                    let tmpsubid = ''
                    if (vpcinx == -1) {
                        //新增vpc
                        let tmp = {
                            VpcId: this.adminSet.chkvpc,
                            VpcName: vpc.VpcName,
                            subnets: []
                        }
                        for (let sub of this.adminSet.subnets) {
                            if (sub.SubnetId == this.adminSet.chksubnet) {
                                tmpsubname = sub.SubnetName
                                tmpsubid = sub.SubnetId
                                tmp.subnets.push({ SubnetId: sub.SubnetId, SubnetName: sub.SubnetName })
                            }
                        }
                        this.project.vpcs.push(tmp)
                    } else {
                        //已存在vpc添加子网
                        for (let sub of this.adminSet.subnets) {
                            if (sub.SubnetId == this.adminSet.chksubnet) {
                                tmpsubname = sub.SubnetName
                                tmpsubid = sub.SubnetId
                                this.project.vpcs[vpcinx].subnets.push({
                                    SubnetId: sub.SubnetId,
                                    SubnetName: sub.SubnetName
                                })
                            }
                        }
                    }
                    //UI表格展示
                    this.adminSet.showVpcs.push({
                        VpcName: vpc.VpcName, VpcId: this.adminSet.chkvpc,
                        SubnetId: tmpsubid, SubnetName: tmpsubname
                    })
                }
            }
        },

        /**
         * 删除选择的一个vpc
         * @param {*} subnetid 
         */
        uiDelVpc(subnetid) {
            //删除表格展示
            for (let i = 0; i < this.adminSet.showVpcs.length; ++i) {
                if (this.adminSet.showVpcs[i].SubnetId == subnetid) {
                    this.adminSet.showVpcs.splice(i, 1)
                    break
                }
            }
            //删除提交表单数据
            for (let i = 0; i < this.project.vpcs.length; ++i) {
                for (let k = 0; k < this.project.vpcs[i].subnets.length; ++k) {
                    if (this.project.vpcs[i].subnets[k].SubnetId == subnetid) {
                        //子网全删后删除对应的vpc
                        if (this.project.vpcs[i].subnets.length == 1) {
                            this.project.vpcs.splice(i, 1)
                        } else {
                            this.project.vpcs[i].subnets.splice(k, 1)
                        }
                        break
                    }
                }
            }
        },

        /**
         * 网络管理->选择不同的vpc网络
         * @param {*} id 
         */
        changeVpc(vpcid) {
            let that = this
            this.state.loadSubnet = true
            this.adminSet.chksubnet = ''

            this.getVpc().listVpcSubnet(this.project.secretId, this.project.secretKey,
                this.project.region, vpcid,
                (res) => {
                    that.state.loadSubnet = false
                    that.adminSet.subnets = res
                })
        },


        //团队项目信息
        listTeams() {
            let that = this
            this.state.loadTeam = true
            ipcRenderer.once('listteamsend', (event, arg) => {

                that.state.loadTeam = false
                let res = JSON.parse(arg)
                if (res.errorCode == 0) {
                    let tmps = res.data
                    for (let i = 0; i < tmps.length; ++i) {
                        tmps[i].chk = false
                        tmps[i].load = false
                        tmps[i].loadDel = false
                    }
                    that.teams = tmps
                } else {
                    model.showModel('项目展示', res.errorMessage, {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                }
            })
            let post = { code: this.loginUser.code, account: this.loginUser.accountmail }
            ipcRenderer.send('asynchronous-message',
                {
                    post: post,
                    type: 'net', cate: 'listteams'
                })
        },

        //个人项目信息
        listPersions() {
            let that = this
            this.state.loadPersion = true
            ipcRenderer.once('listpersionsend', (event, arg) => {
                that.state.loadPersion = false
                let res = JSON.parse(arg)
                if (res.errorCode == 0) {
                    let tmps = res.data
                    for (let i = 0; i < tmps.length; ++i) {
                        tmps[i].chk = false
                        tmps[i].load = false
                        tmps[i].loadDel = false
                    }
                    that.persions = tmps
                } else {
                    model.showModel('项目展示', res.errorMessage, {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                }

            })
            let post = { code: this.loginUser.code, account: this.loginUser.accountmail }
            ipcRenderer.send('asynchronous-message',
                { post: post, type: 'net', cate: 'listpersions' })
        },


        uiSaveTeam() {
            let info = []
            if (this.addproject.projectname.trim() == '') {
                info.push("项目名称必填")
            }
            if (this.addproject.projectdesc.trim() == '') {
                info.push("项目描述必填")
            }
            if (!this.addproject.confirmrsa) {
                info.push("密钥对不能为空,请生成密钥")
            }
            if (info.length > 0) {
                model.showModel('创建项目错误提示', info.join("<br>"), {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }

            let user = sessionStorage.getItem('user')
            if (user == null) {
                model.showModel('登陆信息异常', '请重新登陆', {
                    confirm: { text: '重新登陆', funname: 'toLogin' }
                })
                return
            }

            user = JSON.parse(user)

            let that = this
            this.state.isaddteaming = true

            let post = {
                projectname: this.addproject.projectname.trim(),
                projectdesc: this.addproject.projectdesc.trim(),
                projectcate: this.addproject.projectcate,
                account: user.accountmail,
                code: user.code,
                members: this.addproject.members
            }
            this.submitTeam(post)
        },



        submitTeam(post) {
            let that = this
            ipcRenderer.once('addteamend', (event, arg) => {
                that.state.isaddteaming = false
                var res = JSON.parse(arg)
                if (res.errorCode == 0) {
                    ipcRenderer.once('savepemend', (event, arg) => {
                        that.state.waitNavCate = that.addproject.projectcate
                        model.showModel('发布成功', res.data, {
                            confirm: { text: '确定', funname: 'switchTab' }
                        })
                    })
                    ipcRenderer.send('asynchronous-message',
                        {
                            pub: this.addproject.publickey,
                            pri: this.addproject.privatekey,
                            name: this.addproject.projectname,
                            type: 'savepem'
                        })

                } else {
                    title = '操作失败'
                    model.showModel('发布失败', res.errorMessage, {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                }
            })

            ipcRenderer.send('asynchronous-message',
                { post: post, type: 'net', cate: 'addteam' })
        },

        savePub() {
            if (!this.project.isAdmin) {
                model.showModel('无权配置公钥', '仅管理员有权限配置', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }

            let public = this.$refs.public.value
            let arr = public.split('\n')
            let keys = []
            for (let i = 0; i < arr.length; ++i) {
                let tmp = arr[i].trim()
                if (tmp != '') {
                    keys.push(tmp)
                }
            }

            let that = this
            this.project.pem.public = keys

            ipcRenderer.once('savepemend', (event, arg) => {
                // that.getLocalPem()
                that.state.showPublic = false
                if (that.valRsa()) {
                    model.showModel('保存完毕', '', {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                }
            })

            ipcRenderer.send('asynchronous-message',
                {
                    pub: keys.join('\n'),
                    name: this.getChkTeam().teamname,
                    type: 'savepem'
                })
        },

        savePri() {
            let keys = []
            let arr = this.$refs.private.value.split('\n')
            for (let i = 0; i < arr.length; ++i) {
                let tmp = arr[i].trim()
                if (tmp != '') {
                    keys.push(tmp)
                }
            }
            let that = this
            this.project.pem.private = keys

            ipcRenderer.once('savepemend', (event, arg) => {
                // that.getLocalPem()
                that.state.showPrivate = false
                if (that.valRsa()) {
                    //重新查询项目信息进行解密操作
                    that.loadProject(that.getChkTeam()._id)
                    model.showModel('保存完毕', '', {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                }
            })

            ipcRenderer.send('asynchronous-message',
                {
                    pri: keys.join('\n'),
                    name: this.getChkTeam().teamname,
                    type: 'savepem'
                })
        },

        /**
         * 创建项目成功提示框的回调函数
         */
        switchTab() {
            this.initAddProject()
            this.hidDlg()
            console.info(this.state.waitNavCate)
            if (this.state.waitNavCate != '') {
                this.uiSwitchNav(this.state.waitNavCate)
            } else {
                this.uiSwitchNav(this.state.navCate)
            }

        },
        /**
         * 初始化创建项目信息
         */
        initAddProject() {
            this.addproject = {
                projectname: "",
                projectdesc: "",
                memberemail: "",
                projectcate: 'team',
                members: [],
                allowrsa: false,
                confirmrsa: false,
                randrsaing: false,
                publickey: '',
                privatekey: ''
            }
        },

        uiDelJoin(inx) {
            console.info(inx)
            this.addproject.members.splice(inx, 1)
        },

        uiJoinTeam() {
            let mail = this.addproject.memberemail.trim()
            let ex = false
            if (mail == '') {
                return
            }
            for (let mem of this.addproject.members) {
                if (mem.mail == mail) {
                    ex = true
                    break
                }
            }
            if (!ex) {
                this.addproject.members.unshift({ mail: mail, cate: 'admin' })
                this.addproject.memberemail = ''
            } else {
                model.showModel('重复添加用户', '一个用户只能添加一次', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
            }
        },

        uiChangeMail(e) {
            this.state.canMail = RegExp('.+@.+').test(this.state.addMail)
        },

        uiAddTeam() {
            if (!this.state.canMail) {
                model.showModel('请输入邮箱', '对方账户邮箱地址', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }
            for (let join of this.project.joins) {
                if (join.amail == this.state.addMail) {
                    model.showModel('该邮箱已添加', '', {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                    return
                }
            }
            this.project.joins.push({ amail: this.state.addMail, isadmin: false, isjoin: false, right: 2 })
            this.state.addMail = ''
            console.info(this.project.joins)
        },

        toLogin() {
            window.location.href = "login.html"
        },

        uiRandRsa() {
            this.addproject.randrsaing = true
            let that = this
            setTimeout(() => {
                let keys = that.getRsa().randKey()
                that.addproject.publickey = keys.pub
                that.addproject.privatekey = keys.pri
                that.addproject.confirmrsa = true
            }, 500);

        },



        uiSwitchNav(cate) {
            this.state.navCate = cate
            if (cate == 'persion') {
                this.listPersions()
            } else if (cate == 'team') {
                this.listTeams()
            } else if (cate == 'add') {
                setTimeout(() => {
                    $.HSCore.components.HSSelect.init('.js-custom-select');
                }, 1000);
            }

            $('html,body').animate({ scrollTop: 0 }, 200);
        },

        //切换api网关配置信息
        changeapigateway() {
            console.info("changeapigateway", this.apigatewayid)
            //选择"不设置api网关"
            if (this.apigatewayid == "nosetapigateway") {
                this.scf.project.apigw.isapi = "false"
                return
            }

            for (let i = 0; i < this.apigateways.length; ++i) {
                console.info(this.apigateways[i], this.apigateways[i].ServiceId)
                if (this.apigateways[i].ServiceId == this.apigatewayid) {
                    console.info(this.apigateways[i])
                    this.scf.project.apigw.serviceName = this.apigateways[i].ServiceName
                    this.scf.project.apigw.serviceId = this.apigateways[i].ServiceId
                    this.scf.project.apigw.isapi = "true"
                }
            }

        },


        //1. 并发开始要考虑 2. 新开发/修改 3. 统一服务器 4.新旧服务器

        hidvpc() {
            this.vpcinfo = ""
        },


        /**
         * 通过查询vpc确认id/key的正确性
         */
        uiValKey() {
            if (!this.adminSet.agree) {
                return
            }
            this.vpcs = []
            this.subnets = []
            this.state.loadVal = true
            this.listUsers()
        },

        /**
         * 查询子账户
         */
        listUsers() {
            let that = this
            //查询子用户信息状态
            this.state.loadUser = true
            this.state.addUser = false
            let id = this.adminSet.id
            let key = this.adminSet.key

            this.getCam().listUsers(id, key, (data) => {

                if (typeof (data) == 'string') {
                    that.state.loadVal = false
                    that.state.ValInfo = '请检查密钥,' + data
                    return
                }
                that.state.ValInfo = ''
                that.tmpaccounts = data
                this.navdetail('user')
                //查询授权信息
                for (let i = 0; i < that.tmpaccounts.length; ++i) {
                    that.tmpaccounts[i].isload = true
                    that.tmpaccounts[i].tcb = false
                    that.tmpaccounts[i].vpc = false
                    that.tmpaccounts[i].scf = false
                    this.getCam().listUserPolicies(id, key, that.tmpaccounts[i].Uin, that.flushPolicy)
                }
            })
        },

        flushPolicy(pos) {
            this.state.loadVal = false
            this.state.loadUser = false

            for (let i = 0; i < this.tmpaccounts.length; ++i) {
                let tmp = this.tmpaccounts[i]
                for (let po of pos) {
                    if (po.Uin == tmp.Uin) {
                        switch (po.PolicyName) {
                            case 'QcloudTCBFullAccess':
                                tmp.tcb = true
                                break
                            case 'QcloudVPCFullAccess':
                                tmp.vpc = true
                                break
                            case 'QcloudSCFFullAccess':
                                tmp.scf = true
                                break
                            case 'QcloudSLSFullAccess':
                                tmp.sls = true
                                break
                            case 'QcloudAccessForSLSRole':
                                tmp.slsrole = true
                                break
                            case 'QcloudCOSFullAccess':
                                tmp.cos = true
                                break
                        }
                    }
                }
                this.tmpaccounts[i] = tmp
            }
            this.accounts = this.tmpaccounts
        },

        /**
         * 选择腾讯云子账户
         */
        uiChkUser() {
            if (this.adminSet.chkuin == '') {
                model.showModel('您未选择子账户', '请选择一个子账户', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }
            for (let acc of this.accounts) {
                if (acc.Uin == this.adminSet.chkuin) {
                    if (!acc.tcb || !acc.vpc || !acc.scf || !acc.sls || !acc.slsrole || !acc.cos) {
                        model.showModel('子账户权限不符合', '需要权限均授权的子账户', {
                            confirm: { text: '确定', funname: 'hidDlg' }
                        })
                        return
                    }
                    this.adminSet.chkAccount = acc
                    break
                }
            }
            this.listUserKeys(this.adminSet.id, this.adminSet.key)
        },

        /**
         * 查询子用户全部key
         */
        listUserKeys(id, key) {
            let that = this
            this.adminSet.subKeys = []
            this.state.loadKey = true
            //查看子账户下的密钥状态
            this.getCam().listAccessKeys(id, key, this.adminSet.chkAccount.Uin, (keys) => {
                console.info('listAccessKeys', keys)
                that.state.loadKey = false
                if (typeof (keys) == 'string') {
                    model.showModel('子账户密钥异常', keys, {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                    return
                }
                for (let key of keys) {
                    if (key.Status == 'Active') {
                        that.adminSet.subKeys.push(key.AccessKeyId)
                    }
                }
                // subKeys:[], chkSubKey:''
                if (that.adminSet.subKeys.length == 0) {
                    model.showModel('该子用户无激活的密钥', '作为开发使用,必须拥有激活密钥', {
                        confirm: { text: '重新选择子用户', funname: 'hidDlg' },
                        cancel: { text: '去腾讯云激活密钥', funname: 'openUser' }
                    })
                    return
                }
                that.project.secretId = that.adminSet.subKeys[0]

                //检测rsa配置
                that.valRsa()
                this.navdetail('detail')
            })
        },

        navdetail(cate) {
            if (cate == 'desc') {
                this.state.setStep = 0
            } else if (cate == 'adminid') {
                this.state.setStep = 1
            } else if (cate == 'user') {
                this.state.setStep = 2
            } else if (cate == 'detail') {
                this.state.setStep = 3
                $('html,body').animate({ scrollTop: 0 }, 200);
                // this.valRsa()
                setTimeout(() => {
                    $.HSCore.helpers.HSFocusState.init();
                }, 1000);
            }
        },

        openUser() {
            this.hidDlg()
            shell.openExternal('https://console.cloud.tencent.com/cam/user/' + this.adminSet.chkAccount.Uid);
        },

        /**
         * 添加SCF权限所需要的用户
         */
        addScfUser() {
            let that = this
            this.state.addUser = true
            this.state.addUserInfo = ''
            this.getCam().addScfUser(this.adminSet.id, this.adminSet.key, this.listUsers, (res) => {
                that.state.addUser = false
                that.state.addUserInfo = res
            })
        },

        /**
         * 加载vpc配置信息
         */
        showvpcinfo: function () {
            this.shownetinfo = true
        },
        delexclude: function (inx) {
            this.project.exclude.splice(inx, 1)
            this.$forceUpdate()
        },

        delinclude: function (inx) {
            this.project.include.splice(inx, 1)
            this.$forceUpdate()
        },



        /**
         * 排除目录
         */
        uiAddexclude: function () {
            if (!this.project.isOwn) {
                return
            }
            if (this.project.codeUri == '') {
                model.showModel('请先选择代码目录', "排除目录只能是代码目录的一级子目录", {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }

            let that = this
            ipcRenderer.once('endopendir', (event, arg) => {
                if (arg) {
                    if (arg == undefined) {
                        return
                    }
                    if (arg[0].indexOf(that.project.codeUri) == -1) {
                        model.showModel('非法排除目录', "排除目录只能是代码目录的一级子目录", {
                            confirm: { text: '确定', funname: 'hidDlg' }
                        })
                        return
                    }

                    let path = arg[0].replace(that.project.codeUri + '/', '')
                    //排除重复选择
                    for (let i = 0; i < that.project.exclude.length; ++i) {

                        if (that.project.exclude[i] == path) {
                            return
                        }
                    }
                    that.project.exclude.push(path)
                    that.$forceUpdate()
                }
            })
            ipcRenderer.send('asynchronous-message', { type: 'opendir' })
        },

        /**
         * 提交或修改项目配置
         */
        uiSubmitProject() {
            let infos = []
            if (this.project.codeUri == '') {
                infos.push('请选择代码目录')
            }
            if (this.project.region == '') {
                infos.push('请选择区域')
            }
            if (this.project.runtime.length == 0) {
                infos.push('请选择编程语言')
            }
            if (infos.length > 0) {
                model.showModel('请处理以下错误', infos.join('<br>'), {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }

            if (!this.project.canInternet && !this.project.canVpc) {
                model.showModel('网络管理', '未开启任何网络,函数将无法访问外网和通过内网访问其他资源', {
                    cancel: { text: '确定提交', funname: 'submitProject' },
                    confirm: { text: '返回修改', funname: 'hidDlg' }
                })
                return
            }
            if (this.project.canVpc && this.project.vpcs.length == 0) {
                model.showModel('网络管理', '开启内网后未添加任何VPC配置,会导致内网无法使用', {
                    cancel: { text: '确定提交', funname: 'submitProject' },
                    confirm: { text: '返回修改', funname: 'hidDlg' }
                })
                return
            }
            if (this.project.apiGateways.length == 0) {
                model.showModel('API网关', '您未开启任何API网关,将无法通过URL调用函数', {
                    cancel: { text: '确定提交', funname: 'submitProject' },
                    confirm: { text: '返回修改', funname: 'hidDlg' }
                })
                return
            }
            if (this.project.tags.length == 0) {
                model.showModel('业务功能模块', '配置功能模块后,即支持模块为单位管理函数', {
                    cancel: { text: '继续提交', funname: 'submitProject' },
                    confirm: { text: '配置模块', funname: 'hidDlg' }
                })
                return
            }

            if (!this.valRsa()) {
                return
            }

            this.submitProject()
        },

        flushJoinRight() {
            for (let i = 0; i < this.project.joins.length; ++i) {
                if (this.project.joins[i].right == 1) {
                    this.project.joins[i].isadmin
                } else if (this.project.joins[i].right == 1) {

                }
            }
        },

        /**
         * 提交配置
         */
        submitProject() {
            //关闭可能弹出的非强制修改提示对话框
            this.hidDlg()
            this.state.submitadd = true
            this.formToSubmit()
        },

        /**
         * 校验RSA
         */
        valRsa() {
            console.info('valrsa', this.project)
            //1. 老项目:解密项目名,加密,解密校验,以确保公钥密钥的一致性正确性
            //2. 新项目:提交时将项目名称加密提交给服务器,对项目名加密 解密校验
            let tmpname = ''
            let teamname = this.getChkTeam().teamname
            let pwname = '';
            let valPri = true
            let valPub = true
            if (this.project.pem.private.length == 0) {
                valPri = false
            }
            if (this.project.pem.public.length == 0) {
                valPub = false
            }

            if (!this.project.isNew) {
                if (!valPri) {
                    model.showModel('密钥验证', '未配置私钥,无法解密项目配置', {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                    return false
                }
                //老项目
                tmpname = this.getRsa().decrypt(this.project.pwName, this.project.pem.private)
                if (tmpname != teamname) {
                    model.showModel('密钥验证', '您的私钥不匹配,无法解密验证字符串', {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                    return false
                }
                //兼容:未配置公钥, 不继续验证, 直接返回true
                if (!valPub) {
                    this.state.candec = true
                    return true;
                }
            } else {
                //新项目
                if (!valPub || !valPri) {
                    model.showModel('密钥配置', '首次配置项目信息,密钥对必须完整且有效', {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                    return false
                }
            }

            pwname = this.getRsa().encrypt(teamname, this.project.pem.public)
            if (pwname === false) {
                model.showModel('公钥非法', '公钥无法加密,请确认格式', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return false
            }

            //新项目,未配置公钥, 无法验证私钥
            let dec = this.getRsa().decrypt(pwname, this.project.pem.private)
            console.info(dec)
            if (dec != teamname) {
                model.showModel('密钥验证', '您的公钥和私钥不匹配', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return false
            }
            this.state.candec = true
            return true
        },

        /**
         * 解码失败的处理
         */
        failDec() {
            let tmp = this.getInitProject()
            //不需要清除的信息
            tmp.pem = this.project.pem
            tmp.isAdmin = this.project.isAdmin
            this.project = tmp
            this.state.candec = false
        },

        /**
         * 解码
         */
        projectDecrypt() {
            let privatepem = this.project.pem.private

            if (privatepem.length == 0) {
                model.showModel('密钥验证', '无私钥信息', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                this.failDec()
                return
            }

            if (!this.valRsa()) {
                //私钥不正确
                this.failDec()
                return
            }
            this.state.candec = true

            let tmpproject = this.getRsa().decryptProject(this.project, privatepem)
            let api = []
            for (let i = 0; i < tmpproject.apiGateways.length; ++i) {
                api.push(tmpproject.apiGateways[i].ServiceId)
            }

            tmpproject.apiGateways = api
            this.adminSet.subKeys = [tmpproject.secretId]
            // this.adminSet.apiGateways = tmpproject.apiGateways
            this.project = tmpproject
            this.flushShowVpc()
            this.flushProjectUI()
        },

        flushShowVpc() {
            let tmps = []
            for (let vpc of this.project.vpcs) {
                for (let sub of vpc.subnets) {
                    console.info(sub)
                    tmps.push({ VpcName: vpc.VpcName, SubnetName: sub.SubnetName, SubnetId: sub.SubnetId })
                }
            }
            this.adminSet.showVpcs = tmps
        },

        //提交表单
        formToSubmit() {
            let publicpem = this.project.pem.public
            let form = {
                codeUri: this.project.codeUri,
                secretId: this.project.secretId,
                secretKey: this.project.secretKey,
                region: this.project.region,
                canInternet: this.project.canInternet,
                canVpc: this.project.canVpc,
                vpcs: [],
                apiGateways: [],
                runtime: this.project.runtime,
                exclude: this.project.exclude,
                teamId: this.project.teamId,
                isNew: this.project.isNew,
                namespaces: this.project.namespaces,
                tags: this.project.tags,
                stepCode: this.project.stepCode,
                code: this.loginUser.code,
                account: this.loginUser.accountmail
            }


            if (this.getChkTeam().isteam) {
                form.joins = this.project.joins
            }

            for (let apiid of this.project.apiGateways) {
                for (let tmp of this.adminSet.apiGateways) {
                    if (apiid == tmp.ServiceId) {
                        form.apiGateways.push({
                            ServiceId: tmp.ServiceId,
                            ServiceName: tmp.ServiceName
                        })
                    }
                }
            }

            for (let vpc of this.project.vpcs) {
                let tmp = {
                    VpcId: vpc.VpcId,
                    VpcName: vpc.VpcName,
                    subnets: []
                }
                for (let sub of vpc.subnets) {
                    tmp.subnets.push({
                        SubnetId: sub.SubnetId,
                        SubnetName: sub.SubnetName
                    })
                }
                form.vpcs.push(tmp)
            }
            console.info(form)
            let that = this
            ipcRenderer.once('setprojectend', (event, arg) => {
                arg = JSON.parse(arg)
                that.state.submitadd = false
                let info = ''
                if (arg.errorCode == 0) {
                    $('html,body').animate({ scrollTop: 0 }, 200);
                    info = arg.data
                } else {
                    info = arg.errorMessage
                }
                model.showModel(info, '', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
            })



            ipcRenderer.send('asynchronous-message',
                {
                    post: this.getRsa().encryptProject(form, publicpem, this.getChkTeam().teamname),
                    type: 'net', cate: 'setproject'
                })
        },

        uiProjectDelJoin(inx) {
            this.project.joins.splice(inx, 1)
            this.$forceUpdate();
        },

        uiAccJoin() {
            model.showModel('团队邀请', '您确认接受该团队邀请吗?', {
                confirm: { text: '加入', funname: 'accJoin' },
                cancel: { text: '取消', funname: 'hidDlg' }
            })
        },

        /**
         * 接受团队邀请
         */
        accJoin() {
            this.hidDlg()

            let form = {
                teamId: this.getChkTeam()._id,
                stepCode: this.project.stepCode,
                code: this.loginUser.code,
                account: this.loginUser.accountmail
            }
            let that = this
            this.state.loadAcc = true

            ipcRenderer.once('accjoinend', (event, arg) => {
                that.state.loadAcc = false
                arg = JSON.parse(arg)
                let info = ''
                console.info(arg)
                if (arg.errorCode == 0) {
                    that.project.isJoin = true
                    info = arg.data
                } else {
                    info = arg.errorMessage
                }
                model.showModel('团队邀请', info, {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
            })
            console.info(form)
            ipcRenderer.send('asynchronous-message',
                {
                    post: form,
                    type: 'net', cate: 'accjoin'
                })
        },

        uiDelSelfJoin() {
            model.showModel('团队邀请', '您确认退出该团队吗', {
                confirm: { text: '不退出', funname: 'hidDlg' },
                cancel: { text: '退出', funname: 'delSelfJoin' }
            })
        },

        /**
         * 退出团队
         */
        delSelfJoin() {
            this.hidDlg()

            let form = {
                teamId: this.getChkTeam()._id,
                stepCode: this.project.stepCode,
                code: this.loginUser.code,
                account: this.loginUser.accountmail
            }
            let that = this
            this.state.loadDel = true

            ipcRenderer.once('deljoinend', (event, arg) => {
                that.state.loadDel = false
                arg = JSON.parse(arg)
                console.info(arg)
                if (arg.errorCode == 0) {
                    that.navdetail('desc')
                    that.switchTab()
                } else {
                    model.showModel('退出项目失败', arg.errorMessage, {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                }
            })
            console.info(form)
            ipcRenderer.send('asynchronous-message',
                {
                    post: form,
                    type: 'net', cate: 'deljoin'
                })
        },

        /**
         * 隐藏网络提示说明
         */
        hidvpcinfo: function () {
            this.shownetinfo = false
        },

        openfolder: function (path) {
            shell.showItemInFolder(path)
        },

        openurl: function (url) {
            shell.openExternal(url);
        },

        /**
         * 某项目查询出详细信息后的设置选中标志
         * @param {*} teamid 
         */
        setProjectFlag(teamid, load, check) {
            for (let i = 0; i < this.persions.length; ++i) {
                if (this.persions[i]._id == teamid) {
                    this.persions[i].chk = check
                    this.persions[i].load = load
                } else {
                    this.persions[i].chk = false
                    this.persions[i].load = false
                }

            }
            for (let i = 0; i < this.teams.length; ++i) {
                if (this.teams[i]._id == teamid) {
                    this.teams[i].load = load
                    this.teams[i].chk = check
                } else {
                    this.teams[i].chk = false
                    this.teams[i].load = false
                }
            }
        },

        /**
         * 切换项目页面
         * @param {*} id 
         */
        uiChangeTeam: function (teamid, cate) {
            let teams = []
            if (cate == 'persion') {
                teams = this.persions
            } else if (cate == 'team') {
                teams = this.teams
            }
            //项目详情里面无项目名称
            for (var team of teams) {
                if (team._id == teamid) {
                    this.project.name = team.teamname
                }
            }

            this.flushUI()
            this.loadProject(teamid)
        },

        flushUI() {
            this.navdetail('desc')
            this.state.candec = false///////////////////////////
            this.adminSet.subKeys = []
            this.adminSet.showVpcs = []
            this.$forceUpdate()
        },

        /**
         * 从服务器查询项目配置信息
         * @param {*} teamid 
         */
        loadProject(teamid) {

            let that = this
            this.setProjectFlag(teamid, true, true)
            this.state.loadProject = true

            ipcRenderer.once('getprojectend', (event, arg) => {
                that.state.loadProject = false
                that.state.loadTeam = false
                let res = JSON.parse(arg)
                if (res.errorCode == 0) {
                    that.setProjectFlag(teamid, false, true)
                    that.setProjectDetail(res.data)
                } else {
                    model.showModel('查询项目配置信息', res.errorMessage, {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                }
            })
            let post = {
                code: this.loginUser.code,
                account: this.loginUser.accountmail,
                teamid: teamid
            }
            ipcRenderer.send('asynchronous-message',
                { post: post, type: 'net', cate: 'getproject' })
        },

        /**
         * 根据云上项目数据初始化项目配置页面
         * @param {*} pro 
         * @param {*} teamid  团队id, 新项目不返回任何项目数据,因此额外需要团队id
         */
        setProjectDetail(project) {
            let that = this
            let tmppro = []
            console.info('server project:', project)

            if (project.isNew) {
                //新项目
                tmppro = this.getInitProject()
                tmppro.isAdmin = project.isAdmin
                //保存获取的步骤验证码给下步用
                tmppro.stepCode = project.stepCode
                tmppro.isOwn = project.isOwn
                tmppro.isJoin = project.isJoin
                tmppro.isteam = project.isteam
                if (this.state.navCate == 'team') {
                    tmppro.joins = project.joins
                }
                //兼容新项目"设置RSA密钥且验证"的情况下 不跳转密钥设置页码
                if (this.state.setStep != 3) {
                    this.navdetail('adminid')
                }

            } else {
                //老项目
                this.navdetail('detail')
                tmppro = project
                //客户端的密钥信息
                tmppro.pem = { public: [], private: [] }
            }

            let om = this.getChkTeam().ownmail
            //转换权限展示到UI
            if (tmppro.isteam) {
                for (let i = 0; i < tmppro.joins.length; ++i) {
                    if (tmppro.joins[i].amail == om) {
                        tmppro.joins[i].right = 0
                    } else if (tmppro.joins[i].isadmin) {
                        tmppro.joins[i].right = 1
                    } else {
                        tmppro.joins[i].right = 2
                    }
                }
            }


            this.project = tmppro
            this.getLocalPem()
        },


        /**
         * 查询密钥对配置情况
         */
        getLocalPem() {
            let that = this
            this.state.loadpem = true
            let name = this.getChkTeam().teamname
            ipcRenderer.once('privatepemend', (event, arg) => {
                that.state.loadpem = false
                that.project.pem.private = arg
                if (!that.project.isNew) {
                    //已有项目,获取私钥后解密
                    that.projectDecrypt()
                }
            })

            ipcRenderer.once('publicpemend', (event, arg) => {
                that.project.pem.public = arg
                //私钥
                ipcRenderer.send('asynchronous-message',
                    {
                        name: name,
                        type: 'getprivatepem'
                    })
            })

            //公钥
            ipcRenderer.send('asynchronous-message',
                {
                    name: name,
                    type: 'getpublicpem'
                })

        },



        /**
         * 获取当前被选中的团队信息
         * @param {*} teamid 
         */
        getChkTeam() {
            if (this.state.navCate == 'team') {
                for (let team of this.teams) {
                    if (team.chk) {
                        return team
                    }
                }
            }

            if (this.state.navCate == 'persion') {
                for (let team of this.persions) {
                    if (team.chk) {
                        return team
                    }
                }
            }
            return {}
        },

        /**
         * 区域或id/key更换后刷新信息
         */
        flushProjectUI() {
            this.state.vpcErrInfo = ''
            this.state.apiWarnInfo = ''
            if (this.project.secretId != '' && this.project.secretKey != '' && this.project.region != '') {
                this.loadApiGateWay()
                this.uiClickVpc()
                this.flushNameSpace()
            } else {
                let info = ''
                if (this.project.secretId == '' || this.project.secretKey == '') {
                    model.showModel('请输入完整API密钥信息', '', {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                }
            }
        },

        flushNameSpace() {
            console.info('flushNameSpace')
            let that = this
            this.getScfnet().listNameSpace(this.project.secretId, this.project.secretKey, this.project.region, function (res) {
                console.info(res)
                if (typeof (res) == 'string') {
                    model.showModel('查询命名空间信息失败', res, {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                    return
                }
                that.adminSet.namespaces = res
            })
        },

        addNamespace() {
            let a = this.$refs.namespace.value
            if (this.project.namespaces.indexOf(a) == -1) {
                this.project.namespaces.push(a)
            }
        },

        uiAppendNamespace() {
            if (this.adminSet.addns.trim() != '') {
                console.info(this.adminSet.addns)
                this.state.submitns = true
                let that = this
                this.getScfnet().addNameSpace(this.getSCFSet(), this.adminSet.addns.trim(), function (res) {
                    that.state.submitns = false
                    if (typeof (res) == 'string') {
                        model.showModel('发布到腾讯云失败', res, {
                            confirm: { text: '确定', funname: 'hidDlg' }
                        })
                    } else {
                        model.showModel('发布到腾讯云成功', res, {
                            confirm: { text: '确定', funname: 'hidDlg' }
                        })
                        that.flushNameSpace()
                        that.adminSet.addns = ''
                    }

                })
            }

        },

        getSCFSet() {
            return {
                id: this.project.secretId,
                key: this.project.secretKey,
                region: this.project.region
            }
        },


        //查询api网关信息
        loadApiGateWay() {
            let that = this
            this.state.loadApiGateWay = true
            this.state.apiWarnInfo = ''
            this.adminSet.apiGateways = []
            this.getApiGateway().listServices(this.project.secretId, this.project.secretKey, this.project.region, (res) => {
                that.state.loadApiGateWay = false
                if (typeof (res) == 'string') {
                    that.state.apiWarnInfo = '查询API网关失败:' + res
                    return
                }
                that.state.apiWarnInfo = ''
                let tmps = []
                for (let api of res.ServiceSet) {


                    if (!that.project.isOwn) {
                        if (that.project.apiGateways.indexOf(api.ServiceId) == -1) {
                            continue;
                        }
                    }
                    tmps.push(api)
                    tmps.push({ domain: api.InnerSubDomain, isInner: true, isShow: false, isUrl: true })
                    tmps.push({ domain: api.OuterSubDomain, isOuter: true, isShow: false, isUrl: true })
                }
                that.adminSet.apiGateways = tmps
            })
        },


        /**
         * API网关展示对应的内外网URL
         * @param {*} inx 
         */
        uiShowApiUrl(inx) {
            this.adminSet.apiGateways[inx + 1].isShow = !this.adminSet.apiGateways[inx + 1].isShow
            this.adminSet.apiGateways[inx + 2].isShow = !this.adminSet.apiGateways[inx + 2].isShow
        },




        /**
         * 代码路径
         */
        chosecodepath: function () {
            let that = this
            ipcRenderer.once('endopendir', (event, arg) => {
                console.info(arg)
                if (arg) {
                    that.project.codeUri = arg[0]
                }
            })
            ipcRenderer.send('asynchronous-message', { type: 'opendir' })
        },


        dynamicfun(e) {
            if (e.currentTarget.dataset.click.indexOf('(') == -1) {
                eval('this.' + e.currentTarget.dataset.click + '()')
            } else {
                eval('this.' + e.currentTarget.dataset.click)
            }

        },

        hidDlg() {
            console.info('hidDlg')
            model.hiddenModel()
        },
    }
})

