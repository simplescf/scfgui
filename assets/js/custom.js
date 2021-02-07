function getlogin(){
  let u = localStorage.getItem("code")
  if(u){
    console.debug("login")
      return JSON.parse(u);
  }
  console.debug("no lgin")
  window.location.href="/webadmin"
}

function login(data){
  localStorage.setItem("code", data)
}

function logout(){
  console.debug("logout")
  localStorage.removeItem("code")
  window.location.href="/webadmin"
}

let path = window.location.pathname
if(path!="/webadmin/index.html"&&path!="/webadmin"){
  // getlogin()
}

function post(url, data, fn) {
  console.debug(url)
  let weburl = 'https://service-6xyqk5ky-1300706860.gz.apigw.tencentcs.com/release/panzi-dev-' + url
  $.ajax({
    url: weburl,
    type: 'post',
    dataType: 'json',
    headers: {
      'contentType': "application/json"
    },
    //data: JSON.stringify({data:{status: "start"}}),
    data: JSON.stringify(data),
    cache: false,
    success: function (res) {
      fn(res)
    },
    error: function (e) {
      console.error(e)
    }
  });
}

function warn(title, info) {
  var newNoty = new Noty({
    "type": "warning",
    "layout": "bottomCenter",
    "timeout": "5000",
    "animation": {
      "open": "animated fadeIn",
      "close": "animated fadeOut"
    },
    "closeWith": [
      "click",
      "button"
    ],
    "text": "<div class=\"g-mr-20\"><div class=\"noty_body__icon\"><i class=\"fa fa-warning\"></i></div></div><div>" + title + "<br>" + info + "</div>",
    "theme": "unify--v1"
  }).show();
}



function info(title, info) {
  var newNoty = new Noty({
    "type": "success",
    "layout": "bottomCenter",
    "timeout": "7000",
    "animation": {
      "open": "animated fadeIn",
      "close": "animated fadeOut"
    },
    "closeWith": [
      "click",
      "button"
    ],
    "text": "<div class=\"g-mr-20\"><div class=\"noty_body__icon\"><i class=\"hs-admin-check\"></i></div></div><div>" + title + "<br>" + info + "</div>",
    "theme": "unify--v1"
  }).show();

}


function getUrlParam(paraName) {
  var url = window.location.toString();
  console.debug(url)
  var arrObj = url.split("?");

  if (arrObj.length > 1) {
    var arrPara = arrObj[1].split("&");
    var arr;

    for (var i = 0; i < arrPara.length; i++) {
      arr = arrPara[i].split("=");

      if (arr != null && arr[0] == paraName) {
        return arr[1];
      }
    }
    return "";
  }
  else {
    return "";
  }
}


