var cos = null;
var scfnet = null;
var model = null;
let fs = require("fs");
var teamProject = null;
const { ipcRenderer } = require('electron');
var yaml = null;

let app = new Vue({
    el: '#main',
    data: {
        dialogVisible: false,
        showdeployui: false,

        //批量选择的函数名称
        checkList: [],
        //批量选择的函数详细信息
        checkListFuns: [],
        /**
         * 批量更新提示框显示开关
         */
        batchUploadDlg: false,

        batchUploadErrDlg: false,
        batchErrInfo: '',

        cloudFunctionPage: 0,
        cloudFunctionTotal: 0,
        showFunctions: [],
        scfFunctions: [],

        cloudFunctions: [],
        allFunctions: [],

        listcon: "all",//local cloud
        deploytxts: [],//shell 执行sls--debug的文本信息
        page: 1,
        searchKey: "",

        //自动化部署
        isdeploying: false,

        //命名空间
        namespaces: [],
        chknamespace: "default",


        projects: [],
        chkProject: {},

        loading: true,


        //代码更新失败
        updateErrorVisible: false,
        updateerrorinfo: '',

        //"只更新函数代码"功能的进度信息
        uploadCodeStep: {
            showui: false,

            isfin: false,
            stepzipbegin: false,
            stepzipend: false,

            stepcosbegin: false,
            stepcosend: false,
            stepcosinfo: "",

            stepcodebegin: false,
            stepcodeend: false,

            warninfo: ""
        },

        projectCate: 'persion',
        refreshTeam: false,
        chkTeamId: {},
        //项目类型
        teams: [],
        //业务模块
        chkModelCode: '',
        models: [],
        //部署类型
        chkCate: 'all',
        //待处理的函数列表
        chkFuns: [],
        chkFunsGroup: [],
        //sls日志信息
        delopyLog: { log: [], yml: [], fin: '' },
        //加载函数
        isLoadFuns: false,
        //自动部署页面
        showDeploy: false,

        //临时的正在部署函数的云id
        deployYmlId: '',
        loadFunsInfo: '',
        scfCosName: '',

        showConf: false,

        isConfEdit: false,
        funConf: {
            Namespace: '',
            FunctionName: '',
            Description: '',
            MemorySize: 0,
            Timeout: 0,
            InitTimeout: 0,
            Environment: { Variables: [] },
            PublicNetConfig: {
                EipConfig: {
                    EipStatus: 'DISABLE'
                },
                PublicNetStatus: 'ENABLE'
            },
            VpcConfig: {
                VpcId: '',
                SubnetId: ''
            },
            Layers: [
                {
                    LayerName: '',
                    LayerVersion: ''
                }
            ]
        },

        layers: [],
        layerVers: []

    },
    watch: {
        page: function (nv) {
            this.showPageFunction(nv)
        },
        listcon: function (nv) {
            console.info(nv)
            this.showPageFunction(1)
        }
    },
    created: function () {

    },
    mounted: function () {

        $("#main").on("click", ".dlginfobtn", this.dynamicfun);
        this.getModel().initNav('listfunction')
        // $.HSCore.components.HSHeaderSide.init($('#js-header'));
        $.HSCore.components.HSCountQty.init('.js-quantity');

        let that = this
        setTimeout(() => {
            that.init()
        }, 500);
        this.loading = false
    },
    methods: {
        getTeamProject() {
            if (teamProject == null) {
                teamProject = require("./js/teamProject");
            }
            return teamProject
        },
        getCos() {
            if (cos == null) {
                cos = require("../qcloud/cos.js");
            }
            return cos
        },

        getScfnet() {
            if (scfnet == null) {
                scfnet = require("../scfnet");
            }
            return scfnet
        },

        getModel() {
            if (model == null) {
                model = require("./js/model");
            }
            return model
        },

        getYaml() {
            if (yaml == null) {
                yaml = require('yaml')
            }
            return yaml
        },

        closeConf() {
            this.showConf = false
            this.isConfEdit = false
            this.funConf = {
                Namespace: '',
                FunctionName: '',
                Description: '',
                MemorySize: 0,
                Timeout: 0,
                InitTimeout: 0,
                Environment: { Variables: [] },
                PublicNetConfig: {
                    EipConfig: {
                        EipStatus: 'DISABLE'
                    },
                    PublicNetStatus: 'ENABLE'
                },
                VpcConfig: {
                    VpcId: '',
                    SubnetId: ''
                },
                Layers: [
                    {
                        LayerName: '',
                        LayerVersion: ''
                    }
                ]
            }
        },

        /**
         * 保存环境变量
         */
        submitConf() {
            let tmp = JSON.parse(JSON.stringify(this.funConf))
            delete tmp.PublicNetConfig.EipConfig.EipAddress
            let tmplay = []
            for (let lay of tmp.Layers) {
                tmplay.push({ LayerVersion: lay.LayerVersion, LayerName: lay.LayerName })
            }
            tmp.Layers = tmplay

            let tmpenvs = []
            for (let i = 0; i < tmp.Environment.Variables.length; ++i) {
                if (tmp.Environment.Variables[i].Key.trim() != '' && tmp.Environment.Variables[i].Value.trim() != '') {
                    tmpenvs.push(tmp.Environment.Variables[i])
                }
            }
            tmp.Environment.Variables = tmpenvs
            tmp.MemorySize = parseInt(tmp.MemorySize)
            tmp.Timeout = parseInt(tmp.Timeout)
            tmp.InitTimeout = parseInt(tmp.InitTimeout)

            this.isConfEdit = true
            let that = this
            //更新到腾讯云
            this.getScfnet().UpdateFunctionConfiguration(this.getSCFSet(), tmp, (ds) => {
                if (ds !== true) {
                    that.getModel().showModel('更新配置失败', ds, {
                        confirm: { text: '关闭', funname: 'hidDlg' }
                    })
                    return
                }

                that.updateFunction()

                //若云上存在函数配置,同步配置
                for (let show of that.showFunctions) {
                    if (show.FunctionName == that.funConf.FunctionName &&
                        show.Namespace == that.funConf.Namespace) {
                        if (show.isYml) {
                            that.syncYml(show.ymlid)
                        } else {
                            //不同步,直接关闭,否则在同步完成关闭
                            that.closeConf()
                            that.getModel().showModel('更新配置成功', '', {
                                confirm: { text: '关闭', funname: 'hidDlg' }
                            })
                        }
                    }
                }


            })
        },

        syncYml(ymlid) {
            let that = this
            ipcRenderer.once('editfunctionend', (event, arg) => {
                console.info(arg)
                let data = JSON.parse(arg)
                if (data.errorCode != 0) {
                    that.getModel().showModel('同步配置失败', data.errorMessage, {
                        confirm: { text: '关闭', funname: 'hidDlg' }
                    })
                } else {
                    that.getModel().showModel('更新配置成功', '', {
                        confirm: { text: '关闭', funname: 'hidDlg' }
                    })
                }
                that.closeConf()
            })

            let post = {
                'account': this.getScfnet().getLoginUser().accountmail,
                'code': this.getScfnet().getLoginUser().code,
                'yml': this.funConf,
                'ymlid': ymlid,
            }
            console.info('editfunction', post)
            ipcRenderer.send('asynchronous-message',
                { type: 'net', post: post, cate: 'editfunction' })
        },

        /**
         * 更新配置后 更新前台数据
         */
        updateFunction() {
            let that = this
            let ns = this.funConf.Namespace
            let fname = this.funConf.FunctionName
            var now = new Date();
            let str1 = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate()
            let str2 = now.getHours() + '-' + (now.getMinutes() + 1) + '-' + now.getSeconds()

            // this.getScfnet().getFunction(this.getSCFSet(), (fun)=>{
            for (let i = 0; i < that.showFunctions.length; ++i) {
                if (that.showFunctions[i].FunctionName == fname && that.showFunctions[i].Namespace == ns) {
                    that.showFunctions[i].Description = this.funConf.Description
                    that.showFunctions[i].ModTime = [str1, str2]
                    break
                }
            }
            for (let i = 0; i < that.scfFunctions.length; ++i) {
                if (that.scfFunctions[i].FunctionName == fname && that.scfFunctions[i].Namespace == ns) {
                    that.scfFunctions[i].Description = this.funConf.Description
                    that.scfFunctions[i].ModTime = [str1, str2]
                    break
                }
            }
            for (let i = 0; i < that.cloudFunctions.length; ++i) {
                if (that.cloudFunctions[i].FunctionName == fname && that.cloudFunctions[i].Namespace == ns) {
                    that.cloudFunctions[i].Description = this.funConf.Description
                    that.cloudFunctions[i].ModTime = [str1, str2]
                    break
                }
            }
            // }, ns, fname)


        },

        seditConf(namespace, funame) {
            this.showConf = true
            let that = this
            this.getScfnet().getFunction(this.getSCFSet(), (fun) => {
                if (typeof (fun) == 'string') {
                    that.getModel().showModel('查询函数信息失败', fun, {
                        confirm: { text: '关闭', funname: 'hidDlg' }
                    })
                } else {
                    if (fun.InitTimeout == 0) {
                        fun.InitTimeout = 15
                    }
                    fun.Environment.Variables.push({ Key: '', Value: '' })
                    let keys = Object.keys(that.funConf)
                    let tmp = {}
                    for (let key of keys) {
                        tmp[key] = fun[key]
                    }
                    that.funConf = tmp
                }
                that.getScfnet().listLayers(this.getSCFSet(), (lays) => {
                    if (typeof (lays) == 'string') {
                        that.getModel().showModel('查询层信息失败', lays, {
                            confirm: { text: '关闭', funname: 'hidDlg' }
                        })
                        return
                    }

                    let tmps = []
                    for (let lay of lays) {
                        if (lay.Status == 'Publishing' || lay.Status == 'Active') {
                            tmps.push(lay)
                        }
                    }
                    if (tmps.length == 0) {
                        console.info(lays)
                        that.getModel().showModel('无有效的层信息', '请先添加层信息', {
                            confirm: { text: '添加层', funname: 'toLay' },
                            cancel: { text: '关闭', funname: 'hidDlg' }
                        })
                        return
                    }
                    that.layers = tmps
                    that.changeLayer(tmps[0].LayerName)
                }, { Runtime: fun.Runtime })

            }, namespace, funame)
        },
        uiChangeLayer() {
            let ln = this.$refs.layname.value
            this.changeLayer(ln)
        },


        changeLayer(ln) {
            let that = this
            that.getScfnet().listLayerVersions(this.getSCFSet(), ln, (vers) => {
                if (typeof (vers) == 'string') {
                    that.getModel().showModel('查询层信息失败', vers, {
                        confirm: { text: '关闭', funname: 'hidDlg' }
                    })
                    return
                }
                let tmps = []
                for (let ver of vers) {
                    if (ver.Status == 'Publishing' || ver.Status == 'Active') {
                        tmps.push(ver)
                    }
                }
                that.layerVers = tmps
            })
        },

        delLayer(inx) {
            this.funConf.Layers.splice(inx, 1)
        },

        addLayer() {
            let tmp = this.$refs.layver.value
            if (this.funConf.Layers.some((element, index, array) => {
                return element.LayerVersion == tmp
            })) {
                return
            }
            for (let ver of this.layerVers) {
                if (tmp == ver.LayerVersion) {
                    this.funConf.Layers.push(ver)
                }
            }
        },

        editEnv(inx) {
            if (inx == this.funConf.Environment.Variables.length - 1) {
                if (this.funConf.Environment.Variables[inx].Value != '') {
                    this.funConf.Environment.Variables.push({ Key: '', Value: '' })
                }
            }
        },

        removeEnv(inx) {
            this.funConf.Environment.Variables.splice(inx, 1)
        },

        toLay() {
            window.location.href = "layer.html"
        },

        /**
         * 注册部署回调
         */
        regDeployLog() {
            let that = this
            ipcRenderer.on('revdeploylog', (event, arg) => {
                if (arg.cate == 'sls') {
                    that.delopyLog.log.push(arg.data)
                } else if (arg.cate == 'yml') {
                    for (let aa of that.getYaml().stringify(arg.data).split("\n")) {
                        that.delopyLog.yml.push(aa.replaceAll(' ', "&nbsp;"))
                    }
                } else if (arg.cate == 'fin') {
                    that.delopyLog.fin = arg.data
                    let yml = JSON.parse(process.env.yml)
                    //部署成功,提交信息到服务器
                    if (process.argv[2] == 'deploy') {
                        that.sycFun(yml.inputs.namespace, yml.inputs.name)
                    } else if (process.argv[2] == 'remove') {
                        that.removeDeploy(yml.inputs.namespace, yml.inputs.name)
                    }
                }
                document.getElementById("deploybot").scrollIntoView()
            })
        },

        /**
         * 部署成功 同步functionid
         */
        sycFun(namespace, funame) {
            this.getScfnet().getFunction(this.getSCFSet(), this.finDeploy, namespace, funame)
        },

        removeDeploy(namespace, funame) {
            let hasCloud = false

            //scfFunction  删除
            for (let i = 0; i < this.scfFunctions.length; ++i) {
                if (this.scfFunctions[i].Namespace == namespace && this.scfFunctions[i].FunctionName == funame) {
                    this.scfFunctions.splice(i, 1)
                    break
                }
            }
            //cloudFunction 设置标志
            for (let i = 0; i < this.cloudFunctions.length; ++i) {
                if (this.cloudFunctions[i].Namespace == namespace && this.cloudFunctions[i].FunctionName == funame) {
                    this.cloudFunctions[i].isDeploy = false
                    hasCloud = true
                    break
                }
            }
            //showfunction 设置标志
            for (let i = 0; i < this.showFunctions.length; ++i) {
                if (this.showFunctions[i].Namespace == namespace && this.showFunctions[i].FunctionName == funame) {
                    if (hasCloud) {
                        this.showFunctions[i].isDeploy = false
                    } else {
                        this.showFunctions.splice(i, 1)
                    }

                    // this.showFunctions[i].FunctionId
                    break
                }
            }
            // teamId = this.chkTeam._id

            // 'account' => 'email', 
            //     'code' => 'char',
            //     'ymlId' => 'char',
            //     'functionId' => 'char',
            //     'teamId'=>'char'
        },

        /**
         * 一键部署
         */
        ai(fun) {
            let that = this
            this.aiFun = JSON.parse(JSON.stringify(fun))
            this.getScfnet().getFunction(this.getSCFSet(), (data) => {
                if (typeof (data) == 'string') {
                    this.getModel().showModel('是否自动化部署?', '未在腾讯云检测到已部署的同名云函数', {
                        confirm: { text: '自动部署', funname: 'aiDeploy' },
                        cancel: { text: '关闭', funname: 'hidDlg' },
                    })
                    return
                } else {
                    console.info(data)
                    // if (this.hasScf(fun.Namespace, fun.FunctionName)) {
                    //补充所需的参数
                    that.aiFun.ModTime = data.ModTime
                    that.aiFun.FunctionId = data.FunctionId
                    this.getModel().showModel('已部署同名函数,是否合并?', '', {
                        confirm: { text: '关联', funname: 'aiRelation' },
                        cancel: { text: '关闭', funname: 'hidDlg' },
                    })
                    // }

                }
            }, fun.Namespace, fun.FunctionName)
        },

        hasScf(ns, fname) {
            for (let scf of this.scfFunctions) {
                if (scf.Namespace == ns && scf.FunctionName == fname) {
                    return true
                }
            }
            return false
        },


        /**
         * 智能关联
         */
        aiRelation() {
            this.hidDlg()
            this.deployYmlId = this.aiFun.ymlid
            this.finDeploy(this.aiFun)
        },



        /**
         * 智能部署启动
         */
        aiDeploy() {
            this.hidDlg()
            this.uiDeploy(this.aiFun)
        },

        /**
         * 同步部署信息到云
         * @param {*} fun 
         */
        finDeploy(fun) {
            let that = this
            ipcRenderer.once('deployfunctionend', (event, arg) => {
                arg = JSON.parse(arg)
                let title = ''
                let info = ''
                if (arg.errorCode == 0) {
                    title = '信息同步完毕'
                    info = arg.data
                    for (let i = 0; i < that.showFunctions.length; ++i) {
                        if (that.showFunctions[i].FunctionName == fun.FunctionName &&
                            that.showFunctions[i].Namespace == fun.Namespace) {
                            that.showFunctions[i].isDeploy = true
                            that.showFunctions[i].FunctionId = fun.FunctionId
                            that.showFunctions[i].ModTime = fun.ModTime.split("\n")
                        }
                    }
                    for (let i = 0; i < that.cloudFunctions.length; ++i) {
                        if (that.cloudFunctions[i].FunctionName == fun.FunctionName &&
                            that.cloudFunctions[i].Namespace == fun.Namespace) {
                            that.cloudFunctions[i].isDeploy = true
                            that.cloudFunctions[i].FunctionId = fun.FunctionId
                            that.cloudFunctions[i].ModTime = fun.ModTime.split("\n")
                        }
                    }
                } else {
                    title = '信息同步失败'
                    info = arg.errorMessage
                }
                this.getModel().showModel(title, info, {
                    confirm: { text: '确定', funname: 'hidDlg' },
                })
            })

            let post = {
                'account': this.getScfnet().getLoginUser().accountmail,
                'code': this.getScfnet().getLoginUser().code,
                'ymlId': this.deployYmlId,
                'functionId': fun.FunctionId,
                'teamId': this.getChkTeam()._id
            }
            ipcRenderer.send('asynchronous-message',
                { type: 'net', post: post, cate: 'deployfunction' })
        },

        /**
         * 启动自动部署函数
         * @param {*} fun 
         */
        uiDeploy(fun) {
            if (!fun.isYml) {
                this.getModel().showModel('无法部署', '该函数无配置文件<br>无法进行部署', {
                    confirm: { text: '确定', funname: 'hidDlg' },
                    cancel: { text: '去配置', funname: 'toSet' }
                })
                return
            }

            let that = this
            this.sls('deploy', fun.ymlid)
        },

        closeZipUI() {
            // if (this.uploadCodeStep.isfin) {
            this.uploadCodeStep.showui = false
            // }
        },

        /**
         * 刷新步骤信息
         * @param {*} step 
         */
        initCodeStep(step) {
            if (step == "init") {
                this.uploadCodeStep = {
                    showui: true,
                    isfin: false,

                    stepzipbegin: false,
                    stepzipend: false,

                    stepcosbegin: false,
                    stepcosend: false,
                    stepcosinfo: "",

                    stepcodebegin: false,
                    stepcodeend: false,

                    warninfo: ""
                }
            } else if (step == "zip") {
                this.uploadCodeStep.stepzipbegin = true
                this.uploadCodeStep.stepzipend = false
            } else if (step == "cos") {
                this.uploadCodeStep.stepzipbegin = false
                this.uploadCodeStep.stepzipend = true

                this.uploadCodeStep.stepcosbegin = true
                this.uploadCodeStep.stepcosend = false
            } else if (step == "code") {
                this.uploadCodeStep.stepzipbegin = false
                this.uploadCodeStep.stepzipend = true

                this.uploadCodeStep.stepcosbegin = false
                this.uploadCodeStep.stepcosend = true

                this.uploadCodeStep.stepcodebegin = true
                this.uploadCodeStep.stepcodeend = false

            } else if (step == "fin") {
                this.uploadCodeStep.stepzipbegin = false
                this.uploadCodeStep.stepzipend = true

                this.uploadCodeStep.stepcosbegin = false
                this.uploadCodeStep.stepcosend = true

                this.uploadCodeStep.stepcodebegin = false
                this.uploadCodeStep.stepcodeend = true

                this.uploadCodeStep.isfin = true
            }

        },

        toCos() {
            shell.openExternal("https://console.cloud.tencent.com/cos");
        },

        /**
         * 根据scf函数详情确认代码目录是否存在该函数
         */
        isExitFunction(ns, fname, calback) {
            let that = this
            this.getScfnet().getFunction(this.getSCFSet(), (data) => {
                if (typeof (data) == 'string') {
                    that.getModel().showModel('查询函数信息失败,无法更新代码', data, {
                        confirm: { text: '关闭', funname: 'hidDlg' }
                    })
                    return
                }
                let hans = data.Handler.split(".")
                let rt = data.Runtime.toUpperCase()
                let p = /PHP/, n = /NODEJS/, py = /PYTHON/
                if (!p.test(rt) && !n.test(rt) && !py.test(rt)) {
                    that.getModel().showModel('目前仅支持php,nodejs和Python', '', {
                        confirm: { text: '关闭', funname: 'hidDlg' }
                    })
                    return
                }
                let path = that.getChkTeam().project.codeUri
                let myRe = []
                if (p.test(rt)) myRe = [path + "/" + hans[0] + '.php']
                if (n.test(rt)) myRe = [path + "/" + hans[0] + '.js', path + "/" + hans[0] + '.ts']
                if (py.test(rt)) myRe = [path + "/" + hans[0] + '.py', path + "/" + hans[0] + '.py3', path + "/" + hans[0] + '.pyw']
                for (let re of myRe) {
                    try {
                        fs.accessSync(re, fs.constants.R_OK);
                        fs.readFile(re, 'utf8', (err, ft) => {
                            if ((new RegExp(hans[1], 'i')).test(ft)) {
                                console.error('有函数');
                                calback(data)
                                return
                            }
                        })
                        return
                    } catch (err) {
                    }
                }
                that.getModel().showModel('未检测到代码', path + "目录中未检测到匹配的入口(" + data.Handler + ")", {
                    confirm: { text: '关闭', funname: 'hidDlg' }
                })
            }, ns, fname);
        },

        /**
         * 更新函数代码
         * @param {*} fun 
         */
        updateCode(fun) {
            let that = this
            this.isExitFunction(fun.Namespace, fun.FunctionName, (scfFun) => {
                //清理批量更新的历史记录
                console.info('isExitFunction', scfFun)
                that.chkFunsGroup = []
                fun.Handler = scfFun.Handler
                that.getCos().listBucket(that.getSCFSet(), (data) => {
                    if (typeof (data) == 'string' || data.length == 0) {
                        that.getModel().showModel('只更新代码需要COS支持', '请创建名称为scfgui的存储桶', {
                            confirm: { text: '去创建', funname: 'toCos' },
                            cancel: { text: '关闭', funname: 'hidDlg' }
                        })
                        return
                    }

                    let appid = ''
                    for (let bu of data) {
                        let ls = bu.Name.split('-')
                        appid = ls[ls.length - 1]
                        if (ls[0].toUpperCase() == 'SCFGUI') {
                            that.scfCosName = bu.Name
                            that.beginUploadCode([fun])
                            return
                        }
                    }
                    if (appid == '') {
                        that.getModel().showModel('只更新代码需要COS支持', '请创建名称为scfgui的存储桶', {
                            confirm: { text: '去创建', funname: 'toCos' },
                            cancel: { text: '关闭', funname: 'hidDlg' }
                        })
                        return
                    }
                    that.scfCosName = 'scfgui-' + appid
                    that.getCos().createCodeBucket(that.getSCFSet(), that.scfCosName, () => {
                        that.beginUploadCode([fun])
                    })
                })
            });
            return
        },

        addSet() {
            this.getModel().showModel('添加配置', '您尚未配置该函数<br>请添加配置信息', {
                confirm: { text: '去配置', funname: 'toSet' },
                cancel: { text: '关闭', funname: 'hidDlg' }
            })
        },

        toSet() {
            window.location.href = 'addfunction.html'
        },

        explodeEq(ex1, ex2) {
            // console.info(ex1, ex2)
            for (let a of ex1) {
                if (!ex2.includes(a)) {
                    return false
                }
            }
            return true
        },

        getBatchGroup() {
            let tmps = []
            let allFuns = this.getDeployFuns()
            for (let fun of allFuns) {
                if (this.checkList.includes(fun.FunctionId)) {
                    tmps.push(fun)
                }
            }
            console.info('tmps', tmps)
            let groups = []
            for (let tmp of tmps) {
                if (groups.length == 0) {
                    groups.push({ isUp: false, funs: [tmp] })
                    continue;
                }

                let ex = false
                for (let i = 0; i < groups.length; ++i) {
                    if (this.explodeEq(groups[i].funs[0].exclude, tmp.exclude)) {
                        ex = true
                        groups[i].funs.push(tmp)
                    }
                }
                if (!ex) {
                    groups.push({ isUp: false, funs: [tmp] })
                }
            }
            return groups
        },

        clearCheckList() {
            this.checkList = []
            this.checkListFuns = []
        },

        showBatchUpdateCode() {
            this.chkFunsGroup = this.getBatchGroup()
            this.batchUpdateCode()
        },

        /**
        * 批量更新函数代码
        */
        batchUpdateCode() {
            // allFunctions
            let ups = []

            //筛选出有本地配置文件的函数进行更新
            for (let i = 0; i < this.chkFunsGroup.length; ++i) {
                if (this.chkFunsGroup[i].isUp) {
                    continue
                }

                for (let fun of this.chkFunsGroup[i].funs) {
                    if (fun.isYml) {
                        ups.push(fun)
                    }
                }
                if (ups.length == 0) {
                    this.batchErrInfo = '未读取到函数配置信息'
                    this.batchUploadErrDlg = true
                    this.getModel().showModel('更新失败', '云函数配置了相关信息后才可以仅更新代码', {
                        confirm: { text: '去配置', funname: 'toSet' },
                        confirm: { text: '关闭', funname: 'hidDlg' }
                    })
                    return
                }
                this.chkFunsGroup[i].isUp = true
                this.beginUploadCode(ups)
            }


        },

        /**
         * 开始更新代码
         */
        beginUploadCode(fns) {
            this.initCodeStep('init')
            this.chkFuns = fns
            let ex = []
            if(fns[0].hasOwnProperty('exclude')){
                ex = fns[0].exclude
            }else{
                ex = this.getChkTeam().project.exclude
            }
            this.zipCode(this.getChkTeam().project.codeUri, ex)
        },


        /**
         * 打包文件
         */
        zipCode(codePath, excludes) {
            this.initCodeStep("zip")
            let zipname = new Date().getTime() + '.zip'
            let exs = []
            for (let ex of excludes) {
                exs.push(ex.replaceAll('/**', ''))
            }
            this.getCos().zip(codePath, exs, zipname, this.uploadCos)
        },

        /**
         * 上传文件到cos
         * @param {*} absPath 本地文件绝对路径
         * @param {*} filename 上传后的文件名
         */
        uploadCos(absPath, filename) {
            this.initCodeStep("cos")
            let that = this
            let tmp = this.getSCFSet()

            this.getCos().getBuckName(tmp, (data) => {
                if (typeof (data) == 'string') {
                    this.getModel().showModel('无对象存储', '请随意创建一个存储桶', {
                        confirm: { text: '确定', funname: 'toCos' }
                    })
                    return
                }
                tmp.bucket = data.name
                that.getCos().uploadFile(tmp, absPath, filename,
                    that.deloyCode, that.flushCos,
                    (res) => {
                        console.info(res)
                    })
            })


        },

        toCos() {

        },

        /**
         * 处理cos上传的进度信息
         * @param {*} res 
         */
        flushCos(res) {
            if (res.loaded == undefined) {
                this.uploadCodeStep.stepcosinfo = "已上传完毕"
            } else {
                this.uploadCodeStep.stepcosinfo = "已上传:" + (res.loaded / 1024 / 1024).toFixed(2) + "M 速度:" + (res.speed / 1024 / 1024).toFixed(2)
            }
        },

        /**
         * 通过cos更新scf代码
         * @param {*} filename  cos中的文件名,需要指定文件路径
         */
        deloyCode(filename) {
            this.initCodeStep("code")
            for (let i = 0; i < this.chkFuns.length; ++i) {
                //开始更新
                this.chkFuns[i].isflush = true
                this.chkFuns[i].isflushfin = false

                this.getScfnet().deployCode(this.getSCFSet(), filename,
                    {
                        handler: this.chkFuns[i].Handler,
                        name: this.chkFuns[i].FunctionName,
                        namespace: this.chkFuns[i].Namespace
                    },
                    this.finCode, this.deployError)
            }
            console.info("end")
        },

        /**
         * 函数执行失败
         * @param {string} info 
         */
        deployError(info) {
            console.info('deployError', info)
            this.getModel().showModel('更新失败', info, {
                confirm: { text: '确定', funname: 'hidDlg' }
            })
        },

        /**
         * 更新函数代码完成
         * @param {*} res 
         */
        finCode(res, funname) {
            let isfin = true;
            for (let i = 0; i < this.chkFuns.length; ++i) {
                if (this.chkFuns[i].FunctionName == funname) {
                    this.chkFuns[i].isflush = false
                    this.chkFuns[i].isflushfin = true
                    console.info("fin flush:", this.chkFuns[i].FunctionName)
                }
                if (!this.chkFuns[i].isflushfin) {
                    isfin = false
                }
            }
            if (isfin) {
                console.info("all fin")
                this.initCodeStep("fin")
                this.clearCheckList()
                this.batchUpdateCode()
            }
        },

        /**
         * 初始化页面数据
         */
        init() {
            let tmp = this.getTeamProject().getChkTeam()
            if (tmp === false) {
                this.chkTeam = null
            } else {
                this.projectCate = tmp.cate
                this.chkTeam = tmp.team
            }

            this.changeProjectCate()
            this.regDeployLog()
        },


        //初始化命名空间
        initNs(res) {
            this.isLoadFuns = true
            let team = this.getChkTeam()
            if (team === false || team.project.namespaces.length == 0) {
                this.isLoadFuns = false
                this.getModel().showModel('未配置命名空间', '无法查询函数列表', res, {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
            } else {
                this.namespaces = team.project.namespaces
                this.chknamespace = team.project.namespaces[0]
                this.getCloudYml()
            }
        },

        getInitChkTeam() {
            return { project: { tags: [] } }
        },

        /**
         * 切换项目类型
         */
        changeProjectCate() {
            this.teams = this.getTeamProject().getSpecProjects(this.projectCate)
            if (this.teams.length == 0) {
                this.getModel().showModel('您无该类型项目', '', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }
            let teamid = ''
            if(this.chkTeam==null){
                teamid = this.teams[0]._id
            }else{
                teamid = this.chkTeam._id
            }

            if(!this.teams.some((ele)=>ele._id==teamid)){
                teamid = this.teams[0]._id
            }
            

            this.changechkproject(teamid)
        },

        uiChangeTeam() {
            let val = this.$refs.chkteam.value
            this.changechkproject(val)
        },

        getChkTeam() {
            for (team of this.teams) {
                if (team._id == this.chkTeamId) {
                    return team
                }
            }
            return false
        },

        //切换当前选中项目
        changechkproject(teamid) {
            //清理历史
            this.showFunctions = []
            this.sourceFunctions = []
            this.chkTeamId = teamid

            let chkTeam = this.getChkTeam()
            if (chkTeam === false) {
                this.getModel().showModel('您已无法查看该项目', '', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }
            this.canEdit = this.valTeam(chkTeam)
            this.namespaces = []
            if (this.canEdit) {
                this.initModel()
                this.initNs()
                this.getTeamProject().saveChkTeam(this.projectCate, teamid)
                console.info('end initns')
            }
        },

        /**
         * 业务模块
         */
        initModel() {
            let team = this.getChkTeam()
            let tmps = [{ code: '', name: '全部' }]
            if (team !== false && team.project.tags && team.project.tags.length > 0) {
                tmps = tmps.concat(team.project.tags)
            }
            this.models = tmps
            this.chkModelCode = ''
        },

        valTeam(team) {
            if (!team.hasOwnProperty('project')) {
                this.getModel().showModel('项目未配置', '您尚未对该项目进行配置<br>请先去"云配置信息"配置', {
                    confirm: { text: '去配置', funname: 'toSet' },
                    cancel: { text: '取消', funname: 'hidDlg' }
                })
                return false
            }
            if (team.project.secretId === false) {
                this.getModel().showModel('解密失败', "您的密钥配置不正确,请修改", {
                    confirm: { text: '去配置', funname: 'toSet' },
                    cancel: { text: '取消', funname: 'hidDlg' }
                })
                return false
            }
            if (team.isjoin === false) {
                this.getModel().showModel('您尚未同意加入', "请去'云配置信息'先同意该项目邀请", {
                    confirm: { text: '去加入', funname: 'toSet' },
                    cancel: { text: '取消', funname: 'hidDlg' }
                })
                return false
            }

            return true
        },


        uiRefreshTeam() {
            this.refreshTeam = true
            this.getTeamProject().regFlushProjectFin(this.finRefreshTeam)
            this.getTeamProject().flushAllProject()
        },

        finRefreshTeam() {
            this.refreshTeam = false
            this.getTeamProject().regFlushProjectFin(null)
            this.changeProjectCate()
        },

        /**
         * removeScf
         * @param {*} fn 
         */
        uiRemovefun(fun) {
            if (this.isdeploying) {
                this.getModel().showModel('正在移除函数', '不支持多函数同时移除', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                //显示进度信息
                this.showdeployui = true
                return
            }
            if (fun.isYml) {
                this.sls('remove', fun.ymlid)
            } else {
                this.getModel().showModel('无法部署', '该函数无配置文件<br>无法进行部署', {
                    confirm: { text: '确定', funname: 'hidDlg' },
                    cancel: { text: '去配置', funname: 'toSet' }
                })
                return
            }
        },

        /**
         * uiRemovefun
         * @param {*} ns 
         * @param {*} funame 
         */
        sdkRemove(fun) {
            if (fun.isYml) {
                this.sls('remove', fun.ymlid)
                return
            }

            let ns = fun.Namespace
            let fname = fun.FunctionName
            let set = this.getSCFSet()
            let that = this
            this.showSlsDlg()

            this.delopyLog.log.push('查询触发器...')

            this.getScfnet().listTriggers(set, ns, fname, (tris) => {
                that.delopyLog.log.push('删除触发器')
                for (let tri of tris) {
                    let desc = JSON.parse(tri.TriggerDesc)
                    if (desc.hasOwnProperty("api")) {
                        that.delopyLog.log.push('删除API网关:' + desc.service.serviceId)
                        scfnet.deleteApi(set, desc.service.serviceId, desc.api.apiId, () => { })
                    }
                }
                that.delopyLog.log.push('移除云函数部署')
                scfnet.deleteFunction(set, ns, fname, () => {
                    that.delopyLog.fin = '移除完毕'
                    that.removeDeploy(ns, fname)
                })
            })
        },

        showSlsDlg() {
            this.delopyLog = { log: [], yml: [], fin: '' }
            this.showDeploy = true
        },

        /**
         * serverless 自动化部署
         * @param {s} command 
         * @param {*} ymlid 
         */
        sls(command, ymlid) {
            this.showSlsDlg()
            let that = this
            ipcRenderer.once('getfunctionend', (event, arg) => {
                //获取云配置函数信息
                arg = JSON.parse(arg)
                if (arg.errorCode != 0) {
                    this.getModel().showModel('无法部署', arg.errorMessage, {
                        confirm: { text: '确定', funname: 'hidDlg' },
                    })
                    return
                }
                //开始部署
                process.argv = ['', '', command, '--debug']
                process.env.TENCENT_SECRET_ID = that.getChkTeam().project.secretId
                process.env.TENCENT_SECRET_KEY = that.getChkTeam().project.secretKey
                arg.data.yml.inputs.src.src = that.getChkTeam().project.codeUri
                process.env.yml = JSON.stringify(arg.data.yml)
                let sls = require("../serverless/bin/serverless.js")
                sls.deploy()
            })

            //查询函数的云配置信息
            let post = {
                'account': this.getScfnet().getLoginUser().accountmail,
                'code': this.getScfnet().getLoginUser().code,
                'funid': ymlid
            }
            this.deployYmlId = ymlid
            ipcRenderer.send('asynchronous-message',
                { type: 'net', post: post, cate: 'getfunction' })
        },

        deployfun(fn) {
            if (this.isdeploying) {
                this.getModel().showModel('正在部署函数', '不支持多函数同时部署', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                //显示进度信息
                this.showdeployui = true
                return
            }
            this.deploytxts = ['开始自动部署函数:' + fn]
            this.isdeploying = true
            this.showdeployui = true
            this.flushDelopyState(fn, true, '部署到云')
            this.getScfnet().deploy(fn, this.flushSlsTxt, this.findeploy)
        },

        findeploy(suc, fn, errmsg) {
            this.flushDelopyState(fn, false, '')
            if (suc) {
                this.isdeploying = false
                this.getCloudYml()
            } else {
                this.getModel().showModel('自动化部署失败', errmsg, {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
            }
        },

        flushDelopyState(fn, state, info) {
            for (let i = 0; i < this.showFunctions.length; ++i) {
                if (this.showFunctions[i].FunctionName == fn) {
                    this.showFunctions[i].ing = state
                    this.showFunctions[i].inginfo = info
                    return
                }
            }
        },

        dynamicfun(e) {
            eval('this.' + e.currentTarget.dataset.click + '()')
        },

        hidDlg() {
            console.info('hidDlg')
            this.getModel().hiddenModel()
        },

        aa() {
            console.info('aa')
        },



        closedeployui() {
            console.info("close")
            this.showdeployui = false
        },

        //删除函数
        delfun(fn) {
            this.delfunname = fn
            this.getModel().showModel('您要删除该函数配置吗?', '删除后无法恢复,需要您重新配置', {
                confirm: { text: '取消删除', funname: 'hidDlg' },
                cancel: { text: '确定删除', funname: 'delFunConfirm' }
            })
        },

        delFunConfirm() {
            this.flushDelopyState(this.delfunname, true, '正在删除')
            this.getModel().hiddenModel()
            // CONFIG.removeFun(this.delfunname)
            this.getCloudYml()
        },

        flushSlsTxt(info) {
            console.info(info)
            this.deploytxts.push(info)
            deployload.scrollIntoView();
        },

        /**
         * 清理查询出的函数信息
         */
        cleanFuns() {
            this.scfFunctions = []
            this.cloudFunctions = []
            this.showFunctions = []
            //批量操作选择的函数名字列表
            this.checkList = []
        },

        /**
         * 将云上yml文件转化成和腾讯云API函数查询结果相同的格式
         * @param {*} fnyml 
         */
        getFunctionFromYml(fnyml) {
            return {
                FunctionName: fnyml.yml.inputs.name,
                Handler: fnyml.yml.inputs.handler,
                Description: fnyml.yml.inputs.description,
                Runtime: fnyml.yml.inputs.runtime,
                FunctionId: fnyml.functionId,
                ModTime: ["未部署"],
                Namespace: fnyml.yml.inputs.namespace,
                file: fnyml.file,
                exclude: fnyml.yml.inputs.src.exclude,
                modelName: this.getCloudModelName(fnyml.model),
                modeCode: fnyml.model,
                ymlid: fnyml._id,
                yml: fnyml.yml
            }
        },

        /**
         * 读取命名空间下函数的入口
         * 先读取本地配置文件的,再读取SCF云上的函数
         * 本地配置文件存在 但云不存在则为未部署
         */
        getCloudYml() {
            // this.refreshFun = true
            let that = this
            this.cleanFuns()
            //仅首次查询设置了加载状态
            if (!this.isLoadFuns) {
                this.isLoadFuns = true
            }
            this.loadFunsInfo = '查询函数配置信息'

            ipcRenderer.once('getymlsend', (event, arg) => {
                arg = JSON.parse(arg)
                if (arg.errorCode == 0) {
                    for (let i = 0; i < arg.data.length; ++i) {
                        let fn = arg.data[i]
                        if (fn.yml.inputs.namespace == this.chknamespace) {
                            this.cloudFunctions.push(that.getFunctionFromYml(fn))
                        }
                    }
                    that.loadFunsInfo = '查询腾讯云已部署函数信息'
                    this.getScfnet().listFunction(that.getSCFSet(), that.initFunction, 0, 20, that.chknamespace)
                } else {
                    // that.refreshTeam = false
                    that.isLoadFuns = false

                    this.getModel().showModel('查询配置的函数信息失败', arg.errorMessage, {
                        confirm: { text: '确定', funname: 'hidDlg' },
                    })
                }
            })

            //首次加载加速
            if (scfnet == null) {
                setTimeout(() => {
                    that.getYmls()
                }, 100);
            } else {
                this.getYmls()
            }
        },

        getYmls() {
            let post = {
                'account': this.getScfnet().getLoginUser().accountmail,
                'code': this.getScfnet().getLoginUser().code,
                'teamId': this.getChkTeam()._id,
                'nameSpace': this.chknamespace,
                'model': this.chkModelCode
            }
            ipcRenderer.send('asynchronous-message',
                { type: 'net', post: post, cate: 'getymls' })
        },

        getSCFSet() {
            let team = this.getChkTeam()
            return {
                id: team.project.secretId,
                key: team.project.secretKey,
                region: team.project.region
            }
        },

        getModelName(tags) {
            let team = this.getChkTeam()
            let models = team.project.tags
            for (var model of models) {
                for (var tag of tags) {
                    if (tag.Key == "modelcode" && tag.Value == model.code) {
                        return model.name
                    }
                }
            }
            return ''
        },

        getCloudModelName(name) {
            let team = this.getChkTeam()
            let models = team.project.tags

            for (var model of models) {
                if (model.code == name) {
                    return model.name
                }
            }
            return ''
        },

        //首次查询云端函数列表完毕
        initFunction: function (res) {
            // this.isLoadFuns = false
            if (res.hasOwnProperty("Functions")) {
                //显示      
                // this.showFunctions = res.Functions
                //总数
                this.cloudFunctionTotal = res.TotalCount
                //页数
                //合并到全部函数
                this.scfFunctions = [...this.scfFunctions, ...res.Functions]

                if (res.TotalCount > 20) {
                    this.getScfnet().listFunction(this.getSCFSet(), this.allLeftFunction, 20, res.TotalCount - 20)
                } else {
                    this.initAllFunction()
                }

            } else {
                this.getModel().showModel('查询函数失败', res, {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
            }
        },


        //查询剩余全部云端函数
        allLeftFunction: function (res) {
            this.scfFunctions = [...this.scfFunctions, ...res.Functions]
            this.initAllFunction()
        },

        /**
         * 已经部署的函数
         */
        getDeployFuns() {
            let tmps = []
            let funs = this.scfFunctions
            if (this.chkModelCode != '') {
                //模块查询
                funs = this.getModelFuns()
            }

            for (let fun of funs) {
                let ex = this.isIn(fun.FunctionId, this.cloudFunctions)
                if (ex === false) {
                    fun.isYml = false
                    fun.isDeploy = true
                    fun.modelName = ''
                } else {
                    let mt = fun.ModTime
                    fun = this.cloudFunctions[ex]
                    fun.ModTime = mt
                    fun.isYml = true
                    fun.isDeploy = true
                }
                tmps.push(fun)
            }
            return tmps
        },


        /**
         * 未部署的函数
         */
        getUndeployFuns() {
            let tmps = []
            let funs = this.cloudFunctions
            if (this.chkModelCode != '') {
                funs = this.getModelFuns()
            }
            for (let fun of funs) {
                if (false === this.isIn(fun.FunctionId, this.scfFunctions)) {
                    fun.isYml = true
                    fun.isDeploy = false
                    tmps.push(fun)
                }
            }
            return tmps;
        },

        /**
        * 根据模块查询全部函数
        */
        getModelFuns() {
            let tmps = []
            for (let fun of this.cloudFunctions) {
                if (this.chkModelCode == fun.modeCode) {
                    ////////
                    tmps.push(fun)
                }
            }
            return tmps;
        },

        getAllFuns() {
            let tmps = this.getUndeployFuns()
            let t2 = this.getDeployFuns()
            return [...tmps, ...t2]
        },

        //全部

        isIn(fnid, arr) {
            for (let i = 0; i < arr.length; ++i) {
                if (arr[i].FunctionId == fnid) {
                    return i;
                }
            }
            return false
        },


        //合并本地和远程函数
        initAllFunction() {
            //已部署
            //未部署
            //全部
            this.refreshTeam = false

            for (let i = 0; i < this.scfFunctions.length; ++i) {
                this.scfFunctions[i].ModTime = this.scfFunctions[i].ModTime.split(' ')
            }

            let showFuns = []
            switch (this.chkCate) {
                case 'all':
                    showFuns = this.getAllFuns()
                    break
                case 'deploy':
                    showFuns = this.getDeployFuns()
                    break
                case 'undeploy':
                    showFuns = this.getUndeployFuns()
                    break
            }
            this.formatShowFun(showFuns)
            this.initAuto(showFuns)
            this.isLoadFuns = false
            this.showPageFunction(1)
        },

        searchFun() {
            let key = this.$refs.searchKey.value
            console.info(key)
            let tmps = []
            for (let fun of this.allFunctions) {
                if (fun.FunctionName.indexOf(key) != -1) {
                    tmps.push(fun)
                }
            }
            this.formatShowFun(tmps)
            this.showPageFunction(1)
        },

        /**
         * 将入参格式化成UI展示元素
         */
        formatShowFun(fns) {
            //生成函数排序序列
            for (let i = 0; i < fns.length; ++i) {
                fns[i].inx = i + 1
            }
            this.sourceFunctions = fns
            this.cloudFunctionPage = Math.ceil(fns.length / 20)
        },

        /**
         * 首页
         */
        firstPage() {
            this.showPageFunction(1)
        },
        /**
         * 最后页
         */
        endPage() {
            this.showPageFunction(this.cloudFunctionPage)
        },

        //翻页
        showPageFunction: function (page) {
            // listcon:"all",//local cloud

            this.page = page
            let showtmps = []
            for (let i = (page - 1) * 20; i < page * 20 && i < this.sourceFunctions.length; ++i) {
                showtmps.push(this.sourceFunctions[i])
            }
            this.showFunctions = showtmps

            $('body,html').animate({
                scrollTop: 0
            }, 500)

        },

        showCodeInfo(inx) {
            this.showFunctions.splice(inx, 0, {
                cate: "code",
            })
        },

        changecate(cate) {
            this.listcon = cate
        },

        //搜索框
        initAuto(fns) {
            let names = []
            //生成函数排序序列
            for (let fn of fns) {
                names.push(fn.FunctionName)
            }

            $("#tags").autocomplete({
                source: names
            });
        },

        nextPage: function () {
            this.page++
        },
        prePage: function () {
            this.page--
        }
    }
})

