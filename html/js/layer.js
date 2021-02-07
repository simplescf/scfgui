var cos = null;
var scfnet = null;
var  ipcRenderer = require('electron').ipcRenderer;
var model = null;
var teamProject = null;

let app = new Vue({
    el: '#main',
    data: {
        loading: true,
        //现有层信息
        layers: [],
        chkLayer: {},
        //新增层信息
        addLayer: {
            layerName: '',
            description: '',
            dir: '',
            runtimes: [],
            //cos上传状态
            cosshow: false,
            //layer提交状态
            isadding: false
        },

        //cos上传进度信息
        upLayerprogs: { loaded: '', speed: '', cosshow: false, cosisfin: false },

        //页面上新增版本邦洞form
        addVersion: {
            layerName: '',
            description: '',
            dir: '',
            runtimes: [],
            //layer提交状态
            isadding: false
        },
        //cos上传进度信息
        upVerProgs: { loaded: '', speed: '', cosshow: false, cosisfin: false },


        //UI现有版本信息
        layerversions: [],

        //是否显示层版本
        showver: false,
        showaddver: false,

        //全部配置文件中的项目信息
        projects: {},
        //当前选中的项目
        chkProject: {},

        //删除信息
        delLayer: '',
        delVersion: 0,

        teams: [],
        projectCate: '',
        refreshTeam: false,
        chkTeam: {},
        chkTeamId:'',
        loadPros:false,
        loadFuns:false,

        canEdit:false,
        loadLayer:false
    },
    watch: {
        'addLayer.runtimes': function (newVal, oldVal) {
            console.info(newVal, oldVal)
            if (newVal.length > 5) {
                this.getModel().showModel('选择运行环境过多', '同时最多支持5个语言', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
            }
        }
    },
    created: function () {
        //初始化"更新代码"功能中存放函数代码的bucket
        
    },
    mounted: function () {
        this.loading = false
        $("#main").on("click", ".dlginfobtn", this.dynamicfun);

        this.getModel().initNav('layer')

        // $.HSCore.components.HSHeaderSide.init($('#js-header'));

        // const { width, height } = screen.getPrimaryDisplay().workAreaSize
        // ;
        this.init()

    },
    methods: {
        getCos(){
            if(cos==null){
                cos = require("../qcloud/cos.js")
            }
            return cos
        },

        getScfnet(){
            if(scfnet == null){
                scfnet = require("../scfnet");
            }
            return scfnet
        },

        getModel(){
            if(model == null){
                model = require("./js/model");
            }
            return model
        },

        getTeamProject(){
            if(teamProject == null){
                teamProject = require("./js/teamProject")
            }
            return teamProject
        },


        uiRefreshTeam() {
            // this.chkTeam = { project: { } }
            let that = this
            this.refreshTeam = true
            this.getTeamProject().regFlushProjectFin(() => {
                that.refreshTeam = false
                teamProject.regFlushProjectFin(null)
                that.changeProjectCate()
                // that.changechkproject(that.chkTeam._id)
            })
            this.getTeamProject().flushAllProject()
        },

        uiChangeTeam() {
            this.changechkproject(this.chkTeamId)
        },

        uiChangeCate(){
            let that = this
            
            if(this.projectCate==''){
                this.initUI()
                return
            }
            this.loadPros = true
            if(teamProject==null){
                setTimeout(() => {
                    that.changeProjectCate()
                }, 500);
            }else{
                this.changeProjectCate()
            }
            
        },
        /**
         * 切换项目类型列表
         */
        changeProjectCate() {
            

            this.loadPros = true
            this.teams = this.getTeamProject().getSpecProjects(this.projectCate)
            if (this.teams.length == 0) {
                this.loadPros = false
                this.initUI()
                this.getModel().showModel('您无该类型项目', '', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }

            //获取被选中的项目
            let ex = false
            let teamid = this.chkTeamId
            for (team of this.teams) {
                if (team._id == teamid) {
                    ex = true
                }
            }
            if (!ex) {
                teamid = this.teams[0]._id
            }
            this.loadPros = false
            this.changechkproject(teamid)
        },


        changechkproject(teamid) {
            this.layers = []
            this.showver = false
            this.chkLayer = {}
            this.canEdit = false
            
            let val = this.getTeamProject().valTeam(teamid, this.projectCate)
            this.chkTeamId = teamid
            if(val===false){
                this.canEdit = false
                for (let tmpteam of this.getTeamProject().getSpecProjects(this.projectCate)) {
                    if (tmpteam._id == teamid) {
                        this.chkTeam = tmpteam
                        break
                    }
                }
                return
            }
            this.chkTeam = val
            this.canEdit = true
            this.loadLayer = true
            this.getScfnet().listLayers(this.getSCFSet(), this.initLayers, this.errDlg)
        },

        initUI(){
            this.loadPros = false
            this.teams = []
            this.layers = []
            this.showver = false
            this.chkLayer = {}
        },

        toSet() {
            window.location.href = "./set.html"
        },

        getSCFSet() {
            
            return {
                id: this.chkTeam.project.secretId,
                key: this.chkTeam.project.secretKey,
                region: this.chkTeam.project.region
            }
        },

        
        init() {
            let that = this
           
            // that.getCos().initCodeBucket()
            return

            if(teamProject==null){
                setTimeout(() => {
                    that.changeProjectCate()
                    that.showver = false
                    that.getCos().initCodeBucket()
                }, 1000);
            }else{
                this.changeProjectCate()
            }   
        },

        initLayers(layers) {
            for (let i = 0; i < layers.length; ++i) {
                layers[i].layerName = layers[i].LayerName
                for (const runtime of layers[i].CompatibleRuntimes) {
                    if (runtime.match(/^php/im)) {
                        layers[i].isphp = true
                    } else if (runtime.match(/^python/im)) {
                        layers[i].ispython = true
                    } else if (runtime.match(/^nodejs/im)) {
                        layers[i].isnodejs = true
                    } else if (runtime.match(/^java/im)) {
                        layers[i].isjava = true
                    } else if (runtime.match(/^go/im)) {
                        layers[i].isgo = true
                    }
                }
            }
            this.layers = layers
            this.loadLayer = false
        },

        errDlg(info) {
            this.loadLayer = false
        },

        uiShowAddVer() {
            this.showaddver = true
        },
        /**
         * 选择发布层的目录
         */
        uiAddLayerDir(cate) {
            let that = this
            ipcRenderer.once('endopendir', (event, arg) => {
                if (arg) {
                    if (cate == 'ver') {
                        that.addVersion.dir = arg[0]
                    } else {
                        that.addLayer.dir = arg[0]
                    }
                } else {
                    if (that.addLayer.dir == '') {
                        this.getModel().showModel('选择发布为层的文件夹', '必须选择一个文件夹', {
                            confirm: { text: '确定', funname: 'hidDlg' }
                        })
                    }
                }
            })

            ipcRenderer.send('asynchronous-message', {
                type: 'opendir',
            })
        },

        /**
         * 查看layer下的版本
         */
        uiListVersion(name) {
            let that = this
            let inx = 0
            for (let i = 0; i < this.layers.length; ++i) {
                if (this.layers[i].layerName == name) {
                    inx = i
                    this.layers[i].islistver = true
                    this.layers[i].chk = true
                    this.chkLayer = this.layers[i]
                } else {
                    this.layers[i].chk = false
                }
            }

            this.getScfnet().listLayerVersions(this.getSCFSet(), name, function (res) {
                that.showver = true
                that.layers[inx].islistver = false
                console.info(res)
                let tmps = res
                for (let i = 0; i < tmps.length; ++i) {
                    tmps[i].Description = tmps[i].Description.split("\n")
                    tmps[i].layerName = tmps[i].LayerName
                }
                that.layerversions = tmps
            }, function (errinfo) {
                that.layers[inx].islistver = false
                this.getModel().showModel('查看层版本错误', errinfo, {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
            })
        },

        uiDelLayer(layer) {
            this.delLayer = layer
            this.delVersion = 0
            this.getModel().showModel('您要删除层"' + layer + '"吗?', '该层下的版本会全部删除<br>删除后无法恢复', {
                confirm: { text: '不删除', funname: 'hidDlg' },
                cancel: { text: '确定删除', funname: 'delLayerVer' }
            })
        },

        uiDelLayerVer(layer, ver) {
            console.info('uiDelLayerVer')
            this.delLayer = layer
            this.delVersion = ver
            this.getModel().showModel('您要删除层"' + layer + '"下的版本' + ver + '吗?', '删除后无法恢复', {
                confirm: { text: '不删除', funname: 'hidDlg' },
                cancel: { text: '确定删除', funname: 'delLayerVer' }
            })
        },

        /**
         * 删除版本
         */
        delLayerVer() {
            this.hidDlg()
            let vers = []
            if (this.delVersion == 0) {
                for (let ver of this.layerversions) {
                    vers.push(ver.LayerVersion)
                }
            } else {
                vers.push(this.delVersion)
            }
            this.showDelUI()
            let that = this

            for (let ver of vers) {
                this.getScfnet().delLayerVersion(this.getSCFSet(), this.delLayer, ver, function (res) {
                    if (that.delVersion == 0 || that.layerversions.length == 1) {
                        that.init()
                    } else {
                        that.uiListVersion(that.delLayer)
                    }
                }, function (errinfo) {
                    this.getModel().showModel('删除版本失败', errinfo, {
                        confirm: { text: '确定', funname: 'hidDlg' },
                    })
                })
            }

        },

        /**
         * 删除层版本的动态效果
         */
        showDelUI() {
            if (this.delVersion == 0) {
                for (let i = 0; i < this.layers.length; ++i) {
                    this.layers[i].isloading = false
                    if (this.layers[i].LayerName == this.delLayer) {
                        this.layers[i].isloading = true
                    }
                }
            } else {
                for (let i = 0; i < this.layerversions.length; ++i) {
                    this.layerversions[i].isloading = false
                    if (this.layerversions[i].LayerVersion == this.delVersion) {
                        this.layerversions[i].isloading = true
                    }
                }
            }
        },

        uiBeginSubmit(cate){
            let that = this
            this.getCos().getBuckName(this.getSCFSet(), (data)=>{
                console.info(data)
                if(typeof data=='string'){
                    that.getModel().showModel('存储桶异常', data, {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                    return
                }
                that.scfBucketName = data.name
                that.uiSubmitLayer(cate)
            })
        },

        /**
         * 提交新增新层表单
         */
        uiSubmitLayer(cate) {
            let form = this.addLayer
            if (cate == 'ver') {
                form = this.addVersion
                form.layerName = this.layerversions[0].LayerName
                this.addVersion.layerName = this.layerversions[0].LayerName
            }
            //校验
            if (!this.valSubmit(cate, form)) {
                return
            }

            let that = this
            form.isadding = true
            //打包
            if (cate == 'ver') {
                this.upVerProgs.iszip = true
            } else {
                this.upLayerprogs.iszip = true
            }

            this.getCos().zipDir(form.dir,  (issuc, info)=> {
                that.upVerProgs.iszip = false
                that.upLayerprogs.iszip = false

                if (!issuc) {
                    that.addVersion.isadding = false
                    that.addLayer.isadding = false
                    that.getModel().showModel('压缩文件夹失败', info, {
                        confirm: { text: '确定', funname: 'hidDlg' }
                    })
                    return
                }
                //上传
                let progfun = {}
                let deployfun = {}

                if (cate == 'ver') {
                    that.upVerProgs.cosshow = true
                    progfun = that.progVerCos
                    deployfun = that.deployVersion
                } else {
                    that.upLayerprogs.cosshow = true
                    progfun = that.progLayerCos
                    deployfun = that.deployLayer
                }
                
                let tmp = that.getSCFSet()
                tmp.bucket = that.scfBucketName
                that.getCos().uploadFile(tmp, info, 'layercode.zip', deployfun, progfun,
                    function (res) {
                        that.addVersion.isadding = false
                        that.addLayer.isadding = false
                        that.getModel().showModel('上传失败', res, {
                            confirm: { text: '确定', funname: 'hidDlg' }
                        })
                    })

            })
        },

        /**
         * 发布层/版本验证
         */
        valSubmit(cate, form) {
            let errinfo = ''
            if (form.layerName == '') {
                errinfo += '新增名称不能为空<br>'
            }
            if (!RegExp('[a-z]|[A-Z]|[0-9]|-|_').test(form.layerName)) {
                errinfo += '名称不合法'
            }

            if (form.description == '') {
                errinfo += '新增描述不能为空<br>'
            }
            if (form.runtimes.length == 0) {
                errinfo += '新增运行环境不能为空<br>'
            }
            if (form.runtimes.length > 5) {
                errinfo += '运行环境最多为五个<br>'
            }

            if (errinfo != '') {
                let title = '新增层提示'
                if (cate == 'ver') {
                    title = '新增版本提示'
                }
                this.getModel().showModel(title, errinfo, {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return false
            }
            return true
        },

        /**
         * 上传层文件到COS进度
         */
        progLayerCos(pros) {
            console.info(pros)
            this.upLayerprogs.speed = (pros.speed / 1024 / 1024).toFixed(3)
            this.upLayerprogs.loaded = (pros.loaded / 1024 / 1024).toFixed(3)
        },

        /**
         * 上传版本文件到COS进度
         */
        progVerCos(pros) {
            this.upVerProgs.speed = (pros.speed / 1024 / 1024).toFixed(3)
            this.upVerProgs.loaded = (pros.loaded / 1024 / 1024).toFixed(3)
        },

        /**
         * 发布层
         * @param {str} zip  zip压缩包cos中的名字
         */
        deployLayer(zip) {
            this.addVersion.isadding = false
            this.addLayer.isadding = false
            this.publicLayer(zip, 'layer')
        },

        /**
         * 发布版本
         * @param {str} zip  zip压缩包cos中的名字
         */
        deployVersion(zip) {
            this.addVersion.isadding = false
            this.addLayer.isadding = false
            this.publicLayer(zip, 'ver')
        },

        /**
         * 新增层信息
         */
        publicLayer(zip, cate) {
            this.upLayerprogs.cosisfin = true
            this.upVerProgs.cosisfin = true

            let tmp = this.addLayer
            if (cate == 'ver') {
                tmp = this.addVersion
            }
            tmp.zip = zip
            
            
            let that = this
            let bukset = this.getSCFSet()
            bukset.bucket = this.getCos().getCodeBucketNameNoId()

            this.getScfnet().publicLayer(bukset, tmp, function (res) {
                that.getModel().showModel('发布成功', '', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                let tmpinit = {
                    layerName: '',
                    description: '',
                    dir: '',
                    runtimes: [],
                    cosshow: false,
                    isadding: false
                }
                if (cate == 'ver') {
                    that.uiListVersion(that.addVersion.layerName)
                    that.addVersion = tmpinit
                    that.showaddver = false
                    that.upVerProgs.cosshow = false
                } else {
                    that.upLayerprogs.cosshow = false
                    that.addLayer = tmpinit
                    that.init()
                }
            }, function (res) {
                //发布失败
                that.addVersion.isadding = false
                that.addLayer.isadding = false
                this.getModel().showModel('发布失败', res, {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
            })
        },

        choseruntime(e) {
            console.info(e)
        },

        dynamicfun(e) {
            eval('this.' + e.currentTarget.dataset.click + '()')
        },
        hidDlg() {
            console.info('hidDlg')
            this.getModel().hiddenModel()
        },
    }
})

