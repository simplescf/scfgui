var scfnet = null;
var model = require("./js/model");
var teamProject = null


let app = new Vue({
    el: '#main',
    data: {

        projects: [],
        chkProject: {},

        loading: true,

        //检索条件中的命名空间和函数名
        namespaces: [],
        functions: [],

        //图表展示
        showChart: true,

        /**
         * 查询条件
         */
        queryCon: {
            //日志偏移量
            offset: 0,
            retCode: "",
            namespace: "",
            functionName: "",
            startTime: "",
            endTime: "",
            keyword: "",
            functionRequestId: "",
            //当前时间
            nowTime: "",
            //能查询日志的最远日期
            lastTime: "",
            //该条件下所有日志数量
            totalCount: 0,
            loading: false,
            limit: 40,
            //加载进度条是否显示为动态
            showProAnimated: true,

            stop: false
        },

        //查询出的scf日志列表
        scfLogs: [],
        //展示的日志信息
        showLog: [],
        //日志显示进度
        perLog: 0,
        //日志条数信息
        logCount: {
            total: 0,
            show: 0
        },

        //查询命名空间
        loadNS: false,
        //查询命名空间下函数
        loadFN: false,

        //图表展示需要的函数列表
        charFunctions: [],

        //函数执行时间曲线图
        timelineEChat: {},

        //切换项目
        teams: [],
        projectCate: 'persion',
        refreshTeam: false,
        chkTeam: {},
        chkTeamId:'',

        hidChart:true,

    },
    created: function () {
        this.init()
    },
    mounted: function () {
        this.loading = false
        this.initEChart()
        // this.initAllLog()

        $("#stoplog").tooltip({
            content: "停止拉取日志"
        });
        $("#continuelog").tooltip({
            content: "继续拉取日志"
        });

        $("#main").on("click", ".dlginfobtn", this.dynamicfun);
        model.initNav('chart')
        $.HSCore.components.HSHeaderSide.init($('#js-header'));
    },

   

    methods: {
        getScfnet(){
            if(scfnet==null){
                scfnet = require("../scfnet")
            }
            return scfnet
        },

        getTeamProject(){
            if(teamProject==null){
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
                that.getTeamProject().regFlushProjectFin(null)
                that.changeProjectCate()
                // that.changechkproject(that.chkTeam._id)
            })
            this.getTeamProject().flushAllProject()
        },

        uiChangeTeam() {
            this.changechkproject(this.chkTeamId)
        },

        /**
         * 切换项目类型列表
         */
        changeProjectCate() {            
            this.teams = this.getTeamProject().getSpecProjects(this.projectCate)
            if (this.teams.length == 0) {
                this.canEdit = false
                model.showModel('您无该类型项目', '', {
                    confirm: { text: '确定', funname: 'hidDlg' }
                })
                return
            }

            //获取被选中的项目
            let teamid = ''
            if(this.chkTeam==null){
                teamid = this.teams[0]._id
            }else{
                teamid = this.chkTeam._id
            }

            if(!this.teams.some((ele)=>ele._id==teamid)){
                teamid = this.teams[0]._id
            }

            console.info('chkTeam', teamid)
            this.changechkproject(teamid)
        },


        changechkproject(teamid) {
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
            console.info('this.chkTeam1', val)
            this.getTeamProject().saveChkTeam(this.projectCate, this.chkTeam._id)
            this.flushNameSpace()
        },

        toSet() {
            window.location.href = "./set.html"
        },

        getSCFSet(){
            return {
                id: this.chkTeam.project.secretId,
                key: this.chkTeam.project.secretKey,
                region: this.chkTeam.project.region
            }
        },

        /**
         * 加载函数执行日志
         */
        initAllLog() {
            if (this.queryCon.stop) {
                return
            }
            //首次查询显示加载UI
            if (this.queryCon.offset == 0) {
                this.queryCon.loading = true
            }

            this.getScfnet().getFunctionLogs(this.getSCFSet(), this.queryCon, this.finAllLog)
        },

        /**
         * 查询日志完毕
         * @param {*} res 
         */
        finAllLog(res) {
            //查词查询完毕,因此隐藏加载UI
            if (this.queryCon.offset == 0) {
                this.queryCon.loading = false
            }

            //把查询出的函数加入图表信息
            this.addFunction(res.Data)
            //刷新"函数执行时间曲线图"
            this.flushTimeline()
            this.flushTotalTime()
            this.flushAvgTime()
            this.flushCountTime()
            this.flushOneTime()


            if (res.TotalCount > this.queryCon.offset && res.Data.length > 0) {
                this.queryCon.offset = this.queryCon.offset + res.Data.length
                let tmp = parseInt((this.queryCon.offset / res.TotalCount) * 100)
                if (tmp >= 100) {
                    tmp = 100
                    this.queryCon.stop = true
                }
                this.perLog = tmp
                this.logCount.total = res.TotalCount
                this.logCount.show = this.queryCon.offset

                this.initAllLog()
            } else {
                this.queryCon.stop = false
            }

        },
        /**
         * 终止拉取日志
         */
        stopGetLog() {
            // this.queryCon.showProAnimated = false
            this.queryCon.loading = false
            this.queryCon.stop = true
            $("#stoplog").tooltip({
                content: "停止拉取日志"
            });
            $("#continuelog").tooltip({
                content: "继续拉取日志"
            });
        },

        continueGetLog() {
            // this.queryCon.showProAnimated = true
            this.queryCon.loading = true
            this.queryCon.stop = false
            this.initAllLog()
            $("#stoplog").tooltip({
                content: "停止拉取日志"
            });
            $("#continuelog").tooltip({
                content: "继续拉取日志"
            });
        },

        /**
         * 初始化各个图表
         */
        initEChart() {
            let that = this

            //单个函数执行时间曲线图
            this.timelineEChat = echarts.init(document.getElementById('timeline'), "light");
            this.timelineEChat.setOption({
                title: {
                    text: '单个函数执行时间曲线图'
                },
                tooltip: {
                    trigger: 'axis'
                },
                legend: {
                    type: 'scroll',
                    orient: 'vertical',
                    right: 10,
                    top: 20,
                    bottom: 20,
                    data: []
                },
                grid: {
                    left: '3%',
                    right: '10%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    data: []
                },
                yAxis: {
                    type: 'value'
                },
                series: []
            })
            this.timelineEChat.showLoading();


            // 函数总时间对比图
            this.totaltimeEChat = echarts.init(document.getElementById('totaltime'), "light");
            this.totaltimeEChat.setOption({
                title: {
                    text: '函数总执行时间对比图',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'item',
                    formatter: '{a} <br/>{b} : {c} ({d}%)'
                },
                legend: {
                    type: 'scroll',
                    orient: 'vertical',
                    right: 10,
                    top: 20,
                    bottom: 20,
                    data: []
                },
                series: [
                    {
                        name: '函数',
                        type: 'pie',
                        radius: '55%',
                        center: ['40%', '50%'],
                        data: [],
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        }
                    }
                ]
            })
            this.totaltimeEChat.showLoading();

            //函数平均时间对比图
            this.avgtimeEChat = echarts.init(document.getElementById('avgtime'), "light");
            this.avgtimeEChat.setOption({
                title: {
                    text: '函数平均执行时间对比图',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'item',
                    formatter: '{a} <br/>{b}: {c} ({d}%)'
                },
                legend: {
                    type: 'scroll',
                    orient: 'vertical',
                    left: 10,
                    top: 20,
                    bottom: 20,
                    data: []
                },
                series: [
                    {
                        name: '平均执行时间',
                        type: 'pie',
                        radius: ['50%', '70%'],
                        avoidLabelOverlap: false,
                        label: {
                            show: false,
                            position: 'center'
                        },
                        emphasis: {
                            label: {
                                show: true,
                                fontSize: '30',
                                fontWeight: 'bold'
                            }
                        },
                        labelLine: {
                            show: false
                        },
                        data: [
                        ]
                    }
                ]
            })
            this.avgtimeEChat.showLoading();

            //函数执行次数对比图
            this.counttimeEChat = echarts.init(document.getElementById('counttime'), "light");
            this.counttimeEChat.setOption({
                title: {
                    text: '执行次数对比图'
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {            // 坐标轴指示器，坐标轴触发有效
                        type: 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
                    }
                },
                legend: {
                    data: []
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    axisLabel: {
                        interval: 0,
                        rotate: 60
                    },
                    data: []

                },
                yAxis: {
                    type: 'value'
                },
                series: []
            })
            this.counttimeEChat.showLoading();
            //
            this.onetimeEChat = echarts.init(document.getElementById('onetime'), "light");
            this.onetimeEChat.setOption({
                title: {
                    text: '函数执行一次时间解析图'
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow'
                    }
                },
                legend: {
                    data: ['最大时间', '最小时间', '平均时间']
                },
                toolbox: {
                    show: true,
                    orient: 'vertical',
                    left: 'right',
                    top: 'center',
                    feature: {
                        mark: { show: true },
                        dataView: { show: true, readOnly: false },
                        magicType: { show: true, type: ['line', 'bar', 'stack', 'tiled'] },
                        restore: { show: true },
                        saveAsImage: { show: true }
                    }
                },
                xAxis: [
                    {
                        type: 'category',
                        axisTick: { show: false },
                        data: ['2012', '2013', '2014', '2015', '2016']
                    }
                ],
                yAxis: [
                    {
                        type: 'value'
                    }
                ],
                series: []
            })
            this.onetimeEChat.showLoading();

            setTimeout(() => {
                that.timelineEChat.resize()
                that.totaltimeEChat.resize()
                that.avgtimeEChat.resize()
                that.counttimeEChat.resize()
                that.onetimeEChat.resize()
            }, 200);
        },

        /**
         * 将查询出的函数日志信息格式化到统一的图表数据中
         * @param {*} funs 
         */
        addFunction(funs) {
            //functions
            for (let i = 0; i < funs.length; ++i) {
                let ex = -1
                for (let k = 0; k < this.charFunctions.length; ++k) {
                    if (this.charFunctions[k].name == funs[i].FunctionName) {
                        ex = k
                        break
                    }
                }
                let duration = parseInt(funs[i].Duration)
                let retError = 0
                let invokeError = 0
                let sscfError = 0
                let retOK = 0
                let memlen = this.getStrLength(funs[i].RetMsg)

                //	函数执行结果-失败
                if (funs[i].RetCode != 0) {
                    retError = 1
                } else if (funs[i].InvokeFinished != 1) {
                    //	函数调用是否结束
                    invokeError = 1
                } else if (funs[i].Log.indexOf("[ERROR]") != -1) {
                    //业务失败
                    sscfError = 1
                } else {
                    retOK = 1
                }

                if (ex == -1) {
                    let tmp = {
                        name: funs[i].FunctionName,
                        duration: [duration],
                        retError: retError,
                        retOK: retOK,
                        invokeError: invokeError,
                        sscfError: sscfError,
                        memLen: [memlen]
                    }
                    this.charFunctions.push(tmp)
                } else {
                    //函数执行结果-失败
                    this.charFunctions[ex].retError += retError
                    this.charFunctions[ex].invokeError += invokeError
                    this.charFunctions[ex].sscfError += sscfError
                    this.charFunctions[ex].retOK += retOK
                    this.charFunctions[ex].memLen.push(memlen)

                    this.charFunctions[ex].duration.push(duration)
                }
            }
            this.calTime()
        },
        /**
         * 计算执行时间
         */
        calTime() {
            for (let i = 0; i < this.charFunctions.length; ++i) {
                let min = this.charFunctions[i].duration[0]
                let max = this.charFunctions[i].duration[0]
                let total = 0
                for (let du of this.charFunctions[i].duration) {
                    if (du > max) {
                        max = du
                    }
                    if (du < min) {
                        min = du
                    }
                    total += du
                }
                this.charFunctions[i].minTime = min
                this.charFunctions[i].maxTime = max
                this.charFunctions[i].avgTime = parseInt(total / this.charFunctions[i].duration.length)
            }
        },

        /**
         * 函数执行时间曲线图
         */
        flushTimeline() {
            let legend = []
            let xAxis = []
            let series = []

            let inx = 1
            let max = 0
            for (let fn of this.charFunctions) {
                legend.push(fn.name)
                if (max < fn.duration.length) {
                    max = fn.duration.length
                }
                series.push({
                    name: fn.name,
                    type: 'line',
                    data: fn.duration
                })
                ++inx
            }
            //xAxis.push("第" + inx + "次")
            for (let i = 0; i < max; ++i) {
                xAxis.push(i + 1)
            }

            let opt = {
                legend: {
                    data: legend,
                    // selected: legend.selected,
                },
                xAxis: {
                    data: xAxis
                },
                series: series
            }
            // if(legend.length>0){
            this.timelineEChat.hideLoading()
            this.timelineEChat.setOption(opt)
            // }
            console.info("flushTimeline", opt)

        },

        /**
         * 函数总时间对比图
         */
        flushTotalTime() {
            let legend = []
            let series = []

            for (let fn of this.charFunctions) {
                legend.push(fn.name)
                let total = 0
                for (let k of fn.duration) {
                    total += k
                }
                series.push({
                    name: fn.name,
                    value: total
                })
            }
            console.info(legend, series)
            this.totaltimeEChat.hideLoading()
            if (legend.length == 0) {
                return
            }
            this.totaltimeEChat.setOption({
                legend: {
                    data: legend
                },
                series: [
                    {
                        data: series
                    }
                ]
            })

        },

        /**
         * 函数平均执行时间
         */
        flushAvgTime() {
            let legend = []
            let series = []

            for (let fn of this.charFunctions) {
                legend.push(fn.name)
                let total = 0
                for (let k of fn.duration) {
                    total += k
                }
                series.push({
                    name: fn.name,
                    value: total
                })
            }
            this.avgtimeEChat.hideLoading()
            if (legend.length == 0) {
                return
            }
            this.avgtimeEChat.setOption({
                legend: {
                    data: legend
                },
                series: [
                    {
                        data: series
                    }
                ]
            })

        },

        /**
         * 函数执行次数对比图
         */
        flushCountTime() {
            let legend = ["执行正常", "执行失败", "调用异常", "业务报警"]
            let series = [{
                name: '执行正常',
                type: 'bar',
                stack: '次数',
                label: {
                    show: true,
                    position: 'inside'
                },
                data: []
            }, {
                name: '执行失败',
                type: 'bar',
                stack: '次数',
                label: {
                    show: true,
                    position: 'inside'
                },
                data: []
            }, {
                name: '调用异常',
                type: 'bar',
                stack: '次数',
                label: {
                    show: true,
                    position: 'inside'
                },
                data: []
            }, {
                name: '业务报警',
                type: 'bar',
                stack: '次数',
                label: {
                    show: true,
                    position: 'inside'
                },
                data: []
            }]
            let xAxis = []

            for (let fn of this.charFunctions) {
                // if(fn.retError>0||fn.invokeError>0||fn.sscfError>0){
                xAxis.push(fn.name)
                series[0].data.push(fn.retOK)
                series[1].data.push(fn.retError)
                series[2].data.push(fn.invokeError)
                series[3].data.push(fn.sscfError)
                // }
            }
            this.counttimeEChat.hideLoading()

            if (xAxis.length == 0) {
                return
            }

            this.counttimeEChat.setOption({
                legend: {
                    data: legend
                },
                xAxis: {
                    data: xAxis
                },
                series: series
            })
        },

        flushOneTime() {
            let labelOption = {
                show: true,
                position: "insideBottom",
                distance: 10,
                align: "left",
                verticalAlign: "middle",
                rotate: 90,
                formatter: '{c}  {name|{a}}',
                fontSize: 16,
                rich: {
                    name: {
                        textBorderColor: '#fff'
                    }
                }
            };


            let xAxis = []
            let series = [
                {
                    name: '最大时间',
                    type: 'bar',
                    barGap: 0,
                    label: labelOption,
                    data: []
                },
                {
                    name: '最小时间',
                    type: 'bar',
                    barGap: 0,
                    label: labelOption,
                    data: []
                }, {
                    name: '平均时间',
                    type: 'bar',
                    barGap: 0,
                    label: labelOption,
                    data: []
                }
            ]
            for (let fn of this.charFunctions) {
                xAxis.push(fn.name)
                series[0].data.push(fn.maxTime)
                series[1].data.push(fn.minTime)
                series[2].data.push(fn.avgTime)
            }

            this.onetimeEChat.hideLoading()

            if (xAxis.length == 0) {
                return
            }

            this.onetimeEChat.setOption({

                legend: {
                    data: ['最大时间', '最小时间', '平均时间']
                },

                xAxis: [
                    {
                        data: xAxis
                    }
                ],
                series: series
            })
        },


        getStrLength(str) {
            return str.replace(/[\u0391-\uFFE5]/g, "aa").length
        },

     



        /**
         * 修改起始时间
         */
        changeStartTime() {
            console.info(this.queryCon.startTime)
            if (this.queryCon.startTime == "") {
                // this.queryCon.startTime = ""
                this.queryCon.endTime = ""
                return
            }
            let date = new Date(this.queryCon.startTime).getTime();
            let nextd = new Date(date + 1000 * 60 * 60 * 24)
            let fd = this.getInputTime(nextd.getFullYear(), nextd.getMonth() + 1, nextd.getDate(), nextd.getHours(), nextd.getMinutes())
            console.info(fd)
            this.queryCon.endTime = fd
            this.queryCon.startTime += ":00"
        },

        /**
         * 修改终止时间
         */
        changeEndTime() {
            console.info(this.queryCon.endTime)
            if (this.queryCon.endTime == "") {
                this.queryCon.startTime = ""
                // this.queryCon.endTime = ""
                return
            }
            let date = new Date(this.queryCon.endTime).getTime();
            let nextd = new Date(date - 1000 * 60 * 60 * 24)
            let fd = this.getInputTime(nextd.getFullYear(), nextd.getMonth() + 1, nextd.getDate(), nextd.getHours(), nextd.getMinutes())
            this.queryCon.startTime = fd
            this.queryCon.endTime += ":00"
        },

        /**
         * 初始化日志相关的日期信息,
         * 
         */
        initTime() {
            var date = new Date();
            var year = date.getFullYear();
            var month = date.getMonth() + 1;
            var day = date.getDate();
            var hour = date.getHours();
            var minute = date.getMinutes();

            this.queryCon.nowTime = this.getInputTime(year, month, day, hour, minute)
            this.queryCon.endTime = this.queryCon.nowTime

            //初始化前一天,开始和终止日期仅能间隔一天
            let fd = new Date(date.getTime() - 1000 * 60 * 60 * 24)

            this.queryCon.lastTime = this.getInputTime(fd.getFullYear(), fd.getMonth() + 1, fd.getDate(), fd.getHours(), fd.getMinutes())
            this.queryCon.startTime = this.queryCon.lastTime
        },

        getInputTime(y, m, d, h, i) {
            if (m < 10) {
                m = "0" + m
            }
            if (d < 10) {
                d = "0" + d
            }
            if (h < 10) {
                h = "0" + h
            }
            if (i < 10) {
                i = "0" + i
            }
            return y + "-" + m + "-" + d + "T" + h + ":" + i + ":00"
        },

        /**
         * 初始化页面数据
         */
        init() {
            this.loadNS = true
            let tmp = this.getTeamProject().getChkTeam()
            if (tmp === false) {
                this.chkTeam = null
            } else {
                this.projectCate = tmp.cate
                this.chkTeam = tmp.team
            }
            this.changeProjectCate()
        },

        flushNameSpace(){
            this.loadNS = true
            let set = this.getSCFSet()
            this.getScfnet().listNameSpace(set.id, set.key, set.region, this.initNs)
        },

        /**
         * 初始化命名空间
         * @param {*} res 
         */
        initNs(res) {
            this.loadNS = false
            if (typeof (res) == "string") {

            } else {
                this.namespaces = res
                this.queryCon.namespace = res[0].Name
                // this.listFunctions(res[0])
                // this.initAllLog()
            }
        },

        /**
         * 列举指定命名空间下的函数
         */
        listFunctions(ns) {
            this.loadFN = true
            this.functions = []
            this.getScfnet().listFunction(this.getSCFSet(), this.initFunctions, 0, 20, ns)
        },

        initFunctions(res) {
            if (res.hasOwnProperty("Functions")) {
                //显示      
                // this.showFunctions = res.Functions
                //总数
                this.cloudFunctionTotal = res.TotalCount
                //页数
                //合并到全部函数
                this.functions = this.functions.concat(res.Functions)

                if (this.functions.length < res.TotalCount) {
                    this.getScfnet().listFunction(this.getSCFSet(), this.initFunctions, this.functions.length, res.TotalCount - this.functions.length)
                } else {
                    this.loadFN = false
                }
            } else {
                dialog.showMessageBox({ type: "warning", message: "错误提示", detail: res.message })
            }

        },

        /**
         * 切换命名空间
         */
        changeNamespace() {
            console.info(this.queryCon.namespace)
            this.listFunctions(this.queryCon.namespace)
        },

        /**
         * 查询日志
         */
        queryLog() {
            this.hidChart = true
            this.queryCon.loading = true
            //初始化日志提示信息
            this.scfLogs = []
            this.logCount.total = 0
            this.logCount.show = 0
            this.queryCon.offset = 0
            this.getScfnet().getFunctionLogs(this.getSCFSet(), this.queryCon, this.finQueryLog)
        },


        /**
         * 接受并格式化SCF日志
         * @param {*} res 
         */
        finQueryLog(res) {

            this.queryCon.loading = false
            this.timelineEChat.clear()
            this.totaltimeEChat.clear()
            this.avgtimeEChat.clear()
            this.counttimeEChat.clear()
            this.onetimeEChat.clear()

            this.perLog = 0
            this.charFunctions = []

            this.initEChart()

            console.info('finQueryLog', res)
            if (res.Data.length == 0) {
                UIkit.modal.dialog('<p class="uk-modal-body">无数据!</p>')
                return
            }

            this.hidChart = false
            this.queryCon.stop = false
            this.finAllLog(res)
        },

        dynamicfun(e) {
            eval('this.' + e.currentTarget.dataset.click + '()')
        },
        hidDlg() {
            model.hiddenModel()
        },

    }
})

