# scfgui
专为腾讯云的云函数SCF提供的GUI开发工具

客户端采用electron框架

说明:
当前版本暂仅支持PHP语言,后续版本将更新Nodejs python等语言版本

安装启动说明:
1. Clone 代码到本地目录
2. npm install 安装依赖包
3. npm start 启动项目

若npm start若启动不正常,请确认是否真正安装electron启动程序
请核对node_modules/electron/dist/Electron文件是否存在
手动安装方法:
cd node_modules/electron
node install.js
