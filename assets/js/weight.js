var app = new Vue({
    el: '#mainarea',
    data: {
        chknavid:1,
        showload:true,
        faxs:[],
        faxid:'',
        navs: [],
        shops: [],
        currentpage: 0,
        page: 0,
        sqlcon: {flag:"all"},
    },
    methods: {
        changecate:function(cateid, shopid){
            post("setshopflag", {id:shopid, nav:cateid}, function(res){})
        },
        changeprice:function(p,id){
            post("setshopflag", {id:id, price:p}, function(res){})
        },
        changecount:function(d,id){
            post("setshopflag", {id:id, count:d}, function(res){})
        },


        changelevel:function(level, id){
            console.debug(level, id)
            post("setshopflag", {id:id, level:level}, function(res){})
        },
        
        loadNav: function (res) {
            if (res.errorCode == 0) {
                this.navs = res.data
                this.navshop(res.data[0].id)
            } else {
                alert(res.errorMessage);
            }
        },
        loadShop: function (res) {
            if (res.errorCode == 0) {
                data = res.data
                if (data.ispage) {
                    this.page = data.pagecount
                }
                let shops = data.data
                this.shops = shops
                $('html,body').animate({ scrollTop: 0 }, 500);
            } else {
                alert(res.errorMessage);
            }
            this.showload = false
           
        },

        pageshop: function (page) {
            this.showload = true
            this.sqlcon.page = page - 1
            this.currentpage = page - 1
            post("listvalshop", this.sqlcon, this.loadShop)
        },

        navshop: function (navid) {
            this.sqlcon["navid"] = navid;
            this.sqlcon["flag"] = "up";
            this.chknavid = navid
            this.pageshop(1)
        },

        changenav:function(id){
            this.faxid = ""
            this.navshop(id)
        },

        changeshopfax:function(id, fid){
            console.debug(id, fid)
            post("setshopflag", {id:id, fax:fid}, function(res){})
        },

        changefax:function(){
            this.showload = true
            this.sqlcon["faxid"] = this.faxid;
            this.sqlcon["flag"] = "all";
            this.chknavid = ""
            this.pageshop(1)
        },

        allnavshop: function () {
            // this.sqlcon["navid"] = -1;
            this.sqlcon["flag"] = "up"
            this.pageshop(1);
        },

        listFax: function (res) {
            post("listfax", {}, function (res) {
                if (res.errorCode == 0) {
                    app.faxs = res.data
                }
            })
        }
    }
})

function initdata() {
    post("listvalnav", {}, app.loadNav)
    app.listFax()
}

