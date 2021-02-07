
let app = new Vue({
    el: '#main',
    data: {
        scf: {},
        fun: {},
        //接口api信息
        environment: [{ name: "", val: "" }],
        tags: [{ name: "", val: "" }],
        showvpc: "open",
        //被选择的api文件
        chkapifile: "",
        apifiles: [],
        chkapifunction: "",        
        apifunctions: [],
        //事件
        event: "",
        apigw: {
            serviceName:"",serviceId:"",
            cors: "FALSE", responseType: "JSON", protocols: "HTTPS", method: "POST", required: "TRUE",
            param: [{ name: "name", required: "FALSE", type: "string", defaultValue: "dd", desc: "desc" }, { name: "name", required: "FALSE", type: "string", defaultValue: "dd", desc: "desc" }]
        }
    },
    created: function () {
        console.info("bbb")
        let scfs = config.getConfig()
        

        scfs.forEach(element => {
            
            if (element.chk) {
                this.scf = element
                let fun = element.project
                fun.description = ""
                fun.timeout = 30
                fun.handlerfunction = ""
                fun.handlerfile = ""
                fun.environment = { variables: [{ name: "", val: "" },] }
                fun.memorySize = 64
                this.fun = fun
                console.info("bbb",fun)
                 //API服务信息从项目配置转移到网关
                this.apigw.serviceName = this.scf.project.apigw.serviceName
                this.apigw.serviceId = this.scf.project.apigw.serviceId
                this.apigw.environment = "release"
                
            }
        });
    },
    watch: {
        'fun.runtime': function (nv, ov) {
            console.info(nv, ov)
            //首次初始化的时候不更新
            if (ov == undefined) {
                return;
            }
            if (nv == "PHP7" || nv == "PHP5") {
                this.listapifile()
            }
        },
        'fun.codeUri': function (nv, ov) {
            console.info(nv, ov)
            if (this.fun.runtime == "PHP7" || this.fun.runtime == "PHP5") {
                this.listapifile()
            }
        },

        'chkapifile': function (nv, ov) {
            for (file of this.apifiles) {
                if (file.name == nv) {
                    this.apifunctions = file.function
                    this.chkapifunction = ""
                    break
                }
            }
        },
    },
    methods: {
        //添加scf配置文件
        addscf: function () {
            if (this.scf.project.apigw.serviceName == "") {
                dialog.showMessageBox({ type: "warning", message: "错误提示", detail: "您尚未配置API网关服务信息,请先配置" })
                return
            }
            if (this.scf.project.apigw.serviceId == "") {
                dialog.showMessageBox({ type: "warning", message: "错误提示", detail: "您尚未配置API网关服务信息,请先配置" })
                return
            }
            this.fun.handlerfile = this.chkapifile
            this.fun.handlerfunction = this.chkapifunction
            this.fun.environment = this.environment
            this.fun.tags = this.tags

            config.savefunction(this.apigw, this.fun)
        },

        deltag: function (inx) {
            if (this.tags.length == 1) {
                this.tags = [{ name: "", val: "" }]
            } else {
                this.tags.splice(inx, 1)
            }
        },

        addtag: function () {
            this.tags.push({ name: "", val: "" })
        },

        delenv: function (inx) {
            if (this.environment.length == 1) {
                this.environment = [{ name: "", val: "" }]
            } else {
                this.environment.splice(inx, 1)
            }
        },

        addenv: function () {
            console.info("add")
            this.environment.push({ name: "", val: "" })
        },
        /**
         * 检索接口文件和接口函数
         */
        listapifile: function () {
            //Java8 Golang1 不自动解析
            if (this.fun.runtime == "Golang1" || this.fun.runtime == "Java8") {
                return
            }
            const dir = fs.readdirSync(this.fun.codeUri);
            if (this.fun.runtime == "PHP7" || this.fun.runtime == "PHP5") {
                for (filename of dir) {
                    let myRe = /(.*)(\.php)/;
                    let myArray = myRe.exec(filename);
                    if (myArray != null) {
                        let tmp = filename
                        fs.readFile(this.fun.codeUri + "/" + tmp, 'utf8', (err, data) => {
                            this.getphpfunctions(tmp, data, myArray[1])
                        });
                    }
                }
            }
        },

        /**
         * php文件中解析出函数名
         * @param {php} ds 
         */
        getphpfunctions: function (fn, ds, onlyname) {
            let arr = ds.split("\n")
            var myRe = /function\s+(\S*)\s*\(/g
            let ffs = []
            for (line of arr) {
                var apis = myRe.exec(line);
                if (apis != null) {
                    ffs.push(apis[1])
                }
            }
            this.apifiles.push({ file: fn, name:onlyname, function: ffs })
        },


        addexclude: function () {

        },
        addinclude: function () {

        },
        chosecodepath: function () {
            let paths = dialog.showOpenDialogSync({
                properties: ['openDirectory']
            })
            this.fun.codeUri = paths[0]
        }
    }
})

