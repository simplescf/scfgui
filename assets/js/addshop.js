var app = new Vue({
    el: '#mainarea',
    data: {
        faxs: [],
        stars: [],
        navs: [],
        form: {
            name: "",
            desc: "",
            fax: "",
            cate: "normal",
            limittime: "",
            type: "rmb",
            price: '',
            highprice: '',
            count: "999",
            ss: [],
            nav:""
        }
    },
    computed: {
        priceIcon: function () {
            if (this.form.type == "rmb") {
                return "fa fa-rmb g-font-size-16 g-color-white"
            } else {
                return "fa fa-user-o g-font-size-16 g-color-white"
            }
        }
    },

    //
    methods: {
        loadnav: function (res) {
            post("listvalnav", {}, function (res) {
                app.navs = res.data
                app.form.nav = res.data[0].id
                setTimeout(function () {
                    $('#nav').selectpicker();
                }, 500);
                
            })
        },
        initFax: function (res) {
            let data = res.data
            this.faxs = data
            this.form.fax = data[0].id
            setTimeout(function () {
                console.debug('aaa')
                $('#fax').selectpicker();
            }, 500);
        },

        initStar: function (res) {
            let data = res.data
            app.stars = data
            setTimeout(function () {
                $.HSCore.components.HSMultiSelect.init('.js-multi-select');
            }, 500);

        }
    }
}
)

function initdata() {
    post("listfax", {}, app.initFax)
    post("listvalstar", {}, app.initStar)
    app.loadnav()
}



$("#shopform").submit(function (event) {
    console.debug("aa")
    event.preventDefault();

    if (app.form.name == "") {
        warn("错误", "请填写商品名称")
        return
    }
    if (app.form.desc == "") {
        warn("错误", "请填写商品推销概述")
        return
    }

    if (app.form.cate == "time" && app.form.limittime == "") {
        warn("错误", "请选择失效时间")
        return
    }
    if (app.form.price == "") {
        warn("错误", "请填写价格信息")
        return
    }
    if (app.form.highprice == "") {
        warn("错误", "请填写原价")
        return
    }

    app.form.ss = $("#star").val()
    if (app.form.ss.length == 0) {
        warn("错误", "请选择发布的明星部落")
        return
    }

    let bs = $("#addbannericon").find(".sucimgurl")
    let os = $("#addfmicon").find(".sucimgurl")
    let ds = $("#adddescicon").find(".sucimgurl")

    if (bs.length == 0) {
        warn("错误", "请上传产品banner图")
        return
    }
    if (ds.length == 0) {
        warn("错误", "请上传产品介绍图")
        return
    }
    if (os.length == 0) {
        warn("错误", "请上传产品封面图")
        return
    }
    app.form.descimg = []
    app.form.bannerimg = []

    app.form.icon = $(os[0]).attr("data-url")
    for (let i = 0; i < ds.length; ++i) {
        let url = $(ds[i]).attr("data-url")
        app.form.descimg.push(url)
    }
    for (let i = 0; i < bs.length; ++i) {
        let url = $(bs[i]).attr("data-url")
        app.form.bannerimg.push(url)
    }

    post("addshopweb", app.form, function (res) {
        if(res.errorCode==0){
            alert("添加成功")
        }else{
            alert(res.errorMessage)
        }
        console.debug(res)
    })
    // $("#descicon")
});
