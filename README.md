<div align=center><img src="https://github.com/simplescf/scfgui/raw/main/html/img/logotop.png" width="150" height="150" /></div>

## 工具概述

SCFGUI工具专为[腾讯云SCF](https://cloud.tencent.com/product/scf)提供的图形化开发工具。

本工具整合了腾讯云SCF、Serverless Framework、API网关和对象存储等功能，以图形化方式提供项目配置和管理，实现云开发0学习成本。
针对云函数提供了团队协作功能，助你在实际项目中高效、便捷的使用云函数。

## 工具定位

直接使用腾讯云云函数不仅需要了解SCF、serverless framework（简称SLS）和API网关的各项知识及几十近百种配置文件参数，更要频繁的使用sls命令和手动去配置参数才能顺利开发。
SCFGUI工具以图形化界面方式集成了以上功能，取代了晦涩文档、易出错的文本配置方法和不够便捷的部署命令，将学习难度降到最低，即便是小白也可以迅速使用云函数。

### 框架主要技术

为便于开发者理解和掌握SCFGUI的使用和再修改，现列出所采用的重要第三方包。
开发语言：Nodejs。

GUI：采用[electron](https://www.electronjs.org/)框架，以支持mac和Windows跨平台使用。

Tencentcloud-sdk-nodejs：[腾讯云开发者工具套件](https://cloud.tencent.com/document/sdk/Node.js)用以实现云函数的配置管理、代码更新管理、云存储和API网关管理等。

@serverless：此为SLS工具，负责云函数的部署和删除,我们对此进行了二次开发。

### Serverless Framework二次开发
默认的SLS工具，部署云函数需要读取本地serverless.yml函数配置文件及.env密钥文件。
serverless.yml仅能配置一个函数，因此多函数部署配置的时候需要重复修改此文件，影响开发效率。
本工具对SLS工具进行二次开发：
1. 取消了serverless.yml增加了函数级的权限控制，提升了SLS工具在开发和部署上的便捷性；
2. 取消了.env密钥文件，不再直接保存密钥到文件，提高了密钥的安全性。
###安全性
本软件对项目敏感配置使用RSA加密（如密钥、api网关id等），RSA密钥对仅在客户端直接生成和保存，与服务器隔离。
团队项目中，腾讯云密钥即便解密也仅管理员可查看，对普通成员不可见。
```
服务器不接触您的密钥对，接收到的敏感信息为加密后的信息，解密操作仅在客户端进行。
因此请您务必保管好RSA密钥对，否则无法解密项目，且不支持找回。
```

## 快速入门

#### 前提条件
1. 已安装npm
2. 已安装nodejs
3. 已拥有腾讯云账号

####  启动说明
```
npm install
npm start
```
<pre>
若npm start若启动不正常,请确认是否真正安装electron启动程序
请核对node_modules/electron/dist/Electron文件是否存在
手动安装electron方法:
cd node_modules/electron
node install.js
</pre>

## 功能说明

功能列表：账号注册登录、云配置信息、新增云函数、云函数调试、函数列表、执行日志、层管理和运维图表。
#### 1. 账号注册管理：
为便于团队协作和便捷使用，项目及函数的配置信息加密后保存在云上，因此SCFGUI需要注册并登陆。
#### 2. 云配置信息
本工具需要首先创建项目，项目分为“个人项目”和“团队项目”两种类型，团队项目支持多人协作。
团队项目：权限分为超级管理员、项目管理员和普通成员。管理员对项目配置后，全部成员共享配置，各成员配置的函数信息自动在全部成员之间同步。

<table>
    <tr><td>角色</td><td>项目管理</td><td>项目配置</td><td>成员管理</td><td>函数配置</td></tr>
    <tr><td>超级管理员</td><td>✔︎</td><td>✔︎</td><td>✔︎</td><td>✔︎</td></tr>
    <tr><td>项目管理员</td><td>✕</td><td>✔︎</td><td>✔︎</td><td>✔︎</td></tr>
    <tr><td>普通成员</td><td>✕</td><td>✕</td><td>✕</td><td>✔︎</td></tr>
</table>

#### 3. 新增云函数
使用SLS工具进行函数部署必须手动生成[serverless.yml](https://github.com/serverless-components/tencent-scf/blob/master/docs/configure.md)配置文件，SCFGUI直接以图形化配置方式取代手动配置，达到0学习成本、简单、不易出错的目的。
#### 4. 云函数调试
目前支持直接、POST、GET的形式来调用已部署的腾讯云云函数。
#### 5. 函数列表
展示项目全部已部署、待部署的云函数。支持“一键部署”、“移除部署”、“环境配置”和”层绑定“等功能。
#### 6. 执行日志
根据时间、关键词、requestid查询历史执行日志，同时以图表形式对比查看函数的执行情况，对性能调优具有重要参考意义。
#### 7. 层管理
简单的可以将”层“理解为所有函数共用的目录(使用需要先明确绑定)，可以用来存放可执行代码或文件等，层发布后固定存放在/opt路径，最经常为存放项目依赖库或公共文件。
以PHP为例：
1. 发布层：将vendor目录通过“层管理”发布为层
2. 引入：代码中require此路径的autoload.php
优势：
程序包超过10M，SLS的自动化部署和代码更新效率低、易出错，使用层后可最大降低部署程序包的大小，从而实现可靠、秒级的部署和更新。
注意事项：
层放置的目录和开发环境的目录不同，代码统一更有利于项目开发测试和部署，可采用以下方式实现开发和部署环境的代码统一。

```
if(getenv("TENCENTCLOUD_RUNENV")=='SCF'){
    require_once "/opt/vendor/autoload.php";
}else{
    require_once __DIR__ . "/vendor/autoload.php";
}
```
将以上代码作为单独的一个文件再引入到各代码文件中（腾讯云云函数有专属的环境变量参数“TENCENTCLOUD_RUNENV”=“SCF”，可用此区分开发和部署环境）。

#### 8. 运维图表
图表形式展示“函数执行时间对比图”、“函数总执行时间对比图”、“函数平均执行时间对比图”、“函数执行最大、最小、平均时间解析图”、“函数执行次数对比图”，帮助掌握项目运维和性能调优。
