var app = new Vue({
    el: '#mainarea',
    data: {
        showloading:true,
        detail:{}
    },
    methods: {
        loadDetail:function(id){
            post("getshopdetail", {shopid:id}, function(res){
                app.showloading = false
                console.debug(res)
                if(res.errorCode==0){
                    let tmp = res.data
                    tmp.imgs =  res.data.banner
                    tmp.imgs.push(res.data.img)
                    app.detail = tmp
                    setTimeout(() => {
                        initui()
                    }, 500);
                }else{
                    warn("错误", res.errorMessage)
                }
            })
        }
    }
})

function initui(){
    $.HSCore.components.HSCarousel.init('.js-carousel');
    // initialization of header
    $.HSCore.components.HSHeader.init($('#js-header'));
    $.HSCore.helpers.HSHamburgers.init('.hamburger');

    // initialization of HSMegaMenu plugin
    $('.js-mega-menu').HSMegaMenu({
      event: 'hover',
      pageContainer: $('.container'),
      breakpoint: 991
    });

    // initialization of HSDropdown component
    $.HSCore.components.HSDropdown.init($('[data-dropdown-target]'), {
      afterOpen: function () {
        $(this).find('input[type="search"]').focus();
      }
    });

    // initialization of go to
    $.HSCore.components.HSGoTo.init('.js-go-to');

    // initialization of HSScrollBar component
    $.HSCore.components.HSScrollBar.init($('.js-scrollbar'));

    // initialization of quantity counter
    $.HSCore.components.HSCountQty.init('.js-quantity');

    // initialization of tabs
    $.HSCore.components.HSTabs.init('[role="tablist"]');

    // initialization of rating
    $.HSCore.helpers.HSRating.init();
}

function initdata() {
    let id = getUrlParam("id")
    app.loadDetail(id)
}

