let shell = null;
let fs = require("fs");
let cos = null;
let scfnet = null
let model = require("./js/model")
let teamProject = require("./js/teamProject");
let ipcRenderer = require('electron').ipcRenderer;

let app = new Vue({
    el: '#main',
    data: {
        //当前SCF环境配置
        scf: {},
        //当前项目配置
        fun: {
            inputs: {
                events: {
                    timer: { parameters: { name: '' } },
                    apigw: { parameters: { endpoints: [{ apiName: '', function: { isIntegratedResponse: false } }] } }
                },
                vpcConfig: { vpcId: '', subnetId: '' },
                src: { src: '', exclude: [] }
            }
        },
        //接口api信息
        environment: [{ name: "", val: "" }],
        tags: [{ name: "", code: "" }],
        showvpc: "close",
        //被选择的api文件
        chkapifile: "",
        apifiles: [],
        apifunctions: [],
        //事件
        event: "",
        //api网关触发模式
        apigwtype: 'day',
        apigwtime: '00:00:01',
        apigw: {
            apitype: "fix",
            dynamic: [],
            apigateways: [],
            serviceId: "",
            integratedResponse: "FALSE",
            cors: "TRUE", responseType: "JSON", protocols: "https", method: "POST", required: "TRUE",
            param: [{ name: "", required: "FALSE", type: "string", defaultValue: "", desc: "" }]
        },
        //cos触发模式
        cosgw: {},
        timergw: {
            month: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            week: [0, 1, 2, 3, 4, 5, 6],
            type: "fix",
            //循环触发设置
            cir: {
                type: "",
                txt: "",
                //循环触发设置的值
                number: ""
            }
        },

        //账号COS下Buckets的列表
        buckets: {},

        //命名空间列表
        namespace: [],
        //是否正在SCF查询命名空间
        loadnamespace: false,

        //是否添加
        addnamespace: {
            show: false,
            name: ""
        },

        //UI初始化状态
        istotalload: true,
        //导航栏的项目信息
        teams: [],
        projectCate: 'persion',
        chkTeam: { project: { tags: [] } },

        //true=精简模式, false完整模式
        simpleMode: true,

        vpcs: [],
        subnets: [],
        canEdit: false,
        //刷新全部云项目信息
        refreshTeam: true,
        //层
        layers: [],
        layerVersions: [],
        chkLayers: [{ LayerName: '', LayerVersion: '', vers: [] }],

        isShowDyPara: false,
        modelCode: '',

        //提交表单
        isSubmitCloud: false,

        showHelp: {
            api: false,
            path: false,
            fix: false,
            intres: false,
            cos: false
        },

        jsKeys: [
            'break',
            'case',
            'catch',
            'continue',
            'default',
            'delete',
            'do',
            'else',
            'finally',
            'for',
            'function',
            'if',
            'in',
            'instanceof',
            'new',
            'return',
            'switch',
            'this',
            'throw',
            'try',
            'typeof',
            'var',
            'void',
            'while',
            'with',
            'abstract',
            'boolean',
            'byte',
            'char',
            'class',
            'const',
            'debugger',
            'double',
            'enum',
            'export',
            'extends',
            'final',
            'float',
            'goto',
            'implements',
            'import',
            'int',
            'interface',
            'long',
            'native',
            'package',
            'private',
            'protected',
            'public',
            'short',
            'static',
            'super',
            'synchronized',
            'throws',
            'transient',
            'volatile'
        ],
    },
    mounted: function () {
        this.istotalload = false
        model.initNav('addfunction')
        $("#main").on("click", ".dlginfobtn", this.dynamicfun);
        // $.HSCore.components.HSHeaderSide.init($('#js-header'));
    },
    created: function () {
        this.init()
    },
    watch: {
        // 'fun.runtime': function (nv, ov) {
        //     console.info(nv, ov)
        //     //首次初始化的时候不更新
        //     if (ov == undefined) {
        //         return;
        //     }
        //     // var word = /php.*/i
        //     // console.debug(word.test(nv))
        //     // if (word.test(nv)) {
        //         this.listapifile()
        //     // }

        // },
        'fun.codeUri': function (nv, ov) {
            console.info(nv, ov)
            var word = /php.*/i

            if (word.test(this.fun.runtime)) {
                this.listapifile()
            }
        },

        'chkapifile': function (nv, ov) {
            for (file of this.apifiles) {
                if (file.name == nv) {
                    this.apifunctions = file.function
                    this.fun.inputs.name = ""
                    break
                }
            }
            // this.flushApiGatewaySet()
        }
    },
    methods: {
        getShell() {
            if (shell == null) {
                shell = require('electron').shell
            }
            return shell
        },

        getCos() {
            if (cos == null) {
                cos = require("../qcloud/cos.js")
            }
            return cos
        },

        getTeamProject() {
            if (teamProject == null) {
                teamProject = require("./js/teamProject");
            }
            return teamProject
        },

        init() {
            let that = this
            setTimeout(() => {
                let tmp = that.getTeamProject().getChkTeam()
                if (tmp === false) {
                    that.chkTeam = that.getInitChkTeam()
                } else {
                    that.projectCate = tmp.cate
                    that.chkTeam = that.initChkTeam(tmp.team)
                }
                that.changeProjectCate()
            }, 1000);

        },

        /**
         * 修改"触发器"->循环触发 的规则
         * @param {*} type 
         */
        changeCir(type) {
            this.timergw.cir.type = type
            if (type == "day") {
                this.timergw.cir.txt = "天"
            } else if (type == "hour") {
                this.timergw.cir.txt = "小时"
            } else if (type == "min") {
                this.timergw.cir.txt = "分"
            } else if (type == "sec") {
                this.timergw.cir.txt = "秒"
            }
        },

        changeDesc() {
            this.flushApiGatewaySet()
        },
        /**
         * 页面配置模式
         * @param {string} res 
         */
        isSimpleMode(res) {
            this.simpleMode = res
        },

        /**
         * 根据配置信息配置api网关部分配置信息
         */
        flushApiGatewaySet() {
            if (this.event == "api") {
                this.fun.inputs.events.apigw.parameters.endpoints[0].description = this.fun.inputs.description
                this.fun.inputs.events.apigw.parameters.endpoints[0].apiName = this.fun.inputs.name
                this.fun.inputs.events.apigw.parameters.endpoints[0].path = "/" + this.fun.inputs.namespace + "/" + this.chkapifile + "/" + this.fun.inputs.name
            }

        },
        //切换触发模式
        changeevent() {
            if (this.fun.inputs.name == "") {
                this.event = ""
                model.showModel('文件配置', "请先配置接口文件和接口函数", {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }

            if (this.event == "cos") {
                this.getCos().listBuck(this.initCos)
                return
            }

            if (this.event == "timer") {
                $.HSCore.components.HSSlider.init('#regularSlider, #regularSlider2, #regularSlider3, #rangeSlider, #rangeSlider2, #rangeSlider3, #stepSlider, #stepSlider2, #stepSlider3');
            }

            if (this.event == "api") {
                this.flushApiGatewaySet()
                let that = this
                if (this.chkTeam.project.apiGateways.length == 0) {
                    model.showModel('您尚未配置API网关服务,无法使用API网关触发模式', "", {
                        confirm: { text: '配置', funname: 'toSet' },
                        cancel: { text: '取消', funname: 'hidDlg' }
                    })
                }
            }
        },

        toSet() {
            window.location.href = "./set.html"
        },

        uiChangeTeam() {
            let id = this.$refs.chkteam.value
            this.changechkproject(id)
        },





        toSet() {
            window.location.href = "./set.html"
        },

        valTeam(team) {
            if (!team.hasOwnProperty('project') || !team.project.hasOwnProperty('secretId')) {
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

            return true
        },


        flushUISet() {
            console.info('flushUISet')
            if (this.chkTeam.project.namespaces.length > 0) {
                this.namespace = this.chkTeam.project.namespaces
            }
            this.runtimes = this.chkTeam.project.runtime
            this.publicAccess = this.chkTeam.project.canVpc
            this.vpcs = this.chkTeam.project.vpcs
            if (this.chkTeam.project.canVpc) {
                this.uiChangeVpc(this.vpcs[0].VpcId)
            }

        },

        uiChangeVpc(vid) {
            for (let vpc of this.vpcs) {
                if (vpc.VpcId == vid) {
                    this.subnets = vpc.subnets
                }
            }
        },

        getInitFun() {
            //formatFunToDB
            let fun = {
                org: 'simplescf',
                stage: 'dev',
                component: 'scf',
                name: '',
            }

            fun.inputs = {
                name: '',
                namespace: '',
                vpcConfig: {
                    vpcId: '',
                    subnetId: ''
                },
                src: {
                    src: '',
                    exclude: []
                },
                layers: [
                    { name: '', version: '' },
                ],
                handler: '',
                runtime: '',
                region: '',
                description: '',
                memorySize: 64,
                timeout: 20,
                initTimeout: 3,
                publicAccess: false,
                eip: false,
                // tags: {},
                // environment: { variables: [{ name: "", val: "" }] },
                events: {
                    timer: {
                        parameters: {
                            name: '',
                            cronExpression: '',
                            enable: true
                        }
                    },
                    apigw: {
                        parameters: {
                            serviceName: '',
                            serviceId: '',
                            protocols: ['https'],
                            environment: 'release',
                            endpoints: [
                                {
                                    path: '',
                                    apiName: '',
                                    method: 'POST',
                                    description: '',
                                    enableCORS: false,
                                    responseType: 'JSON',
                                    serviceTimeout: 15,
                                    param: [

                                    ],
                                    function: {
                                        isIntegratedResponse: false
                                    }
                                }
                            ]
                        }
                    }
                }
            }
            //API网关赋值
            if (this.chkTeam.project.apiGateways && this.chkTeam.project.apiGateways.length > 0) {
                fun.inputs.events.apigw.parameters.serviceId =
                    this.chkTeam.project.apiGateways[0].ServiceId
            }

            this.initGlobalSet()

            return fun;
        },

        /**
         * 页面控件所需其他配置基础参数
         */
        initGlobalSet() {
            this.namespace = []
            this.runtimes = []
            this.publicAccess = false
            this.vpcs = []
            this.tags = [{ name: "", code: "" }]
        },

        getFunctionYmlFromTeam() {
            let fun = this.getInitFun()
            if (this.chkTeam.project.namespaces.length > 0) {
                fun.inputs.namespace = this.chkTeam.project.namespaces[0]
            }
            fun.inputs.src = {
                src: this.chkTeam.project.codeUri,
                exclude: this.chkTeam.project.exclude
            }
            fun.inputs.runtime = this.chkTeam.project.runtime[0]
            fun.inputs.region = this.chkTeam.project.region


            return fun
        },

        uiChanegVpc() {
            for (let vpc of this.chkTeam.project.vpcs) {
                if (vpc.VpcId == this.fun.inputs.vpcConfig.vpcId) {
                    this.subnets = vpc.subnets
                    this.fun.inputs.vpcConfig.subnetId = this.subnets[0]['SubnetId']
                }
            }
        },

        uiChangeVpcSet() {
            if (this.showvpc == 'open') {
                this.fun.inputs.vpcConfig.vpcId = this.chkTeam.project.vpcs[0]['VpcId']
                this.fun.inputs.vpcConfig.subnetId = this.chkTeam.project.vpcs[0].subnets[0]['SubnetId']
            } else {
                this.fun.inputs.vpcConfig.vpcId = ''
                this.fun.inputs.vpcConfig.subnetId = ''
            }
        },

        /**
         * 重新刷新云项目信息
         */
        uiRefreshTeam() {
            console.info('uiRefreshTeam')
            this.refreshTeam = true
            this.getTeamProject().regFlushProjectFin(this.finRefreshTeam)
            this.getTeamProject().flushAllProject()
        },

        /**
         * 刷新云项目配置完毕
         */
        finRefreshTeam() {
            console.info('finRefreshTeam')
            this.refreshTeam = false
            this.getTeamProject().regFlushProjectFin(null)
            this.changeProjectCate()
            this.changechkproject(this.chkTeam._id)
        },

        //初始化UI界面数据
        initUIData() {
            // this.scf = CONFIG.getChkConfig()            
            this.fun = this.getFunctionYmlFromTeam()
            this.listapifile()

            // if (fun.vpcConfig.isvpc == "true") {
            //     this.showvpc = "open"
            // }

            //API服务信息从项目配置转移到网关
            this.apigw.environment = "release"
            this.apigw.apigateways = {}
            //查询命名空间
            // this.loadnamespace = true
            // SCF.listNameSpace(
            //     this.getSCFSet().id, this.getSCFSet().key, this.getSCFSet().region,
            //     this.initNameSpace)
        },
        getSCFSet() {
            return {
                id: this.chkTeam.project.secretId,
                key: this.chkTeam.project.secretKey,
                region: this.chkTeam.project.region
            }
        },


        /**
         * @description: 更改路径类型(固定/可变)
         * @param {*}
         * @return {*}
         */
        changeApiType() {
            if (this.isShowDyPara && this.fun.inputs.events.apigw.parameters.endpoints[0].param.length == 0) {
                this.fun.inputs.events.apigw.parameters.endpoints[0].param.push(this.getInitApigwDyPara())
            }
        },

        /**
         * 初始化UI的命名空间
         * @param {*} res  str = 错误原因
         */
        initNameSpace: function (res) {
            this.loadnamespace = false
            if (typeof (res) == "string") {
                model.showModel('查询SCF命名空间失败', "", {
                    confirm: { text: '修改', funname: 'toSet' },
                    cancel: { text: '取消', funname: 'hidDlg' }
                })
                return
            }
            this.namespace = res
        },

        getInitChkTeam() {
            // let chk = this.getTeamProject().getChkTeam()
            // if (chk !== false) {
            //     this.projectCate = chk.cate
            //     return chk.team
            // }
            return { project: { tags: [] } }
        },

        uiCleanAndChangeProjectCate() {
            this.chkTeam = []
            this.changeProjectCate()
        },

        /**
         * 切换项目类型列表
         */
        changeProjectCate() {
            console.info('changeProjectCate', this.projectCate)
            this.teams = this.getTeamProject().getSpecProjects(this.projectCate)
            if (this.teams.length == 0) {
                console.info('no chkTeam')
                model.showModel('您无该类型项目', '', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                this.fun = this.getInitFun()
                return
            }
            if (!this.chkTeam.hasOwnProperty('_id')) {
                //系统首次刷新
                this.chkTeam = this.initChkTeam(this.teams[0])
            }
            this.changechkproject(this.chkTeam._id)
        },

        initChkTeam(team) {
            if (!team.project) {
                team.project = { tags: [] }
            }
            if (team.project && !team.project.tags) {
                team.project.tags = []
            }
            return team
        },


        //切换当前选中项目
        changechkproject(teamid) {


            if (!this.teams.some((ele) => ele._id == teamid)) {
                this.refreshTeam = false
                model.showModel('您已无法查看该项目', '', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                this.chkTeam = this.initChkTeam(this.teams[0])
                return
            }

            if (this.chkTeam._id != teamid) {
                for (let team of this.teams) {
                    if (team._id == teamid) {
                        this.chkTeam = this.initChkTeam(team)
                        break
                    }
                }
            }

            this.canEdit = this.valTeam(this.chkTeam)
            if (this.canEdit) {
                this.flushUISet()
                this.initUIData()
                let that = this
                //防延迟
                setTimeout(() => {
                    that.listLayers()
                }, 500);
                this.getTeamProject().saveChkTeam(this.projectCate, this.chkTeam._id)
                this.refreshTeam = false
            } else {
                console.info('aaaaaaaaaaaaaaa')
                this.fun = this.getInitFun()
            }
            this.$forceUpdate()
        },



        //查询cos列表
        initCos(res) {
            if (res.hasOwnProperty("error")) {
                model.showModel('查询COS信息失败', res.error.Message, {
                    confirm: { text: '确定', funname: 'toSet' }
                })
                return
            } else {
                if (res.Buckets.length == 0) {
                    model.showModel('无COS信息, 您需要先创建才可以使用', '', {
                        confirm: { text: '创建', funname: 'toCos' },
                        cancel: { text: '取消', funname: 'hidDlg' }
                    })
                    return
                }
                this.buckets = res.Buckets

            }
        },
        toCos() {
            this.getShell().openExternal("https://console.cloud.tencent.com/cos");
        },

        getInitApigwDyPara() {
            return {
                name: '',
                position: 'PATH',
                required: true,
                type: 'String',
                defaultValue: '',
            }
        },

        //添加环境参数
        addApigwPara() {
            this.fun.inputs.events.apigw.parameters.endpoints[0].param.push(this.getInitApigwDyPara())
        },

        delApigwPara(inx) {
            this.fun.inputs.events.apigw.parameters.endpoints[0].param.splice(inx, 1)
        },
        //包含目录
        delinclude: function (inx) {
            this.fun.include.splice(inx, 1)
        },
        delexclude: function (inx) {
            this.fun.inputs.src.exclude.splice(inx, 1)
        },
        deploy: function () {
            var spawn = window.nodeRequire('child_process').spawn;
            free = spawn('serverless', ['--debug'], { cwd: "/Users/zhangtao/Documents/xiaochengxu/scfgui" });
            // 捕获标准输出并将其打印到控制台 
            free.stdout.on('data', function (data) {
                console.log('standard output:\n' + data);
            });
            // 捕获标准错误输出并将其打印到控制台 
            free.stderr.on('data', function (data) {
                console.log('standard error output:\n' + data);
            });
            // 注册子进程关闭事件 
            free.on('exit', function (code, signal) {
                console.log('child process eixt ,exit:' + code);
            });
            return
        },
        //生成添加scf配置文件
        addscf: function () {
            let title = '错误提示'
            let infos = []

            if (this.chkapifile == "") {
                err = true
                infos.push("请选择接口文件")
            }
            if (this.fun.inputs.name == "") {
                err = true
                infos.push("请选择接口函数")
            }

            if (this.fun.inputs.timeout == 0 || this.fun.inputs.timeout == "") {
                err = true
                infos.push("超时秒数至少为1")
            }

            if (this.event == "timer") {
                err = true
                if (this.fun.inputs.events.timer.parameters.name == "") {
                    infos.push("请填写触发器名字")
                }
            } else if (this.event == "api") {
                err = true

                if (this.fun.inputs.events.apigw.parameters.serviceId == "") {
                    err = true
                    infos.push('您尚未配置API网关服务信息')
                }
                if (this.fun.inputs.events.apigw.parameters.protocols.length == 0) {
                    err = true
                    infos.push('您尚未配置API网关的前端请求类型')
                }

                if (this.fun.inputs.events.apigw.parameters.endpoints.length == 0) {
                    err = true
                    infos.push('您尚未配置完善API网关')
                }
                if (this.fun.inputs.events.apigw.parameters.endpoints[0].path == '') {
                    err = true
                    infos.push('您尚未配置API网关的固定路径部分')
                }
                if (this.apigw.apitype == "dynamic") {
                    let dys = this.fun.inputs.events.apigw.parameters.endpoints[0].param
                    for (let dy of dys) {
                        if (dy.name == '') {
                            infos.push('可变路径名字不能为空')
                            break
                        }
                        if (dy.required == 'FALSE' && dy.defaultValue == '') {
                            infos.push('可变路径的默认值不能为空')
                            break
                        }
                    }
                }
            }
            if (infos.length > 0) {
                model.showModel('表单异常', infos.join('<br>'), {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }

            let yml = this.formatFunToYml()
            let data = ipcRenderer.sendSync('synchronous-message', { type: 'writefile', filetype: 'yml', yml: yml });

            this.isSubmitCloud = true
            this.submitToCloud(yml)

        },

        submitToCloud(yml) {
            let file = ''
            for (let a of this.apifiles) {
                if (a.name == this.chkapifile) {
                    file = a.file
                }
            }

            let post = {
                file: file,
                modelCode: this.modelCode,
                teamId: this.chkTeam._id,
                yml: yml,
                account: scfnet.getLoginUser().accountmail,
                code: scfnet.getLoginUser().code,
                nameSpace: yml.inputs.namespace
            }
            let that = this
            ipcRenderer.once('savefunctionend', (event, arg) => {
                arg = JSON.parse(arg)
                let title = ''
                let info = ''
                if (arg.errorCode == 0) {
                    title = '提交成功'
                    info = arg.data
                } else {
                    title = '提交失败'
                    info = arg.errorMessage
                }

                model.showModel(title, info, {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                that.isSubmitCloud = false
            })
            console.info(post)
            ipcRenderer.send('asynchronous-message',
                { type: 'net', post: post, cate: 'savefunction' })
        },

        getCorn() {
            if (this.timergw.type == 'fix') {
                let sec = 0
                let time = this.apigwtime.split(':')
                let min = parseInt(time[1])
                let hour = parseInt(time[0])
                if (time.length == 3) {
                    sec = parseInt(time[2])
                }
                if (this.apigwtype == 'day') {
                    return `${sec} ${min} ${hour} * * * *`
                } else if (this.apigwtype == 'week') {
                    let week = this.timergw.week.join(',')
                    return `${sec} ${min} ${hour} * * ${week} *`
                } else if (this.apigwtype == 'month') {
                    let txt = $('#rangeSliderAmount2').text().replaceAll(' ', '')
                    return `${sec} ${min} ${hour} ${txt} * * *`
                }
            } else if (this.timergw.type == 'cir') {
                let type = this.timergw.cir.type
                let num = parseInt(this.timergw.cir.cirNumber)
                if (type == "day") {
                    return `0 0 0 */${num} * * *num`
                } else if (type == "hour") {
                    return `0 0 */${num} * * * *`
                } else if (type == "min") {
                    return `0 */${num} * * * * *`
                } else if (type == "sec") {
                    return `*/${num} * * * * * *`
                }
            } else if (this.timergw.type == 'cus') {
                return this.timergw.rule
            }


            return ''
        },

        /**
         * @description: 将数据更改为yml的sls格式化数据
         * @param {*}
         * @return {*}
         */
        formatFunToYml() {
            let yml = JSON.parse(JSON.stringify(this.fun))
            // console.info(JSON.parse(JSON.stringify(yml)))
            yml.name = this.fun.inputs.name
            let ex = false
            //环境变量
            if (this.environment[0].name.trim() != '') {
                let envs = {}
                for (let env of this.environment) {
                    if (env.name.trim() != '' && env.val.trim() != '') {
                        envs[env.name.trim()] = env.val.trim()
                        ex = true
                    }
                }
                if (ex) {
                    yml.inputs.environment = {
                        variables: envs
                    }
                }
            }

            //标签
            if (this.tags[0].name.trim() != '') {
                let tmps = {}
                ex = false
                for (let tag of this.tags) {
                    if (tag.name.trim() != '' && tag.val.trim() != '') {
                        ex = true
                        tmps[tag.name.trim()] = tag.val.trim()
                    }
                }
                if (ex) {
                    yml.inputs.tags = tmps

                }
            }
            //业务模块转为标签
            if (this.modelCode != '') {
                if (yml.inputs.hasOwnProperty('tags')) {
                    yml.inputs.tags.modelcode = this.modelCode
                } else {
                    yml.inputs.tags = { modelcode: this.modelCode }
                }
            }

            if (yml.inputs.src.exclude.length > 0) {
                for (let i = 0; i < yml.inputs.src.exclude.length; ++i) {
                    yml.inputs.src.exclude[i] = yml.inputs.src.exclude[i] + "/**"
                }
            }

            //剔除未设置的层信息
            if (yml.inputs.layers[0].name == '') {
                delete yml.inputs.layers
            }
            //剔除未设置的vpc
            if (this.showvpc == 'close') {
                delete yml.inputs.vpcConfig
            }

            switch (this.event) {
                case 'api':
                    //动态路径
                    if (!this.isShowDyPara) {
                        delete yml.inputs.events.apigw.parameters.endpoints[0].param
                    } else {
                        let tmppath = yml.inputs.events.apigw.parameters.endpoints[0].path
                        if (tmppath[tmppath.length - 1] == '/') {
                            tmppath = tmppath.substring(0, tmppath.length - 1)
                        }
                        for (let dp of yml.inputs.events.apigw.parameters.endpoints[0].param) {
                            tmppath += "/{" + dp.name + "}"
                        }
                        yml.inputs.events.apigw.parameters.endpoints[0].path = tmppath
                    }
                    //API网关名称赋值
                    for (let agw of this.chkTeam.project.apiGateways) {
                        if (agw.ServiceId == yml.inputs.events.apigw.parameters.serviceId) {
                            yml.inputs.events.apigw.parameters.serviceName = agw.ServiceName
                        }
                    }

                    yml.inputs.events = [
                        { apigw: yml.inputs.events.apigw }
                    ]

                    yml.inputs.events
                    break;
                case 'timer':
                    //公式

                    this.fun.inputs.events.timer.parameters.cronExpression = this.getCorn()
                    yml.inputs.events.timer.parameters.cronExpression = this.getCorn()
                    yml.inputs.events = [
                        { timer: yml.inputs.events.timer }
                    ]
                    break;
                case 'cos':
                    yml.inputs.events = [
                        { cos: yml.inputs.events.cos }
                    ]
                    break;
                default:
                    delete yml.inputs.events
            }

            yml.inputs.handler = this.chkapifile + "." + yml.inputs.name
            return yml
        },



        toDeploy() {
            window.location.href = "./listfunction.html"
        },

        reLoad() {
            window.location.reload()
        },


        //删除标签
        deltag: function (inx) {
            if (this.tags.length == 1) {
                this.tags = [{ name: "", val: "" }]
            } else {
                this.tags.splice(inx, 1)
            }
        },
        //添加标签
        addtag: function () {
            this.tags.push({ name: "", val: "" })
        },

        /**
         * 删除环境变量
         * @param {*} inx 
         */
        delenv: function (inx) {
            if (this.environment.length == 1) {
                this.environment = [{ name: "", val: "" }]
            } else {
                this.environment.splice(inx, 1)
            }
        },

        /**
         * 添加环境变量
         */
        addenv: function () {
            console.info("add")
            this.environment.push({ name: "", val: "" })
        },
        /**
         * 检索接口文件和接口函数
         */
        listapifile: function () {
            console.info('listapifile')
            this.apifiles = []
            //Java8 Golang1 不自动解析
            if (this.fun.inputs.runtime == "Golang1" || this.fun.inputs.runtime == "Java8") {
                return
            }
            this.apifiles = []
            let path = this.fun.inputs.src.src
            const dir = fs.readdirSync(path);
            // var word = /php.*/i
            if (/php.*/i.test(this.fun.inputs.runtime)) {
                console.info('php')
                this.getphpfunctions(dir)
            }else if (/nodejs.*/i.test(this.fun.inputs.runtime)) {
                console.info('nodejs')
                this.getNodeFunctions(dir)
            }else if (/python.*/i.test(this.fun.inputs.runtime)) {
                this.getPyFunctions(dir)
            }else{
                model.showModel('暂不支持的语言', '当前仅支持PHP、NODEJS和PYTHON', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
            }
            
             // for (filename of dir) {
                //     let myRe = /(.*)(\.php)/;
                //     let myArray = myRe.exec(filename);
                //     if (myArray != null) {
                //         let tmp = filename
                //         fs.readFile(path + "/" + tmp, 'utf8', (err, data) => {
                //             this.getphpfunctions(tmp, data, myArray[1])
                //         });
                //     }
                // }
        },

        parseJsFun(line) {
            let mts = [...line.matchAll(/([\w$]+).+\)\s*{/g)]
            let funs = []
            for (let mt of mts) {
                let tmp = mt[1].toLowerCase()
                if (!this.jsKeys.includes(tmp)) {
                    funs.push(tmp)
                }
            }
            return funs
        },

        parsePhpFun(line) {
            let mts = [...line.matchAll(/\s+function\s+(\w+)\s*\(.*|\s*\)\s*{/g)]
            let funs = []
            console.info(mts)
            for (let mt of mts) {
                if(mt[1]==undefined){
                    continue;
                }
                let tmp = mt[1].toLowerCase()
                if (!this.jsKeys.includes(tmp)) {
                    funs.push(tmp)
                }
            }
            return funs
        },

        parsePyFun(line) {
            let mts = [...line.matchAll(/def\s+(\w+)\(/g)]
            let funs = []
            for (let mt of mts) {
                if(mt[1]==undefined){
                    continue;
                }
                let tmp = mt[1].toLowerCase()
                if (!this.jsKeys.includes(tmp)) {
                    funs.push(tmp)
                }
            }
            return funs
        },

        getNodeFunctions(dir) {
            for (filename of dir) {
                let myRe = /(.*)(\.js$)/i;
                let myArray = myRe.exec(filename);
                if (myArray != null) {
                    try {
                        fs.accessSync(this.fun.inputs.src.src+'/'+filename, fs.constants.R_OK)
                        let ffs = this.parseJsFun(fs.readFileSync(this.fun.inputs.src.src+'/'+filename, 'utf8'))
                        this.apifiles.push({ file: filename, name: myArray[1], function: ffs })
                    } catch (err) {
                        console.error(err);
                    }
                }
            }
        },

        getphpfunctions: function (dir) {
            for (filename of dir) {
                let myRe = /(.*)(\.php$)/i;
                let myArray = myRe.exec(filename);
                if (myArray != null) {
                    try {
                        let path = this.fun.inputs.src.src+'/'+filename
                        fs.accessSync(path, fs.constants.R_OK)
                        let ffs = this.parsePhpFun(fs.readFileSync(path, 'utf8'))
                        this.apifiles.push({ file: filename, name: myArray[1], function: ffs })
                    } catch (err) {
                        console.error(err);
                    }
                }
            }
        },

        getPyFunctions: function (dir) {
            for (filename of dir) {
                let myRe = /(.*)(\.py$)/i;
                let myArray = myRe.exec(filename);
                if (myArray != null) {
                    try {
                        let path = this.fun.inputs.src.src+'/'+filename
                        fs.accessSync(path, fs.constants.R_OK)
                        let ffs = this.parsePyFun(fs.readFileSync(path, 'utf8'))
                        this.apifiles.push({ file: filename, name: myArray[1], function: ffs })
                    } catch (err) {
                        console.error(err);
                    }
                }
            }
        },

       

        addexclude: function () {
            let that = this
            ipcRenderer.once('endopendir', (event, arg) => {
                if (arg) {
                    let path = arg[0]
                    let ps = that.fun.inputs.src.exclude
                    let ex = false

                    if (path.indexOf(that.fun.inputs.src.src) != 0) {
                        model.showModel('排除目录错误', '只能选择代码目录的子目录', {
                            confirm: { text: '确定', funname: 'hidDlg' }
                        })
                        return
                    }
                    let tmp = path.replace(that.fun.inputs.src.src, "")

                    if (tmp[0] == "/" || tmp[0] == "\\") {
                        tmp = tmp.substring(1)
                    }
                    if (tmp == '') {
                        return
                    }

                    for (let i = 0; i < ps.length; ++i) {
                        if (ps[i] == tmp) {
                            return
                        }
                    }
                    that.fun.inputs.src.exclude.push(tmp)
                }
            })
            ipcRenderer.send('asynchronous-message', { type: 'opendir', defaultPath: that.fun.inputs.src.src })
            return


            let paths = dialog.showOpenDialogSync({
                properties: ['openDirectory']
            })
            let ps = this.fun.include
            let ex = false
            for (let i = 0; i < ps.length; ++i) {
                if (ps[i] == paths[0]) {
                    return
                }
            }
            if (paths[0].indexOf(this.fun.codeUri) != 0) {
                dialog.showErrorBox("错误", "只能选择代码目录的子目录")
                return
            }
            let tmp = paths[0].replace(this.fun.codeUri, "")
            if (tmp[0] == "/" || tmp[0] == "\\") {
                this.fun.exclude.push(tmp.substring(1))
            } else {
                this.fun.exclude.push(tmp)
            }

            // this.fun.exclude.push(paths[0])
        },
        addinclude: function () {
            let paths = dialog.showOpenDialogSync({
                properties: ['openDirectory']
            })
            let ps = this.fun.include
            let ex = false
            for (let i = 0; i < ps.length; ++i) {
                if (ps[i] == paths[0]) {
                    return
                }
            }
            this.fun.include.push(paths[0])
        },
        chosecodepath: function () {
            //that.fun.inputs.src.src
            let paths = dialog.showOpenDialogSync({
                properties: ['openDirectory']
            })
            this.fun.codeUri = paths[0]
        },

        dynamicfun(e) {
            eval('this.' + e.currentTarget.dataset.click + '()')
        },

        hidDlg() {
            model.hiddenModel()
        },

        listLayers() {
            let that = this
            if (scfnet == null) {
                scfnet = require("../scfnet");
            }

            scfnet.listLayers(this.getSCFSet(), function (data) {
                if (typeof (data) == 'string') {
                    return
                } else {
                    that.layers = data
                }
            }, {})
        },

        uiListLayerVersions(inx) {
            let layname = this.fun.inputs.layers[inx].name
            if (layname == '') {
                this.layerVersions = []
                return
            }
            console.info(layname)
            let that = this
            scfnet.listLayerVersions(this.getSCFSet(), layname, function (data) {
                if (typeof (data) == 'string') {
                    model.showModel('查询层版本', data, {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                    return
                }
                if (data.length > 0) {
                    that.chkLayers[inx].vers = data
                    that.fun.inputs.layers[inx].version = data[0].LayerVersion
                } else {
                    that.chkLayers[inx].vers = []
                    that.fun.inputs.layers[inx].version = ''
                }
                // that.$forceUpdate()
            })
        },

        /**
         * 添加层
         */
        addLayer() {
            this.fun.inputs.layers.push({ name: '', version: '' })
            this.chkLayers.push({ vers: [{ LayerVersion: '' }] })
        },

        /**
         * 删除层
         * @param {*} inx 
         */
        delLayer: function (inx) {
            if (this.fun.inputs.layers.length == 1) {
                this.fun.inputs.layers = [{ name: "", version: "" }]
            } else {
                this.fun.inputs.layers.splice(inx, 1)
            }
        },
    }
})

