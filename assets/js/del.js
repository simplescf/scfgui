var app = new Vue({
    el: '#mainarea',
    data: {
        orderana:{waitpay:0,waitsend:0,waitfin:0,fin:0},
        firstload: true,
        cc: "all",
        showloading: false,
        orders: [],
        page: 1,
        currentpage: 0,
        con: { cate: "all", searchcate: "uname", searchkey: "", del:true }
    },
    methods: {
        loadinit:function(){
            this.con = {cate: "all", searchcate: "uname", searchkey: "", del:true}
            this.firstpageorder()
        },

        loadana:function(){
            post("getordercountana", {}, function(res){
                if(res.errorCode==0){
                    app.orderana.waitpay = res.data.waitpay
                    app.orderana.waitsend = res.data.waitsend
                    app.orderana.waitfin = res.data.waitfin
                }
                
            })
        },

        recover:function(oid){
            let inx = this.getinx(oid)
            if(inx===false){
                alert("异常订单")
                return
            }
            this.orders.splice(inx, 1)
            post("orderdweb", {cate:"val", oid:oid}, function(){})
        },

        loaddelwaitpay:function(){
            this.con.cate="waitpay"
            console.debug(this.con)
            this.firstpageorder()
        },

        loadfin:function(){
            this.con.cate="fin"
            console.debug(this.con)
            this.firstpageorder()
        },


        loadallpayorder:function(){
            this.con.cate = "all"
            this.firstpageorder()
        },


        del:function(id){
            let inx = this.getinx(id)
            if(inx===false){
                alert("异常订单信息")
                return
            }
            if(confirm("要删除订单吗")===false){
                return
            }
            post("orderdweb", {oid:id, cate:"del"}, function(res){
                app.orders.splice(inx, 1)
            })
        },
       
        getinx: function (orderid) {
            for (let i = 0; i < this.orders.length; ++i) {
                if (this.orders[i].orderid == orderid) {
                    return i
                }
            }
            return false
        },
        fin: function (id) {
            console.debug(id)
            let inx = this.getinx(id)
            if (inx === false) {
                alert("订单异常")
                return
            }
            let tmp = this.orders[inx]
            tmp.disabled = true
            Vue.set(this.orders, inx, tmp)

            post("setorderflagweb", { cate: "fin", oid: id }, function () { 
                app.orders.splice(inx, 1)
            })
        },

        initorder: function (res) {
            this.orders = res.data.data
            if (res.data.hasOwnProperty("page")) {
                this.page = res.data.page
            }
        },
        loadwaitpay: function () {
            $("html,body").animate({scrollTop:0},500);
            this.showloading = true
            this.orders = []
            post("listorderweb", this.con, function (res) {
                app.showloading = false
                if (res.errorCode == 0) {
                    app.initorder(res)
                } else {
                    warn(res.errorMessage)
                }
            })
        },
        //切换失效状态
        loadtime: function (time) {
            this.con.time = time
            this.firstpageorder()
        },
       
        //翻页
        pageorder: function (page) {
            this.con.page = page-1
            this.currentpage = page - 1
            this.loadwaitpay()
        },
        //重新查询
        firstpageorder: function () {
            this.page = 0
            this.con.page = 0
            this.currentpage = 0
            this.loadwaitpay()
        }
    }
})

function initdata() {
    app.firstpageorder()
    app.loadana()
}

