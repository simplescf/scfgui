const COS = require("cos-nodejs-sdk-v5");
var CONFIG = require("../config");
const compressing = require('compressing');
const fs = require('fs');
const pump = require('pump');
const { ipcRenderer } = require('electron')


let QcloudCos = {

  /**
  * 获取存放SCF源代码的COS BUCKET 的名字
  */
  getCodeBucketName(set) {
    let con = CONFIG.getChkConfig()
    return "scfgui-" + con.appid
  },

  getCodeBucketNameNoId() {
    return "scfgui"
  },


  getCos: function (set) {
    var cos = new COS({
      SecretId: set.id,
      SecretKey: set.key
    });
    return cos
  },

  /**
   * 初始化源代码存放的cos bucket
   */
  initCodeBucket: function () {
    let con = CONFIG.getChkConfig()
    let cos = this.getCos()
    let that = this
    cos.getService({
      Region: con.project.region,
    }, function (err, data) {
      let buckname = that.getCodeBucketName()
      let bs = data.Buckets
      for (let buck of bs) {
        if (buck.Name == buckname) {
          return
        }
      }
      that.createCodeBucket(buckname)
    });
  },


  listBucket(set, fun) {
    let cos = this.getCos(set)
    cos.getService({
      Region: set.region,
    }, function (err, data) {
      if (err == null) {
        fun(data.Buckets)
      } else {
        console.info(err)
        fun(err.message)
      }
    });

  },

  /**
   * 创建bucket
   */
  createCodeBucket(set, buckname, fun) {
    let cos = this.getCos(set)
    cos.putBucket({
      Bucket: buckname,
      Region: set.region
    }, function (err, data) {
      fun()
      console.log(err || data);
    });

  },

  /**
   * 上传文件并更新代码
   * @param {*} path 被上传的含文件名的绝对路径
   * @param {*} filename 上次的文件名字
   * @param {function} fun 上传完毕回传url的函数
   * @param {function} progressCalback 进度函数
   */
  uploadFile(set, path, filename, fun, progressCalback, errfun) {
    // let con = CONFIG.getChkConfig()
    console.info(set, path)
    let cos = this.getCos(set)
    cos.putObject({
      Bucket: set.bucket,
      Region: set.region,
      Key: filename,
      StorageClass: 'STANDARD',
      Body: fs.createReadStream(path), // 上传文件对象
      onProgress: function (progressData) {
        progressCalback(progressData)
      }
    }, function (err, data) {
      console.log(err || data);
      if (err) {
        errfun(err)
      } else {
        fun(filename)
      }
    });
  },

  /**
   * 打包文件(包含文件夹自身)
   * @param {*} path 要打包的文件目录
   * @param {*} func 打包完成后的调用函数
   */
  zipDir: function (path, func) {

    ipcRenderer.once('endzipdir', (event, arg) => {
      if (arg.issuc) {
        func(true, arg.fn)
      } else {
        func(false, arg.errmsg)
      }
    })

    ipcRenderer.send('asynchronous-message', {
      type: 'zipdir',
      path: path
    })
  },

  /**
   * 打包文件
   * @param {*} path 要打包的文件目录
   * @param {*} expath 要排除的目录
   * @param {*} zipname 压缩包目标文件名
   * @param {*} func 打包完成后的调用函数
   */
  zip: function (path, expath, zipname, func) {

    ipcRenderer.once('beginzip', (event, arg) => {
      console.log(arg, 'aaaaa') // prints "pong"
    })

    ipcRenderer.once('endzipfin', (event, arg) => {
      func(arg.filepath, arg.zipname)
    })
    ipcRenderer.once('endziperr', (event, arg) => {
      showModel('压缩失败', arg, {
        confirm: { text: '确定', funname: 'hidDlg' }
      })
      console.log(arg, 'endziperr') // prints "pong"
    })

    ipcRenderer.send('asynchronous-message', { type: 'zip', path: path, expath: expath, zipname: zipname })
  },

  getBuckName(set, fun) {
    let that = this
    this.listBucket(set, (data) => {

      if (typeof (data) == 'string') {
        fun(data)
        return
      }else if(data.length == 0){
        fun('请创建名称为scfgui的存储桶')
        return
      }

      let res = {
        name:'',
        appid:''
      }
      for (let bu of data) {
        let ls = bu.Name.split('-')
        res.appid = ls[ls.length - 1]
        if (ls[0].toUpperCase() == 'SCFGUI') {
          res.name = bu.Name
        }
      }
      let tmp = 'scfgui-' + res.appid
      if(res.name==''){
        //创建
        res.name = tmp        
        that.createCodeBucket(set, tmp, ()=>{
          fun(res)
        })
        return
      }
      fun(res)
    })
  }

}

module.exports = QcloudCos