/*
 * @Author: your name
 * @Date: 2020-12-16 21:00:08
 * @LastEditTime: 2021-02-05 21:48:22
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: /scfgui-client/qcloud/cam.js
 */
const tencentcloud = require("tencentcloud-sdk-nodejs");
const CamClient = tencentcloud.cam.v20190116.Client;

module.exports = {
    getSDKClient: function (id, key) {
        const clientConfig = {
            credential: {
                secretId: id,
                secretKey: key,
            },
            region: "",
            profile: {
                httpProfile: {
                    endpoint: "cam.tencentcloudapi.com",
                },
            },
        };

        return new CamClient(clientConfig);
    },

    listUsers: function (id, key, fun) {
        let client = this.getSDKClient(id, key)
        let that = this
        const params = {};
        client.ListUsers(params).then(
            (data) => {
                if (that.isSuc(data)) {
                    fun(data.Data)
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

    listUserPolicies: function (id, key, uin, fun) {
        const client = this.getSDKClient(id, key)
        let that = this
        client.ListAttachedUserPolicies({
            "TargetUin": uin
        }).then(
            (data) => {
                if (that.isSuc(data)) {
                    let list = data.List
                    for (let i = 0; i < list.length; ++i) {
                        list[i].Uin = uin
                    }
                    fun(list)
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

    listAccessKeys: function (id, key, uin, fun) {
        const client = this.getSDKClient(id, key)
        let that = this
        const params = {
            "TargetUin": uin
        };
        client.ListAccessKeys(params).then(
            (data) => {
                if(that.isSuc(data)){
                    fun(data.AccessKeys)
                }else{
                    fun(data.Error.Code+" "+data.Error.Message)
                }
                console.log(data);
            },
            (err) => {
                console.error("error", err);
                fun(err.message)
            }
        )
    },


    addScfUser: function (id, key, fun, errfun) {
        const client = this.getSDKClient(id, key)
        const params = {
            "Name": "scfgui"+(new Date()).getTime(),
            "Remark": "scfgui工具自动创建",
            "ConsoleLogin": 0,
            "UseApi": 1
        };
        let that = this
        client.AddUser(params).then(
            (data) => {
                if (that.isSuc(data)) {
                    client.AttachUserPolicy({
                        "PolicyId": 534122,
                        "AttachUin": data.Uin
                    }).then(
                        client.AttachUserPolicy({
                            "PolicyId": 186451,
                            "AttachUin": data.Uin
                        }).then(
                            client.AttachUserPolicy({
                                "PolicyId": 25024747,
                                "AttachUin": data.Uin
                            }).then(
                                client.AttachUserPolicy({
                                    "PolicyId": 32475945,
                                    "AttachUin": data.Uin
                                }).then(
                                    client.AttachUserPolicy({
                                        "PolicyId": 53473980,
                                        "AttachUin": data.Uin
                                    }).then(
                                        client.AttachUserPolicy({
                                            "PolicyId": 219188,
                                            "AttachUin": data.Uin
                                        }).then(
                                            fun()
                                        )   
                                    )
                                )
                            )
                        )
                    );
                } else {
                    errfun(data.Error.Code + " " + data.Error.Message)
                }
            },
            (err) => {
                console.error("error", err);
                errfun(err.message)
            }
        );

    },

    isSuc(res) {
        if (res.hasOwnProperty('Error')) {
            return false
        }
        return true
    }
}


