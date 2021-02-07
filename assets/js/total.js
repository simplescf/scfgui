var app = new Vue({
    el: '#mainarea',
    data: {
        memcount: 0,
        rmb: 0,
        point: 0,
        stars: [],
        counts:[]
    },
    methods: {
        getpie:function(title,item, data){
            return option = {
                title: {
                    text: title,
                    left: 'center'
                },
                tooltip: {
                    trigger: 'item',
                    formatter: '{a} <br/>{b} : {c} ({d}%)'
                },
                legend: {
                    orient: 'vertical',
                    left: 'left',
                    data: item
                },
                series: [
                    {
                        name: '访问来源',
                        type: 'pie',
                        radius: '55%',
                        center: ['50%', '60%'],
                        data: data,
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        }
                    }
                ]
            };
        },

        totalana:function(){
            let data = [{name:"有效话题", value:this.counts.infoval},
            {name:"被删话题", value:this.counts.infodel},
            {name:"有效点评", value:this.counts.noteval},
            {name:"被删点评", value:this.counts.notedel},
            {name:"点赞总数", value:this.counts.notedel},]
            let items = ["有效话题", "被删话题","有效点评","被删点评","点赞总数"]
            var myChart = echarts.init(document.getElementById('countana'));
            myChart.setOption(this.getpie("全平台话题类型分布", items, data));
        },

        loadinfo: function () {
            let items = []
            let data = []
            for(let i=0;i<this.stars.length;++i){
                items.push(this.stars[i].name)
                data.push({name:this.stars[i].name, value:this.stars[i].value})
            }
            var myChart = echarts.init(document.getElementById('infoana'));
            myChart.setOption(this.getpie("部落话题数分布图", items, data));
        }
    }
})


function finloadana(res){
    if (res.errorCode === 0) {
        app.memcount = res.data.mem
        app.rmb = res.data.rmb
        app.point = res.data.point
        app.stars = res.data.star
        app.counts = res.data.count

        app.loadinfo()
        app.totalana()
    } 
}


function loadana() {
    console.debug("abc")
    post("webgetana", {}, finloadana)    
}


