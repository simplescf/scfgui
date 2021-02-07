var app = new Vue({
    el: '#main',
    data: {
        catetxt: "全部",
        showload: true,
        navs: [],
        shops: [],
        currentpage: 0,
        page: 0,
        sqlcon: { flag: "all" },
        activenavid: ""
    },
    methods: {
        up: function (id) {
            console.debug(id)
            let ss = this.shops
            for (let i = 0; i < this.shops.length; ++i) {
                if (this.shops[i].shopid == id) {
                    this.shops[i].shopflag = 0
                }
            }
            // this.shops = ss
            post("setshopflag", { flag: "up", id: id }, function () { })
        },
        down: function (id) {
            for (let i = 0; i < this.shops.length; ++i) {
                if (this.shops[i].shopid == id) {
                    this.shops[i].shopflag = 1
                }
            }
            post("setshopflag", { flag: "down", id: id }, function () { })
        },
        remove: function (id) {
            if (confirm("你确定删除吗？")) {
                let ss = this.shops
                for (let i = 0; i < ss.length; ++i) {
                    if (ss[i].id == id) {
                        ss.splice(i, 1)
                    }
                }
                this.shops = ss
                post("setshopflag", { flag: "del", id: id }, function () { })
            }

        },
        loadNav: function (res) {
            if (res.errorCode == 0) {
                this.navs = res.data
            } else {
                alert(res.errorMessage);
            }
        },
        loadShop: function (res) {
            if (res.iscount) {
                this.count = res.count
                this.page = res.page
            }
            this.shops = res.data
            $('html,body').animate({ scrollTop: 0 }, 500);
            this.showload = false
        },

        pageshop: function (page) {
            this.showload = true
            this.sqlcon.page = page - 1
            this.currentpage = page - 1
            if (!this.sqlcon.hasOwnProperty("navid")) {
                this.activenavid = ""
            } else {
                let navs = this.navs
                for (let i = 0; i < navs.length; ++i) {
                    if (navs[i].id == this.activenavid) {
                        navs[i].active = true
                    } else {
                        navs[i].active = false
                    }
                }
            }
            post("weblistshop", this.sqlcon, this.loadShop)
        },

        navshop: function (navid, page) {
            this.sqlcon["navid"] = navid;
            this.activenavid = navid
            this.pageshop(1)
        },

        allnavshop: function () {
            this.sqlcon["navid"] = -1;
            this.pageshop(1);
        },

        cateshop: function (cate) {
            if (cate == "all") {
                this.catetxt = "全部"
                this.sqlcon["flag"] = "all"
                this.pageshop(1)
            } else if (cate == "up") {
                this.catetxt = "已上架"
                this.sqlcon["flag"] = "up"
                this.pageshop(1)
            } else if (cate == "down") {
                this.catetxt = "已下架"
                this.sqlcon["flag"] = "down"
                this.pageshop(1)
            }
        }
    }
})

function initdata() {
    post("listvalnav", {withcount:true}, app.loadNav)
    app.allnavshop()
}

