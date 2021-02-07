const CONFIG = require("./config");
const readline = require('readline');
const tencentcloud = require("tencentcloud-sdk-nodejs");
const { ipcRenderer } = require('electron');
const cos = require('./qcloud/cos');


let ScfNet = {
  /**
   * 触发器查询
   */
  listTriggers(set, ns, fname, cal) {
    let that = this
    const client = this.getSDKClient(set.id, set.key, set.region)
    const params = {
      "FunctionName": fname,
      "Namespace": ns
    };
    client.ListTriggers(params).then(
      (data) => {
        console.log(data);
        if (that.isSuc(data)) {
          cal(data.Triggers)
        } else {
          cal(data.Error.Code + " " + data.Error.Message)
        }
      },
      (err) => {
        console.error("error", err);
        cal(err.message)
      }
    )
  },

  /**
   * 直接调用
   * ns 命名空间
   * @param {*} fun 函数名
   * @param {*} data 请求数据
   * cal 回调函数
   */
  dxInvode(set, ns, funname, data, cal) {
    let that = this
    const client = this.getSDKClient(set.id, set.key, set.region)
    const params = {
      "FunctionName": funname,
      "LogType": "Tail",
      "Namespace": ns,
      "ClientContext": JSON.stringify(data)
    };
    client.Invoke(params).then(
      (data) => {
        console.log(data);
        if (that.isSuc(data)) {
          cal(data)
        } else {
          cal(data.Error.Code + " " + data.Error.Message)
        }
      },
      (err) => {
        console.error("error", err);
        cal(err.message)
      }
    )

  },


  //post调用
  postInvode(url, data, fn, contentType, method) {
    let para = data
    if (contentType == "application/json") {
      para = JSON.stringify(data)
    }

    $.ajax({
      url: url,
      method: method,
      dataType: 'json',
      headers: {
        'contentType': contentType
      },
      data: para,
      success: function (data) {
        console.info(data)
      },
      complete(res) {
        fn(res)
      }
    });
  },

  //获取scf对应的api网关url
  getFunctionUrl: function (fn) {
    let con = CONFIG.getChkConfig()
    let url = ""
    //从配置文件中拼接url
    for (let i = 0; i < con.functions.length; ++i) {
      if (con.functions[i].inputs.name == fn && con.functions[i].inputs.hasOwnProperty("events")) {
        for (let k = 0; k < con.functions[i].inputs.events.length; ++k) {
          if (con.functions[i].inputs.events[k].hasOwnProperty("apigw")) {
            url = "https://"
            url += con.functions[i].inputs.events[k].apigw.parameters.serviceId
            url = url + "-" + con.appid
            if (con.functions[i].inputs.region == "ap-guangzhou") {
              url += ".gz.apigw.tencentcs.com/" + con.functions[i].inputs.events[k].apigw.parameters.environment + con.functions[i].inputs.events[k].apigw.parameters.endpoints[0].path
            }
            return url
          }
        }
      }

    }
    return url
  },

  /**
   * 移除SCF
   * @param {*} fn 
   * @param {*} flushfn 
   * @param {*} finfn 
   */
  remove: function (fn, flushfn, finfn) {
    if (!CONFIG.saveFunctionToYml(fn)) {
      flushfn("未检索到改函数配置信息,无法删除,请手动在腾讯云云端删除")
      finfn(false, fn, '未检索到改函数配置信息,无法删除,请手动在腾讯云云端删除')
      return
    }

    ipcRenderer.once('ymlsavefin', (event, arg) => {
      if (arg.issuc) {
        this.runSlsCommand(fn, 'remove', arg.dir, flushfn, finfn)
      } else {
        finfn(false, fn, arg.errmsg)
      }
    })
  },

  /**
   * 部署SCF
   * @param {*} fn 函数名
   * @param {*} flushfn 接受执行状态信息函数
   * @param {*} finfn 结束函数
   */
  deploy: function (fn, flushfn, finfn) {
    if (!CONFIG.saveFunctionToYml(fn)) {
      flushfn("未检索到改函数配置信息,无法自动化部署")
      finfn(false, fn, '未检索到改函数配置信息,无法自动化部署')
      return
    }

    ipcRenderer.once('ymlsavefin', (event, arg) => {
      console.info("save fin ok", arg)
      //yml保存成功回传
      if (arg.issuc) {
        this.runSlsCommand(fn, 'deploy', arg.dir, flushfn, finfn)
      } else {
        finfn(false, fn, arg.errmsg)
      }
    })
  },

  /**
   * 执行sls命令
   * @param {*} command 
   * @param {*} dir 
   * @param {*} args 
   */
  runSlsCommand(fn, command, dir, flushfn, finfn) {
    var spawn = require('child_process').spawn;
    let free = spawn('serverless', [command, '--debug'], { cwd: dir, stdio: ['inherit'] });

    readline.createInterface({
      input: free.stdout,
      terminal: false
    }).on('line', function (line) {
      line = line.replace("[?25h", " ")
      line = line.replace("[?25l", " ")
      line = line.replace("[22m", " ")
      line = line.replace("[1m", " ")
      line = line.replace("[J", " ")
      line = line.replace("[G", " ")
      line = line.replace("[32m", " ")
      line = line.replace("[39m", " ")
      flushfn(line)
    });

    free.on('exit', function (code, signal) {
      finfn(true, fn)
    });

    free.on('error', function (err) {
      flushfn(err.message)
      finfn(false, fn, err.message)
    });
  },



  //增加命名空间
  addNameSpace: function (set, name, fn) {
    const client = this.getSDKClient(set.id, set.key, set.region)
    const params = {
      "Namespace": name
    };
    let that = this
    client.CreateNamespace(params).then(
      (data) => {
        if (that.isSuc(data)) {
          fn(true)
        } else {
          fn(data.Error.Code + " " + data.Error.Message)
        }
      },
      (err) => {
        fn(err.message)
      }
    )

  },


  listNameSpace: function (id, key, region, fn) {
    const client = this.getSDKClient(id, key, region)
    const params = {};
    let that = this
    client.ListNamespaces(params).then(
      (data) => {
        if (that.isSuc(data)) {
          fn(data.Namespaces)
        } else {
          fn(data.Error.Code + " " + data.Error.Message)
        }
      },
      (err) => {
        fn(err.message)
      }
    )
  },


  /**
   * 获取SDK使用的公共请求端
   */
  getSDKClient: function (id, key, region) {
    const ScfClient = tencentcloud.scf.v20180416.Client;

    const clientConfig = {
      credential: {
        secretId: id,
        secretKey: key,
      },
      region: region,
      profile: {
        httpProfile: {
          endpoint: "scf.tencentcloudapi.com",
        },
      },
    };
    return new ScfClient(clientConfig);
  },

  /**
   * 查询执行日志
   * @param {object} reqpara 查询参数
   * @param {object} fn 回调函数
   */
  getFunctionLogs: function (set, reqpara, fn) {
    let that = this
    let sdkClient = this.getSDKClient(set.id, set.key, set.region)
    let params = {}
    if (reqpara.hasOwnProperty("functionRequestId") && reqpara.functionRequestId != "") {
      params.FunctionRequestId = reqpara.functionRequestId
    } else {
      if (reqpara.hasOwnProperty("limit") && reqpara.limit != "") {
        params.Limit = reqpara.limit
      } else {
        params.Limit = 20
      }
      params.Offset = reqpara.offset
      // params.Namespace = reqpara.namespace

      if (reqpara.hasOwnProperty("namespace") && reqpara.namespace != "") {
        params.Namespace = reqpara.namespace
      }

      if (reqpara.hasOwnProperty("functionName") && reqpara.functionName != "") {
        params.FunctionName = reqpara.functionName
      }

      if (reqpara.hasOwnProperty("startTime") && reqpara.startTime != "") {
        params.StartTime = reqpara.startTime.replace("T", " ")
      }

      if (reqpara.hasOwnProperty("endTime") && reqpara.endTime != "") {
        params.EndTime = reqpara.endTime.replace("T", " ")
      }

      if (reqpara.hasOwnProperty("keyword") && reqpara.keyword != "") {
        params.SearchContext = { Keyword: reqpara.keyword }
      }

      if (reqpara.hasOwnProperty("retCode") && reqpara.retCode != "") {
        params.Filter = { RetCode: reqpara.retCode }
      }
    }

    console.info('getFunctionLogs', params)

    sdkClient.GetFunctionLogs(params).then(
      (data) => {
        if (that.isSuc(data)) {
          fn(data)
        } else {
          fn(data.Error.Code + " " + data.Error.Message)
        }
      },
      (err) => {
        console.error("error", err);
        fn(err.message)
      }
    )
  },

  /**
   * 函数详情
   * @param {*} set 
   * @param {*} fn 
   * @param {*} ns 
   * @param {*} funname 
   */
  getFunction: function (set, fn, ns, funname) {
    let that = this
    let client = this.getSDKClient(set.id, set.key, set.region)
    const params = {
      "Namespace": ns,
      "FunctionName": funname
    };
    client.GetFunction(params).then(
      (data) => {
        if (that.isSuc(data)) {
          fn(data)
        } else {
          fn(data.Error.Code + " " + data.Error.Message)
        }
      },
      (err) => {
        console.error("error", err);
        fn(err.message)
      }
    )
  },

  listFunction: function (set, fn, offset, limit, ns = "default", tags = {}) {
    let that = this
    let client = this.getSDKClient(set.id, set.key, set.region)
    const params = {
      "Namespace": ns,
      "Orderby": "FunctionName",
      "Order": "DESC",
      "Limit": limit,
      "Offset": offset
    };


    if (tags.hasOwnProperty('modelcode')) {
      if (tags.modelcode != '') {
        params.Filters = [
          {
            "Values": [
              tags.modelcode
            ],
            "Name": "modelcode"
          }
        ]
      }
    }


    client.ListFunctions(params).then(
      (data) => {
        console.log(data);
        if (that.isSuc(data)) {
          fn(data)
        } else {
          fn(data.Error.Code + " " + data.Error.Message)
        }
      },
      (err) => {
        fn(err.message)
      }
    );

  },




  /**
   * 只更新SCF代码
   */
  deployCode(set, filename, scffunction, calback, errcalback) {
    let funname = scffunction.name
    let that = this
    let sdkClient = this.getSDKClient(set.id, set.key, set.region)
    const params = {
      "Handler": scffunction.handler,
      "FunctionName": funname,
      "Namespace": scffunction.namespace,
      "Code": {
        "CosBucketName": cos.getCodeBucketNameNoId(),
        "CosObjectName": "/" + filename,
        "CosBucketRegion": set.region
      }
    };
    console.info('deployCode', params)
    sdkClient.UpdateFunctionCode(params).then(
      (data) => {
        if (that.isSuc(data)) {
          calback(data, scffunction.name)
        } else {
          errcalback(data.Error.Code + " " + data.Error.Message)
        }
      },
      (err) => {
        errcalback(err.message)
      }
    );

  },

  /**
   * 查询层列表
   */
  listLayers(set, calback, para) {
    const sdkClient = this.getSDKClient(set.id, set.key, set.region)
    const params = {};
    if (para.hasOwnProperty('Runtime')) {
      params.CompatibleRuntime = para.Runtime
    }
    let that = this
    console.info(params)
    sdkClient.ListLayers(params).then(
      (data) => {
        console.log(data);
        if (that.isSuc(data)) {
          calback(data.Layers)
        } else {
          calback(data.Error.Code + " " + data.Error.Message)
        }
      },
      (err) => {
        console.error("error", err);
        calback(err.message)
      }
    );

  },

  /**
   * 添加层或层版本
   * @param {*} para 发布的参数信息
   * @param {*} calback 成功function
   * @param {*} errcalback 失败function
   */
  publicLayer(set, para, calback, errcalback) {
    const sdkClient = this.getSDKClient(set.id, set.key, set.region)
    const params = {
      "CompatibleRuntimes": para.runtimes,
      "Content": {
        "CosBucketName": cos.getCodeBucketNameNoId(),
        "CosObjectName": "/" + para.zip,
        "CosBucketRegion": set.region
      },
      "LayerName": para.layerName,
      "Description": para.description
    };
    let that = this
    console.info(params)

    sdkClient.PublishLayerVersion(params).then(
      (data) => {
        console.info(data)
        if (that.isSuc(data)) {
          calback(data)
        } else {
          errcalback(data.Error.Code + " " + data.Error.Message)
        }
      },
      (err) => {
        console.error("error", err);
        errcalback(err.message)
      }
    );
  },

  /**
   * 删除层版本
   * @param {*} layer 
   * @param {*} version 
   * @param {*} calback 
   * @param {*} errcalback 
   */
  delLayerVersion(set, layer, version, calback, errcalback) {
    let that = this
    const client = this.getSDKClient(set.id, set.key, set.region)
    const params = {
      "LayerName": layer,
      "LayerVersion": version
    };
    client.DeleteLayerVersion(params).then(
      (data) => {
        if (that.isSuc(data)) {
          calback(data)
        } else {
          errcalback(data.Error.Code + " " + data.Error.Message)
        }
        console.log(data);
      },
      (err) => {
        console.error("error", err);
        errcalback(err.message)
      }
    );

  },

  listLayerVersions(set, layerName, fun) {
    const client = this.getSDKClient(set.id, set.key, set.region)
    const params = {
      "LayerName": layerName
    };
    let that = this
    client.ListLayerVersions(params).then(
      (data) => {
        console.info(data)
        if (that.isSuc(data)) {
          fun(data.LayerVersions)
        } else {
          fun(data.Error.Code + " " + data.Error.Message)
        }
      },
      (err) => {
        console.error("error", err);
        fun(err.message)
      }
    );
  },

  /**
   * 触发器列表
   * @param {*} set 
   * @param {*} ns 
   * @param {*} fname 
   * @param {*} fun 
   */
  listTriggers(set, ns, fname, fun) {
    const client = this.getSDKClient(set.id, set.key, set.region)
    const params = {
      "FunctionName": fname,
      "Namespace": ns
    };
    let that = this
    client.ListTriggers(params).then(
      (data) => {
        console.info(data)
        if (that.isSuc(data)) {
          fun(data.Triggers)
        } else {
          fun(data.Error.Code + " " + data.Error.Message)
        }
      },
      (err) => {
        console.error("error", err);
        fun(err.message)
      }
    )
  },

  deleteFunction(set, ns, fname, fun) {
    const client = this.getSDKClient(set.id, set.key, set.region)
    const params = {
      "FunctionName": fname,
      "Namespace": ns
    };
    let that = this
    client.DeleteFunction(params).then(
      (data) => {
        console.info(data)
        fun()
      },
      (err) => {
        console.error("error", err);
        fun()
      }
    )
  },

  deleteApi(set, serviceId, apiId, fun) {
    const client = this.getSDKClient(set.id, set.key, set.region)
    const params = {
      "ServiceId": serviceId,
      "ApiId": apiId
    };
    let that = this
    client.ListTriggers(params).then(
      (data) => {
        console.info(data)
        fun()
      },
      (err) => {
        console.error("error", err);
        fun()
      }
    )
  },

  UpdateFunctionConfiguration(set, params, fun) {
    const client = this.getSDKClient(set.id, set.key, set.region)
    let that = this
    client.UpdateFunctionConfiguration(params).then(
      (data) => {
        console.info(data)
        if (that.isSuc(data)) {
          fun(true)
        } else {
          fun(data.Error.Code + " " + data.Error.Message)
        }
      },
      (err) => {
        console.error("error", err);
        fun(err.message)
      }
    )
  },



  isSuc(res) {
    if (res.hasOwnProperty('Error')) {
      return false
    }
    return true
  },


  getLoginUser() {
    let user = sessionStorage.getItem('user')
    if (user == null) {
      return false
    }
    return JSON.parse(user);
  }

}


module.exports = ScfNet