var app = new Vue({
    el: '#mainarea',
    data: {
        showloading: false,
        faxs: [],
        addfax: {feetypetxt:"邮费", freetype:"", feetype:""},
    },
    watch:{
        'addfax.feetype':function(val, oldVal){
            if(val=="total"){
                this.addfax.feetypetxt = "总邮费"
            }else if(val=="singal"){
                this.addfax.feetypetxt = "单件邮费"
            }
        },
        'addfax.freetype':function(val, oldVal){
            if(val=="all"){
                this.addfax.fee = 0
                this.addfax.count = 0
                this.addfax.discount = true
                this.addfax.free = 0
                this.addfax.disfree = true
            }else if(val=="count"){
                this.addfax.discount = false
                this.addfax.free = 0
                this.addfax.disfree = true
            }else if(val=="free"){
                this.addfax.count = 0
                this.addfax.discount = true
                this.addfax.disfree = false
            }else{
                this.addfax.discount = false
                this.addfax.disfree = false
            }
        }
    },
    methods: {
        edit:function(fid){
            console.debug(fid)
            for(let i=0;i<this.faxs.length;++i){
                if(this.faxs[i].id==fid){
                    let tmp = this.faxs[i]
                    tmp["fee"] = tmp["feetxt"]
                    tmp["free"] = tmp["freetxt"]
                    console.debug(tmp)
                    this.addfax = tmp
                   
                    return
                }
            }
        },
        del:function(id){
            this.showloading = true
            post("delfax", {faxid:id}, function(res){
                app.showloading = false
                if(res.errorCode==0){
                    app.listFax()
                }else{
                    warn("失败",res.errorMessage)
                }      
            })
        },
        submit: function (event) {
            event.preventDefault()
            this.showloading = true
            post("addfaxweb",this.addfax, function(res){
                app.showloading = false
                if(res.errorCode==0){
                    app.listFax()
                    info("邮费模板", "模板添加完毕")
                    app.addfax = {}
                }else{
                    warn(res.errorMessage)
                }
            })
        },
        listFax: function (res) {
            this.showloading = true
            post("listfax", {}, function (res) {
                if (res.errorCode == 0) {
                    app.faxs = res.data
                    app.showloading = false
                }
            })

        }
    }
})

function initdata() {
    app.listFax()

}

