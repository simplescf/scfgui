var app = new Vue({
    el: '#mainarea',
    data: {
        showloading:true,
        shops: [],
        nohomeshops: []
    },
    methods: {
        chkhome: function (id) {
            console.debug("id", id)
            let nos = this.nohomeshops
            for (let i = 0; i < nos.length; ++i) {
                if (nos[i].id == id) {
                    let set = ""
                    if (nos[i].chk) {
                        set = "set"
                    } else {
                        set = "noset"
                    }
                    post("setshopflag", {home:set,page:0, id:id},function(){})
                    break
                }
            }
        },
        loadNoHomeShop: function (res) {
            if (res.errorCode == 0) {
                this.nohomeshops = res.data
            }
        },
        loadHome: function (res) {
            if (res.errorCode == 0) {
                this.shops = res.data
                this.showloading = false
            }
        },
        loadhomeshop:function(){
            this.showloading = true
            post("listonlyhomeshop", {}, this.loadHome)
        },
        delhome:function(id){
            post("setshopflag", {home:"del",page:0, id:id},this.loadhomeshop)
        }
    }
})

function initdata() {
    app.loadhomeshop()
    post("listvalshop", { "nohome": true, page: 0 }, app.loadNoHomeShop)
}

