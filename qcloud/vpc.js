/*
 * @Author: your name
 * @Date: 2020-11-18 00:54:54
 * @LastEditTime: 2020-12-19 14:25:09
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: /scfgui-client/qcloud/vpc.js
 */
const tencentcloud = require("tencentcloud-sdk-nodejs");
const VpcClient = tencentcloud.vpc.v20170312.Client;



let Vpc = {
    getSDKClient: function (id, key, region) {
        const clientConfig = {
            credential: {
                secretId: id,
                secretKey: key,
            },
            region: region,
            profile: {
                httpProfile: {
                    endpoint: "vpc.tencentcloudapi.com",
                },
            },
        };

        return new VpcClient(clientConfig);
    },


    listapi: function (id) {

        let con = config.getConfigById(id)
        const VpcClient = tencentcloud.vpc.v20170312.Client;
        const models = tencentcloud.vpc.v20170312.Models;
        const Credential = tencentcloud.common.Credential;
        const ClientProfile = tencentcloud.common.ClientProfile;
        const HttpProfile = tencentcloud.common.HttpProfile;
        let cred = new Credential(con.id, con.key);
        let httpProfile = new HttpProfile();
        httpProfile.endpoint = "apigateway.api.qcloud.com";
        let clientProfile = new ClientProfile();
        clientProfile.httpProfile = httpProfile;
        let client = new VpcClient(cred, con.project.region, clientProfile);

        let req = new models.DescribeSubnetsRequest();

        let params = '{}'
        req.from_json_string(params);
        client.DescribeSubnets(req, function (errMsg, response) {
            if (errMsg) {
                console.log(errMsg);
                return;
            }
            console.log(response.to_json_string());
        });
    },
    
    listVpcSubnet: function (id, key, region, vpcid, fun) {
        let client = this.getSDKClient(id, key, region)
        const params = {
            "Filters": [
                {
                    "Values": [
                        vpcid
                    ],
                    "Name": "vpc-id"
                }
            ]
        };
        let that = this
        client.DescribeSubnets(params).then(
            (data) => {
              if(that.isSuc(data)){
                  fun(data.SubnetSet)
              }else{
                fun(data.Error.Code + " " + data.Error.Message)
              }
            },
            (err) => {
              console.error("error", err);
              fun(err.message)
            }
          );

    },



    listvpc: function (id, key, region, fun) {
        let client = this.getSDKClient(id, key, region)
        let that = this
        const params = {};
        client.DescribeVpcs(params).then(
            (data) => {
                if(that.isSuc(data)){
                    fun(data.VpcSet)
                }else{
                    fun(data.Error.Code + " " + data.Error.Message)
                }                
            },
            (err) => {
                console.error("error", err);
                fun(err.message)
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


module.exports = Vpc