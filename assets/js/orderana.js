
var app = new Vue({
    el: '#mainarea',
    data: {
        weekrmb: {}
    },
    methods: {
        loadweekpoint:function(data){
            
            let product = ['product']
            let wprmb = ["待付款"];
            let wsrmb = ["待发货"];
            let sendrmb = ["已发货"];
            let finrmb = ["已完成"];

            for(let i=0;i<data.length;++i){
                product.push(data[i].today)
            }
            for(let i=0;i<data.length;++i){
                wprmb.push(data[i].wp.point)
                wsrmb.push(data[i].ws.point)
                sendrmb.push(data[i].send.point)
                finrmb.push(data[i].fin.point)
            }

            var myChart = echarts.init(document.getElementById('weekpointana'));
            option = {
                legend: {},
                tooltip: {
                    trigger: 'axis',
                    showContent: false
                },
                dataset: {
                    source: [
                        product,wprmb,wsrmb,sendrmb,finrmb
                    ]
                },
                xAxis: { type: 'category' },
                yAxis: { gridIndex: 0 },
                grid: { top: '55%' },
                series: [
                    { type: 'line', smooth: true, seriesLayoutBy: 'row' },
                    { type: 'line', smooth: true, seriesLayoutBy: 'row' },
                    { type: 'line', smooth: true, seriesLayoutBy: 'row' },
                    { type: 'line', smooth: true, seriesLayoutBy: 'row' },
                    {
                        type: 'pie',
                        id: 'pie',
                        radius: '30%',
                        center: ['50%', '25%'],
                        label: {
                            formatter: '{b}: {'+data[0].today+'} ({d}%)'
                        },
                        encode: {
                            itemName: 'product',
                            value: data[0].today,
                            tooltip: data[0].today
                        }
                    }
                ]
            };
            console.debug(option)

            myChart.on('updateAxisPointer', function (event) {
                var xAxisInfo = event.axesInfo[0];
                if (xAxisInfo) {
                    var dimension = xAxisInfo.value + 1;
                    myChart.setOption({
                        series: {
                            id: 'pie',
                            label: {
                                formatter: '{b}: {@[' + dimension + ']} ({d}%)'
                            },
                            encode: {
                                value: dimension,
                                tooltip: dimension
                            }
                        }
                    });
                }
            });

            myChart.setOption(option);
        },

        loadweek: function (ana) {
            if(ana.errorCode!=0){
                console.error("错误代码")
                return
            }
            let data = ana.data
            this.loadweekpoint(data)

            let product = ['product']
            let wprmb = ["待付款"];
            let wsrmb = ["待发货"];
            let sendrmb = ["已发货"];
            let finrmb = ["已完成"];

            for(let i=0;i<data.length;++i){
                product.push(data[i].today)
            }
            for(let i=0;i<data.length;++i){
                wprmb.push(data[i].wp.rmb)
                wsrmb.push(data[i].ws.rmb)
                sendrmb.push(data[i].send.rmb)
                finrmb.push(data[i].fin.rmb)
            }

            var myChart = echarts.init(document.getElementById('weekrmbana'));
            option = {
                legend: {},
                tooltip: {
                    trigger: 'axis',
                    showContent: false
                },
                dataset: {
                    source: [
                        product,wprmb,wsrmb,sendrmb,finrmb
                    ]
                },
                xAxis: { type: 'category' },
                yAxis: { gridIndex: 0 },
                grid: { top: '55%' },
                series: [
                    { type: 'line', smooth: true, seriesLayoutBy: 'row' },
                    { type: 'line', smooth: true, seriesLayoutBy: 'row' },
                    { type: 'line', smooth: true, seriesLayoutBy: 'row' },
                    { type: 'line', smooth: true, seriesLayoutBy: 'row' },
                    {
                        type: 'pie',
                        id: 'pie',
                        radius: '30%',
                        center: ['50%', '25%'],
                        label: {
                            formatter: '{b}: {'+data[0].today+'} ({d}%)'
                        },
                        encode: {
                            itemName: 'product',
                            value: data[0].today,
                            tooltip: data[0].today
                        }
                    }
                ]
            };
            console.debug(option)

            myChart.on('updateAxisPointer', function (event) {
                var xAxisInfo = event.axesInfo[0];
                if (xAxisInfo) {
                    var dimension = xAxisInfo.value + 1;
                    myChart.setOption({
                        series: {
                            id: 'pie',
                            label: {
                                formatter: '{b}: {@[' + dimension + ']} ({d}%)'
                            },
                            encode: {
                                value: dimension,
                                tooltip: dimension
                            }
                        }
                    });
                }
            });

            myChart.setOption(option);

        },

        loadtotal:function(res){
            if(res.errorCode==0){
                let data = res.data
                console.debug(data)
                $("#rmb-total").text(data.rmb.total)
                $("#rmb-order").text(data.rmb.ordercount)
                $("#rmb-user").text(data.rmb.avg)
                $("#point-total").text(data.point.total)
                $("#point-order").text(data.point.ordercount)
                $("#point-user").text(data.point.avg)
            }
        }
    }
})

function loadtotal(){
    post("shoptotalana",{}, app.loadtotal)
}

function loadorder() {
    post("shopweekana",{}, app.loadweek)
}