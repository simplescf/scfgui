let Model = {
  show: false,
  /**
   * 提示对话框
   * @param {str} title 
   * @param {str} info 
   * @param {str} btns 
   */
  showModel: function (title, info, btns) {
    if (this.show) {
      return
    }
    this.show = true
    let btntxt = ''
    if (btns.hasOwnProperty('confirm')) {
      btntxt += `<a href="#!" class="dlginfobtn btn btn-md u-btn-blue  g-mb-10 w-100" 
                data-click='${btns.confirm.funname}'>${btns.confirm.text}</a>`
    }
    if (btns.hasOwnProperty('cancel')) {
      btntxt += `<a href="#!" class="dlginfobtn btn btn-md u-btn-bluegray w-100" 
                data-click='${btns.cancel.funname}'>${btns.cancel.text}</a>`
    }
    $('#main').append(`
    <div class="dlginfo" id="cusdlg">
        <div class="dlginfo_main">
          <img src="./img/logotop.png" class="w-25"/>
          <div class="dlginfo_title">${title}</div>
          <div class="dlginfo_content">${info}</div>
          <div class="dlginfo_btns">${btntxt}</div>
        </div>
      </div>`)
  },

  hiddenModel: function () {
    this.show = false
    console.info('hiddenModel')
    $('#cusdlg').remove()
  },

  initNav(cate) {
    let laychk = 'g-bg-white-opacity-0_7--hover'
    let setchk = 'g-bg-white-opacity-0_7--hover'
    let addfunctionchk = 'g-bg-white-opacity-0_7--hover'
    let listfunctionchk = 'g-bg-white-opacity-0_7--hover'
    let invokechk = 'g-bg-white-opacity-0_7--hover'
    let listlogchk = 'g-bg-white-opacity-0_7--hover'
    let chartchk = 'g-bg-white-opacity-0_7--hover'

    switch (cate) {
      case 'layer':
        laychk = 'g-bg-white g-rounded-50 g-font-weight-600'
        break
      case 'set':
        setchk = 'g-bg-white g-rounded-50 g-font-weight-600'
        break
      case 'addfunction':
        addfunctionchk = 'g-bg-white g-rounded-50 g-font-weight-600'
        break
      case 'listfunction':
        listfunctionchk = 'g-bg-white g-rounded-50 g-font-weight-600'
        break
      case 'invoke':
        invokechk = 'g-bg-white g-rounded-50 g-font-weight-600'
        break
      case 'listlog':
        listlogchk = 'g-bg-white g-rounded-50 g-font-weight-600'
        break
      case 'chart':
        chartchk = 'g-bg-white g-rounded-50 g-font-weight-600'
        break
    }


    $('#navBar').html(`
    <ul class="navbar-nav ml-auto text-uppercase g-font-weight-600 u-sub-menu-v1">
      <li class="nav-item g-my-5 g-pos-rel">
        <img src="./img/logo.png" class="w-100"></img>
      </li>

      <li class="nav-item g-my-5 g-pl-10">
        <div class="g-font-weight-600 text-left g-font-size-15">
          函数管理
        </div>
      </li>

      <li class="nav-item g-my-5 g-pl-10 g-bg-white-opacity-0_7--hover ${addfunctionchk}">
        <a href="addfunction.html" class="btn nav-link text-left">
          <i class="fa fa-plus g-font-size-18 g-valign-middle g-mr-10 g-mt-minus-2"></i>新增云函数
        </a>
      </li>

      <li class="nav-item g-my-5 g-pl-10 g-bg-white-opacity-0_7--hover ${listfunctionchk}">
        <a href="listfunction.html" class="btn nav-link text-left">
          <i class="fa fa-list-ul g-font-size-18 g-valign-middle g-mr-10 g-mt-minus-2"></i>云函数管理
        </a>
      </li>

      <li class="nav-item g-my-5 g-pl-10 g-bg-white-opacity-0_7--hover ${invokechk}">
        <a href="invoke.html" class="btn nav-link text-left">
          <i class="fa fa-bug g-font-size-18 g-valign-middle g-mr-10 g-mt-minus-2"></i>云函数调试
        </a>
      </li>

      

      <li class="nav-item g-my-5 g-pl-10 g-bg-white-opacity-0_7--hover ${listlogchk}">
        <a href="listlog.html" class="btn nav-link text-left">
          <i class="fa fa-laptop g-font-size-18 g-valign-middle g-mr-10 g-mt-minus-2"></i>执行日志
        </a>
      </li>

      <li class="nav-item g-my-5 g-pl-10 ${laychk}">
        <a href="layer.html" class="btn nav-link text-left ">
          <i class="fa fa-files-o g-font-size-18 g-valign-middle g-mr-10 g-mt-minus-2"></i>层管理
        </a>
      </li>

      <li class="nav-item g-my-5 g-mt-10">
        <div class="g-font-weight-600 text-left g-font-size-15">
          项目管理
        </div>
      </li>

      <li class="nav-item g-my-5 g-pl-10 g-bg-white-opacity-0_7--hover ${chartchk}">
        <a href="chart.html" class="btn nav-link text-left">
          <i class="fa fa-pie-chart g-font-size-18 g-valign-middle g-mr-10 g-mt-minus-2"></i>运维图表
        </a>
      </li>

      

      

      <li class="nav-item g-my-5 g-mt-10">
        <div class="g-font-weight-600 text-left g-font-size-15">
          云管理
        </div>
      </li>

      <li class="nav-item g-my-5 g-pl-10 ${setchk}">
        <a href="set.html" class="btn nav-link text-left">
          <i class="fa fa-cloud g-font-size-18 g-valign-middle g-mr-10"></i>云配置信息
        </a>
      </li>

      <li class="nav-item g-my-5 g-pl-10 g-bg-white-opacity-0_7--hover">
        <a href="login.html" class="btn nav-link text-left">
          <i class="fa fa-power-off g-font-size-18 g-valign-middle g-mr-10 g-mt-minus-2"></i>退出
        </a>
      </li>
  </ul>
    `)
  }
}

module.exports = Model