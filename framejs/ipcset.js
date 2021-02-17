const { dialog, screen, app, net } = require('electron');
const fs = require('fs');
const pump = require('pump');
const compressing = require('compressing');
const querystring = require('querystring');
const request = require('./request');
let teams = { 'persions': [], 'teams': [] }

let config = {}
let qcloudVpc = {}
let qcloudCam = {}
let apiGateway = {}
let scfnet = {}
let model = {}
let rsa = {}
let teamProject = {}

let ipcSet = {
    /**
     * 带文件夹自身压缩
     * @param {*} event 
     * @param {*} arg 
     */
    zipDir: function (event, arg) {
        console.info('zipdir')
        let path = arg.path
        let savepath = app.getPath('userData') + "/scfguicode"
        let fn = savepath + '/' + new Date().getTime() + '.zip'

        if (!fs.existsSync(savepath)) {
            fs.mkdirSync(savepath)
        }

        compressing.zip.compressDir(path, fn)
            .then(function (res) {
                event.reply('endzipdir', { issuc: true, fn: fn })
            })
            .catch(function (res) {
                event.reply('endzipdir', { issuc: false, errmsg: res.message })
            });
    },

    /**
     * 不压缩文件夹自身,直接压缩文件夹目录内的内容
     * @param {*} event 
     * @param {*} arg 
     */
    zip: function (event, arg) {
        event.reply('beginzip', '')
        let path = arg.path
        let expath = arg.expath
        let zipname = arg.zipname

        var dirList = fs.readdirSync(path);
        const tarStream = new compressing.zip.Stream();
        //列举要包含的目录下的全部文件和目录,将其添加到zip文件
        for (let dir of dirList) {
            console.info('dir', dir)
            let tmp = path + "/" + dir
            let ex = false
            for (let exp of expath) {
                if (exp == dir) {
                    ex = true
                    break
                }
            }
            if (!ex) {
                tarStream.addEntry(tmp);
            }
        }
        //压缩
        if (!fs.existsSync(app.getPath('userData') + "/scfguicode")) {
            fs.mkdirSync(app.getPath('userData') + "/scfguicode")
        }

        let filepath = app.getPath('userData') + "/scfguicode/" + zipname
        const destStream = fs.createWriteStream(filepath);

        pump(tarStream, destStream, err => {
            if (fs.existsSync(filepath)) {
                event.reply('endzipfin', { filepath: filepath, zipname: zipname })
            } else {
                event.reply('endziperr', err.message)
            }
        });
    },
    /**
     * 保存yaml文件
     * @param {*} event 
     * @param {*} arg 
     */
    saveYml: function (event, arg) {
        //.env配置文件
        // let envstr = "TENCENT_SECRET_ID=" + arg.qcloud.id + "\nTENCENT_SECRET_KEY=" + arg.qcloud.key
        // fs.writeFileSync(app.getPath('userData') + '/.env', envstr, "utf-8")
        //yml配置文件
        const yml = require('yaml')
        fs.writeFile(app.getPath('userData') + '/serverless.yml', yml.stringify(arg.yml), 'utf8', (err) => {
            if (err) {
                event.reply('ymlsavefin', { issuc: false, errmsg: err.message })
            } else {
                event.reply('ymlsavefin', { issuc: true, dir: app.getPath('userData') })
            }
        });
    },

    /**
     * 读取RSA密钥对
     * @param {*} event 
     * @param {object} arg {public:公钥文件名, private:私钥文件名}
     * @return {object} {public:公钥信息,private:私钥信息}, 无密钥返回false,否则返回每行拼接成的array
     */
    getPrivatePem(event, arg) {
        let ret = { public: false, private: false }
        let path = app.getPath('userData') + '/pem/'
        if (!fs.existsSync(path)) {
            let ex = fs.mkdirSync(path)
            return ret
        }
        let pripem = path + '/' + arg.name + 'private.pem'
        if (fs.existsSync(pripem)) {
            //读取内容后,返回
            this.readLineFile(pripem, 'privatepem', event)
        } else {
            event.reply('privatepemend', [])
        }
    },


    getPublicPem(event, arg) {
        let ret = { public: false, private: false }
        let path = app.getPath('userData') + '/pem/'
        if (!fs.existsSync(path)) {
            let ex = fs.mkdirSync(path)
            return ret
        }

        let pubpem = path + '/' + arg.name + 'public.pem'
        if (fs.existsSync(pubpem)) {
            //读取内容后,返回
            this.readLineFile(pubpem, 'publicpem', event)
        } else {
            event.reply('publicpemend', [])
        }
    },


    /**
     * 按行读取文件
     * @param {*} path 文件路径
     * @param {*} cate 处理类型
     * @param {*} event  event
     */
    readLineFile(path, cate, event) {
        let readline = require('readline');
        var fRead = fs.createReadStream(path);
        var objReadline = readline.createInterface({
            input: fRead
        });
        var arr = new Array();
        objReadline.on('line', function (line) {
            arr.push(line);
        });
        objReadline.on('close', function () {
            if (cate == 'publicpem') {
                event.reply('publicpemend', arr)
            } else if (cate == 'privatepem') {
                event.reply('privatepemend', arr)
            }
        });
    },


    /**
     * 保存RSA密钥对
     * @param {*} event 
     * @param {*} arg 
     */
    savePem(event, arg) {
        let path = app.getPath('userData') + '/pem/'
        if (!fs.existsSync(path)) {
            let ex = fs.mkdirSync(path)
            if (ex == undefined) {
                event.reply('rsadir', { issuc: false, errmsg: 'PEM文件夹创建失败' })
            }
        }

        let pubpem = path + '/' + arg.name + 'public.pem'
        let pripem = path + '/' + arg.name + 'private.pem'
        if (arg.pub) {
            fs.writeFileSync(pubpem, arg.pub, 'utf8')
        }
        if (arg.pri) {
            fs.writeFileSync(pripem, arg.pri, 'utf8')
        }
        event.reply('savepemend', true)
    },

    /**
     * 选择本地文件夹
     * @param {*} event 
     * @param {*} arg 
     */
    openDir(event, arg) {
        let path = ''
        if (arg.hasOwnProperty('defaultPath')) {
            //defaultPath
            path = dialog.showOpenDialogSync({
                title: '选择文件夹',
                defaultPath: arg.defaultPath,
                properties: ['openDirectory']
            })
        } else {
            path = dialog.showOpenDialogSync({
                title: '选择文件夹',
                properties: ['openDirectory']
            })
        }
        event.reply('endopendir', path)
    },



    asyn: function (event, arg) {
        if (arg.type == 'zip') {
            this.zip(event, arg)
        } else if (arg.type == 'zipdir') {
            this.zipDir(event, arg)
        } else if (arg.type == 'opendir') {
            this.openDir(event, arg)
        } else if (arg.type == 'net') {
            request.post(event, arg)
        } else if (arg.type == 'savepem') {
            this.savePem(event, arg)
        } else if (arg.type == 'getpublicpem') {
            this.getPublicPem(event, arg)
        } else if (arg.type == 'getprivatepem') {
            this.getPrivatePem(event, arg)
        } else if (arg.type == 'senddeploylog') {
            event.reply('revdeploylog', arg)
        }
    },

    saveSet(set){
        console.info('save set', set)
        try {
            fs.accessSync(app.getPath('userData') + '/set.json', fs.constants.R_OK);
            let tmp = JSON.parse(fs.readFileSync(app.getPath('userData') + '/set.json', 'utf8'));
            if(set.hasOwnProperty('cate')){
                tmp.cate = set.cate
            }
            if(set.hasOwnProperty('teamid')){
                tmp.teamid = set.teamid
            }
            if(set.hasOwnProperty('guid')){
                tmp.guid = set.guid
            }
            fs.writeFileSync(app.getPath('userData') + '/set.json', JSON.stringify(tmp), "utf-8")
        } catch (err) {
            fs.writeFileSync(app.getPath('userData') + '/set.json', JSON.stringify(set), "utf-8")
            console.error('no access!', err);
        }
    },

    syn: function (event, arg) {
        let retv = ''
        if (arg.type == 'dialog') {
            retv = dialog.showMessageBoxSync({
                type: "warning",
                buttons: arg.buttons,
                defaultId: 0,
                title: arg.title,
                message: arg.message,
            })
        } else if (arg.type == 'screen') {
            retv = screen.getPrimaryDisplay().workAreaSize
        } else if (arg.type == 'readfile') {
            if (arg.filetype == 'set') {
                try {
                    fs.accessSync(app.getPath('userData') + '/set.json', fs.constants.R_OK);
                    return fs.readFileSync(app.getPath('userData') + '/set.json', 'utf8');
                } catch (err) {
                    console.error('no access!');
                }
                return false;
            } else if (arg.filetype == 'yml') {
                return fs.readFileSync(app.getPath('userData') + '/set.json', 'utf8');
            }
        } else if (arg.type == 'writefile') {
            if (arg.filetype == 'set') {
                this.saveSet(arg.json)
            } else if (arg.filetype == 'yml') {
                this.saveYml(event, arg)
            }
            return ''
        } else if (arg.type == 'setglobalteam') {
            teams = arg.data;
            return ''
        } else if (arg.type == 'getglobalteam') {
            return teams;
        } else if (arg.type == 'loadnpm') {
            qcloudVpc = require("../qcloud/vpc.js");
            qcloudCam = require("../qcloud/cam.js");
            apiGateway = require("../qcloud/apigateway");
            scfnet = require("../scfnet.js");
            model = require("../html/js/model");
            rsa = require("../html/js/rsa");
            teamProject = require("../html/js/teamProject");
            return 'fin'
        } else if (arg.type == 'getnpm') {
            console.info(arg)
            let res = {}
            for (let key of arg.data) {
                switch (key) {
                    case 'qcloudVpc':
                        res[key] = qcloudVpc
                        break
                    case 'qcloudCam':
                        res[key] = qcloudCam
                        break
                    case 'apiGateway':
                        res[key] = apiGateway
                        break
                    case 'scfnet':
                        res[key] = scfnet
                        break
                    case 'model':
                        res[key] = model
                        break
                    case 'rsa':
                        res[key] = rsa
                        break
                    case 'teamProject':
                        res[key] = teamProject
                        break
                }
            }
            console.info(res)
            return res
        }
        return retv
    }
}

module.exports = ipcSet