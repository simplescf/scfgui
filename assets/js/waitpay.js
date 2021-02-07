var app = new Vue({
    el: '#mainarea',
    data: {
        orderana:{waitpay:0,waitsend:0,waitfin:0,fin:0},
        cc: "all",
        showloading: false,
        orders: [],
        page: 1,
        currentpage: 1,
        con: { cate: "waitpay", searchcate:'uname', searchkey:"", time:"all" }
    },
    methods: {
        loadinit:function(){
            this.con = { cate: "waitpay", searchcate:'uname', searchkey:"", time:"all" }
            this.firstloadorders()
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

        searchkey:function(event){
            event.preventDefault()
          
            this.firstloadorders()
        },
        

        sendedit:function(cate, fee, openid, oid){
            for (let i = 0; i < this.orders.length; ++i) {
                if (this.orders[i].orderid == oid) {
                    let tmp = this.orders[i]
                    tmp.editpay = false
                    if(cate=="rmb"){
                        tmp.totalrmb = fee
                    }else{
                        tmp.orderpoint = fee
                    }
                    Vue.set(this.orders, i, tmp)
                    break
                }
            }
            post("updateshopfee", {cate:cate, fee:fee, openid:openid, orderid:oid}, function(){})
        },
        changefee:function(orderid,openid){
            if(confirm('确定修改订单人民币金额吗')==true){
                // console.debug("rmb", $(this.$refs.rmbfee).val(), orderid,openid)
                this.sendedit("rmb",  $(this.$refs.rmbfee).val(), openid, orderid)
                return true;
             }else{
                return false;
             }
            
        },

        changepoint:function(orderid,openid){
            if(confirm('确定要修改的支付积分吗')==true){
                this.sendedit("point",  $(this.$refs.pointfee).val(), openid, orderid)
                return true;
             }else{
                return false;
             }
            
        },

        showedit: function (oid) {
            for (let i = 0; i < this.orders.length; ++i) {
                if (this.orders[i].orderid == oid) {
                    let tmp = this.orders[i]
                    tmp.editpay = true
                    Vue.set(this.orders, i, tmp)
                    return
                }
            }
        },
        del: function (id) {
            let inx = this.getinx(id)
            if(inx===false){
                alert("非法订单")
                return
            }
            // this.orders.splice(inx, 1)
        
            app.orders.splice(inx, 1)

            post("orderdweb", { oid: id }, function(inx){
               
            })
        },

        getinx:function(orderid){
            for (let i = 0; i < this.orders.length; ++i) {
                if (this.orders[i].orderid == orderid) {
                    return i
                }
            }
            return false
        },

        initorder: function (res) {
            let ds = res.data.data
            for(let i=0;i<ds.length;++i){
                ds[i].totalrmb = ds[i].ordertotalrmb/100
            }

            this.orders = ds
            if (res.data.hasOwnProperty("page")) {
                this.page = res.data.page
            }
        },

        /**
         * 开始全新搜索
         */
        firstloadorders:function(){
            this.con.page = 0
            this.currentpage = 0
            this.loadwaitpay()
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
        //切换失效状态
        loadextime:function(){
            this.con.time = "ex"
            this.firstloadorders()
        },
        //切换有效订单
        loadvaltime:function(){
            this.con.time = "val"
            this.firstloadorders()
        },

        //全部
        loadall: function () {
            this.con.time = "all"
            this.firstloadorders()
        },

        //翻页
        pageorder: function (page) {
            this.con.page = page-1
            this.currentpage = page - 1
            this.loadwaitpay()
        }
    }
})

function initdata() {
    app.loadinit()
    app.loadana()
}

