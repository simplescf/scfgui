var fs = require("fs");
const YAML = require('yaml')
var jsonify = require('jsonify');
const { ipcRenderer } = require('electron');

let ScfConfig = {

    /**
     * 从配置文件中创建指定函数的yml文件
     * @param {*} fun 
     */
    createfunctionyml: function (fun) {
        let pro = this.getChkConfig()
        for (f of pro.functions) {
            if (f.inputs.name == fun) {
                let data = ipcRenderer.sendSync('synchronous-message',
                    { type: 'writefile', filetype: 'yml', yml: YAML.stringify(f), qcloud: { id: pro.id, key: pro.key } });
                // fs.writeFile('serverless.yml', YAML.stringify(f), "utf-8", function (err) {
                //     if (err) {
                //         console.error(err)
                //         dialog.showErrorBox("失败", "生成yml文件失败:" + JSON.stringify(err))
                //         return false
                //     };
                //     return true
                // });
            }
        }
    },
    /**
     * 新增函数到配置文件
     * 网关信息  函数配置信息
     * @return {bool} true 保存成功, false未保存
     */
    savefunction: function (gw, scffun) {
        let yml = {
            component: "scf",
            name: scffun.handlerfunction,
            stage: "sscf",
            app: scffun.app,
            org: scffun.org,
            inputs: {
                name: scffun.handlerfunction,
                namespace: scffun.namespace,
                enableRoleAuth: true,
                handler: scffun.handlerfile + "." + scffun.handlerfunction,
                runtime: scffun.runtime,
                region: scffun.region,
                description: scffun.description,
                memorySize: scffun.memorySize,
                timeout: scffun.timeout,
            }
        }

        yml.inputs.src = {
            src: scffun.codeUri,
            exclude: scffun.exclude
        }
        if(scffun.exclude.length>0){
            yml.inputs.src.exclude = []
            for(let ex of scffun.exclude){
                yml.inputs.src.exclude.push(ex+"/**")
            }
        }

        //格式化标签
        let tags = {}
        for (tag of scffun.tags) {
            if (tag.name != "") {
                tags[tag.name] = tag.val
            }
        }

        if (Object.keys(tags).length > 0) {
            // yml.inputs.tags = {}
            yml.inputs.tags = tags
        }
        //格式环境变量
        let envs = {}
        for (env of scffun.environment) {
            if (env.name != "") {
                envs[env.name] = env.val
            }
        }
        yml.inputs.environment = {}
        if (Object.keys(envs).length > 0) {
            yml.inputs.environment = { variables: envs }
        }
        //格式VPC信息
        if (scffun.vpcConfig.isvpc == "true") {
            yml.inputs.vpcConfig = {
                subnetId: scffun.vpcConfig.subnetId,
                vpcId: scffun.vpcConfig.vpcId
            }
        }

        //格式化触发器信息
        console.info(gw)
        if (gw.type != "") {
            yml.inputs.events = [this.formatEvent(gw)]
        }
        let fun = this.saveConfigFun(yml)
        console.info(fun)
        if (fun) {
            this.saveFunctionToYml(scffun.handlerfunction)
            return true
        }
        return false

        // console.info(YAML.stringify(yml))
    },

    /**
     * 删除配置文件中指定函数
     * @param {*} fun 
     */
    removeFun(fun) {
        let cons = this.getConfig()
        for (let i = 0; i < cons.length; ++i) {
            if (cons[i].chk) {
                for (let k = 0; k < cons[i].functions.length; ++k) {
                    if (cons[i].functions[k].name == fun) {
                        cons[i].functions.splice(k, 1)
                    }
                }
            }
        }
        return this.saveConfig(cons)
    },

    /**
     * 向配置文件添加函数
     * @param {*} yml 
     * @return {bool} true 继续操作, false 已存在该函数情况下,取消覆盖操作
     */
    saveConfigFun(yml) {
        console.info('saveConfigFun')
        let set = this.getChkConfig()
        //若无函数则为首次创建
        if (!set.hasOwnProperty("functions")) {
            set.functions = []
        }

        for (let i = 0; i < set.functions.length; ++i) {
            if (set.functions[i].name == yml.name) {
                let dlg = ipcRenderer.sendSync('synchronous-message',
                    { type: 'dialog', buttons: ["覆盖", "取消"], title: '请确认', message: '"该函数已经在配置文件存在,您是否要覆盖函数"' });

                if (dlg == 1) {
                    console.info("取消")
                    return false
                } else {
                    console.info("覆盖")
                    set.functions[i] = yml
                    this.saveConfig(set)
                    return true
                }
            }
        }
        //
        if (set.hasOwnProperty("functions")) {
            set.functions.push(yml)
        } else {
            set.functions = [yml]
        }
        return this.saveConfig(set)
    },

    /**
     * 返回被激活的项目的函数列表
     */
    listChkFunction: function () {
        let con = this.getChkConfig()
        if (con.hasOwnProperty("functions")) {
            return con.functions
        }
        return []
    },

    formatEvent: function (gw) {
        if (gw.type == "api") {
            return { apigw: this.formatApi(gw.data) }
        } else if (gw.type == "cos") {
            return { cos: this.formatCos(gw.data) }
        } else if (gw.type == "timer") {
            console.info("timeer")
            return { timer: this.formatTime(gw.data) }
        }

    },

    formatTime: function (apigw) {
        return {
            name: apigw.name,
            parameters: {
                cronExpression: apigw.rule,
                enable: true
            }
        }
    },

    formatCos: function (apigw) {
        let event = {
            name: apigw.name,
            parameters: {
                bucket: apigw.bucket,
                filter: {
                    prefix: apigw.prefix,
                    suffix: apigw.suffix
                },
                events: apigw.events,
                enable: "true"
            }
        }
        return event
    },

    /**
     * 格式化函数yml中触发器
     * @param {*} event 
     * @param {*} yml 
     */
    formatApi: function (apigw) {
        console.info(apigw)
        let ps = []
        if (apigw.protocols.toUpperCase() == "HTTP") {
            ps.push("http")
        }
        if (apigw.protocols.toUpperCase() == "HTTPS") {
            ps.push("https")
        }
        if (apigw.protocols.toUpperCase() == "ALL") {
            ps.push("https", "http")
        }

        //删除最后的/
        //动态api
        let dys = []
        let dypath = ""
        if (apigw.apitype == "dynamic") {
            for (pm of apigw.param) {
                dypath += "/{" + pm.name + "}"
                dys.push({
                    name: pm.name,
                    position: 'PATH',
                    required: pm.required,
                    type: pm.type,
                    defaultValue: pm.defaultValue,
                })
            }
        }


        let api = {
            name: apigw.serviceName,
            parameters: {
                serviceId: apigw.serviceId,
                protocols: ps,
                environment: apigw.environment,
                endpoints: [{
                    path: apigw.path + dypath,
                    method: apigw.method,
                    apiName: apigw.name,
                    // apiId:apigw.
                    responseType: apigw.responseType,
                    serviceTimeout: apigw.timeout,
                    description: apigw.description,
                    //动态参数
                    param: dys,
                    //不兼容多命名空间
                    // function: {
                    //     functionQualifier: "$LATEST"
                    // }
                }]
            }
        }
        //cors
        if (apigw.cors == "TRUE") {
            api.parameters.endpoints[0].enableCORS = true
        } else {
            api.parameters.endpoints[0].enableCORS = false
        }

        if (apigw.integratedResponse == "TRUE" && api.parameters.endpoints.length > 0) {
            api.parameters.endpoints[0].isIntegratedResponse = "TRUE"
        }
        return api
    },

    /**
     * 更改.evn serverless 自动化部署需要的scfID配置
     * @param {*} env 
     */
    saveEnv(env) {
        let con = this.getChkConfig()
        fs.writeFileSync(".env",
            "TENCENT_SECRET_ID=" + con.id + "\nTENCENT_SECRET_KEY=" + con.key)
    },

    //将对象类型保存成yml配置文件
    //正确返回true 未找到配置文件返回false
    saveFunctionToYml: function (fn) {
        let con = this.getChkConfig()
        let funs = con.functions
        let ex = false
        for (let i = 0; i < funs.length; ++i) {
            if (funs[i].name == fn) {
                ex = true
                let data = ipcRenderer.sendSync('synchronous-message',
                    {
                        type: 'writefile', filetype: 'yml',
                        yml: YAML.stringify(funs[i]), qcloud: { id: con.id, key: con.key }
                    });
                // fs.writeFileSync('./serverless.yml', YAML.stringify(funs[i]));
                return true
            }
        }
        return false
    },

    getConfig: function () {
        try {
            let data = ipcRenderer.sendSync('synchronous-message',
                { type: 'readfile', filetype: 'set' });
            // var data = fs.readFileSync('./set.json', 'utf8');
            jsons = JSON.parse(data)
            //跳过serviceId为空的api网关, 因为初始化的时候给api网关复制了空值
            for (let i = 0; i < jsons.length; ++i) {
                let apigws = []
                for (apiw of jsons[i].project.apigw) {
                    if (apiw.serviceId != "") {
                        apigws.push(apiw)
                    }
                }
                jsons[i].project.apigw = apigws
            }
            return jsons
        } catch (err) {
            return []
        }
    },

    //修改当前有效项目
    changeChkConfig: function (id) {
        let cons = this.getConfig()
        for (let i = 0; i < cons.length; ++i) {
            cons[i].chk = false
            if (cons[i].id == id) {
                cons[i].chk = true
            }
        }
        this.saveConfig(cons)
    },

    getChkConfig: function () {
        let cs = this.getConfig()
        for (c of cs) {
            if (c.chk) {
                return c
            }
        }
        return cs[0]
    },
    getConfigById: function (id) {
        let confs = this.getConfig()
        for (let i = 0; i < confs.length; ++i) {
            if (confs[i].id == id) {
                return confs[i]
            }
        }
    },

    saveConfig: function (paras) {
        let json = []
        let cs = this.getConfig()

        if (!Array.isArray(paras)) {
            for (let i = 0; i < cs.length; ++i) {
                if (cs[i].id == paras.id) {
                    cs[i] = paras
                }
            }
            json = cs
        } else {
            json = paras
            // for (let i = 0; i < json.length; ++i) {
            // delete json[i].showactive
            // }
        }

        let data = ipcRenderer.sendSync('synchronous-message', { type: 'writefile', filetype: 'set', json: json });
        // fs.writeFileSync('./set.json', JSON.stringify(json), "utf-8")
        // if (err) {
        //     dialog.showErrorBox("失败", "保存配置文件失败:" + JSON.stringify(err))
        //     return false
        // };
        return true
        // });
    },

    //生成最初始化状态的单个项目配置文件信息
    init: function (appid, id, key, name) {
        return {
            name: name, appid: appid, id: id, key: key, project: {
                codeUri: "",
                runtime: "",
                region: "",
                exclude: [],
                vpcConfig: {
                    isvpc: "false",
                    subnetId: "",
                    vpcId: "",
                },
                apigw: [{
                    serviceName: "",
                    serviceId: ""
                }]
            }
        }
    },

    /**
     * 新增项目
     * @param {*} id 
     * @param {*} key 
     * @param {*} name 
     */
    addProject(appid, id, key, name) {
        let confs = this.getConfig()
        let ex = false
        for (let i = 0; i < confs.length; ++i) {
            if (confs[i].id == id) {
                return { info: "该项目已经存在", res: false }
                // dialog.showMessageBox({
                //     type: "warning",
                //     detail: "该项目已经存在",
                //     message: "保存"
                // })
                // return false
            }
        }
        if (!ex) {
            confs.push(this.init(appid, id, key, name))
        }
        this.saveConfig(confs)
        // dialog.showMessageBox({
        //     type: "none",
        //     detail: "添加项目成功",
        //     message: "保存"
        // })
        return { info: confs[confs.length - 1], res: true }
    },


}

module.exports = ScfConfig