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
        con: { cate: "waitsend", searchkey: "", searchcate: "uname" },
        faxs: [],
    },
    methods: {
        loadinit:function(){
            this.con = { cate: "waitsend", searchkey: "", searchcate: "uname" }
            this.firstpageload()
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

        searchkey: function (event) {
            event.preventDefault()
            this.firstpageload()
        },



        initorder: function (res) {
            this.orders = res.data.data
            if (res.data.hasOwnProperty("page")) {
                this.page = res.data.page
            }

        },
        loadwaitpay: function () {
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

        //第一页展示
        firstpageload: function () {
            this.page = 0
            this.con.page = 0
            this.currentpage = 0
            this.loadwaitpay()
        },
        //切换失效状态
        loadtime: function (time) {
            this.con.time = time
            this.firstpageload()
        },
        //全部
        loadallwaitsend: function () {
            this.con.time = "all"
            this.firstpageload()
        },

        //翻页
        pageorder: function (page) {
            this.con.page = page
            this.currentpage = page - 1
            this.loadwaitpay()
        },

        loadfax: function () {
            this.showloading = true
            post("listdelivery", {}, function (res) {
                if (res.errorCode == 0) {
                    app.faxs = res.data
                    app.loadallwaitsend()
                } else {
                    warn(res.errorMessage)
                }
            })
        },



        send: function (fax) {
            if (!fax.hasOwnProperty("delivery_id") || fax.delivery_id == "" || fax.delivery_id == null) {
                warn("提示", "请选择快递公司")
                return
            }
            if (!fax.hasOwnProperty("faxnum") || fax.faxnum == "" || fax.faxnum == null) {
                warn("提示", "请填写快递单号")
                return
            }
            let inx = this.getinx(fax.orderid)
            if(inx===false){
                alert("订单信息异常");
                return
            }

            if(confirm('确定修改订单人民币金额吗')==false){
            return false 
            }

            let tmp = this.orders[inx]
            tmp.showloading = true
            tmp.disabled = true
            Vue.set(this.orders, inx, tmp)
            post("setorderflagweb",
                { cate: "send", oid: fax.orderid, faxcode: fax.delivery_id, faxnum: fax.faxnum },
                function () {
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
        }
    }
})

function initdata() {
    app.loadfax()
    app.loadana()
}

