/*
 * @Author: your name
 * @Date: 2020-12-04 18:29:44
 * @LastEditTime: 2021-02-04 20:37:09
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: /scfgui-client/html/js/rsa.js
 */
const NodeRSA = require('node-rsa');

let Rsa = {
    randKey() {
        const key = new NodeRSA({ b: 2048 });
        // key.generateKeyPair();
        const publicDer = key.exportKey('pkcs8-public-pem');
        const privateDer = key.exportKey('pkcs8-private-pem');

        return { pub: publicDer, pri: privateDer }
    },
    encrypt(text, pub) {
        try{
            let rsa = {}
            if (Array.isArray(pub)) {
                rsa = new NodeRSA(pub.join("\n"))
            } else {
                rsa = new NodeRSA(pub)
            }
            return rsa.encrypt(text, 'base64')
        }catch(e){
            console.error(e)
            return false
        }
    },

    decrypt(pw, pri) {
        // bprivkey.importKey(pri.join("\n"), 'pkcs1');
        try{
            let bprivkey = new NodeRSA(pri.join("\n"))
            return bprivkey.decrypt(pw, 'utf8');
        }catch(e){
            // console.error(e)
            return false
        }
    },

    /**
     * 解密项目信息
     * @param {*} project 
     * @param {*} privatePem 
     */
    decryptProject(project, privatepem) {
        project.codeUri = project.codeUri
        project.secretId = this.decrypt(project.secretId, privatepem)
        project.secretKey = this.decrypt(project.secretKey, privatepem)
        for (let i = 0; i < project.vpcs.length; ++i) {
            project.vpcs[i].VpcId = this.decrypt(project.vpcs[i].VpcId, privatepem)
            for (let k = 0; k < project.vpcs[i].subnets.length; ++k) {
                project.vpcs[i].subnets[k].SubnetId = this.decrypt(project.vpcs[i].subnets[k].SubnetId, privatepem)
            }
        }
        let api = []
        for (let i = 0; i < project.apiGateways.length; ++i) {
            project.apiGateways[i].ServiceId =
                this.decrypt(project.apiGateways[i].ServiceId, privatepem)
        }
        return project
    },

   
    /**
     * @description: 加密项目信息
     * @param {*} project
     * @param {*} publicpem
     * @param {*} teamname
     * @return {*}
     */    
    encryptProject(project, publicpem, teamname){
        if (project.isNew) {
            //新添加项目配置, 需要一起追加密钥验证字符串
            console.info(teamname)
            project.pwName = rsa.encrypt(teamname, publicpem)
        }

        project.codeUri = project.codeUri
        project.secretId = rsa.encrypt(project.secretId, publicpem)
        project.secretKey = rsa.encrypt(project.secretKey, publicpem)

        for(let i=0;i<project.vpcs.length;++i){
            project.vpcs[i].VpcId = rsa.encrypt(project.vpcs[i].VpcId, publicpem)
            for(let k=0;k<project.vpcs[i].subnets.length;++k){
                project.vpcs[i].subnets[k].SubnetId = 
                    rsa.encrypt(project.vpcs[i].subnets[k].SubnetId, publicpem)
            }
        }

        for(let i=0;i<project.apiGateways.length;++i){
            project.apiGateways[i].ServiceId = 
                rsa.encrypt(project.apiGateways[i].ServiceId, publicpem)
        }

        return project;
    }

}
module.exports = Rsa