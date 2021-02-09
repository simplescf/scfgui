/*
 * @Author: your name
 * @Date: 2020-11-18 00:54:54
 * @LastEditTime: 2020-12-23 03:02:32
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: /scfgui-client/qcloud/apigateway.js
 */
const tencentcloud = require("tencentcloud-sdk-nodejs");
var config = require("../config");
const ApigatewayClient = tencentcloud.apigateway.v20180808.Client;


let Apigateway = {
    getSDKClient (id, key, region) {
        const clientConfig = {
            credential: {
                secretId: id,
                secretKey: key,
            },
            region: region,
            profile: {
                httpProfile: {
                    endpoint: "apigateway.tencentcloudapi.com",
                },
            },
        }
        return new ApigatewayClient(clientConfig);
    },

    listServices(id, key, region, calback){
        let that = this
        const client = this.getSDKClient(id, key, region)
        client.DescribeServicesStatus({}).then(
            (data) => {
                if(that.isSuc(data)){
                    calback(data.Result)
                }else{
                    calback(data.Error.Code + " " + data.Error.Message)
                }
            },
            (err) => {
                calback(err.message)
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


module.exports = Apigateway