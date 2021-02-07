/*
 * @Author: your name
 * @Date: 2020-11-18 00:54:38
 * @LastEditTime: 2021-02-05 22:08:24
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: /scfgui-client/main.js
 */
const { app, BrowserWindow } = require('electron')
const ipcSet = require('./framejs/ipcset')

// 保持对window对象的全局引用，如果不这么做的话，当JavaScript对象被
// 垃圾回收的时候，window对象将会自动的关闭
let win = {}

const { ipcMain, screen } = require('electron');

function createWindow() {
  // 创建浏览器窗口。
  win = new BrowserWindow({
    // show: false,
    // width: 800,
    // height: 600,
    resizable: true,
    contextIsolation: true,
    // titleBarStyle:"hidden",
    webPreferences: {
      nodeIntegration: true
    }
  })
  win.maximize()
  ipcMain.on("setMainWindow", function (e, data) {
    let b = win.getBounds()
    win.setResizable(true)
  })

  ipcMain.on('asynchronous-message', (event, arg) => {
    console.info('asynchronous-message',arg)
    ipcSet.asyn(event, arg)
  })

  ipcMain.on('synchronous-message', (event, arg) => {
    event.returnValue = ipcSet.syn(event, arg)
  })



  // 加载index.html文件
  //login.html 登录
  //set.html 项目配置
  //listfunction.html 函数列表
  //invoke.html 调用测试
  //addfunction.html 添加函数
  //layer.html 层管理

  win.loadFile('./html/login.html')

  // 打开开发者工具
  // win.webContents.openDevTools()


  // 当 window 被关闭，这个事件会被触发。
  win.on('closed', () => {
    // 取消引用 window 对象，如果你的应用支持多窗口的话，
    // 通常会把多个 window 对象存放在一个数组里面，
    // 与此同时，你应该删除相应的元素。
    win = null
  })
}

// Electron 会在初始化后并准备
// 创建浏览器窗口时，调用这个函数。
// 部分 API 在 ready 事件触发后才能使用。
app.on('ready', createWindow)

// 当全部窗口关闭时退出。
app.on('window-all-closed', () => {
  // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活。
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // 在macOS上，当单击dock图标并且没有其他窗口打开时，
  // 通常在应用程序中重新创建一个窗口。

  if (win === null) {
    createWindow()
  }
})

// 在这个文件中，你可以续写应用剩下主进程代码。
// 也可以拆分成几个文件，然后用 require 导入。