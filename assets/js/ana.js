var app = new Vue({
    el: '#mainarea',
    data: {
        con: "order",
        pros:[],
        orderana: { waitpay: 0, waitsend: 0, waitfin: 0, fin: 0 },
        showloading: false,
        firstload: true,
        isloadpro:false
    },
    methods: {

        initorderrmbana: function (paydata, countdata) {

            var myChart = echarts.init(document.getElementById('rmborder'));
            option = {
                tooltip: {
                    trigger: 'item',
                    formatter: '{a} <br/>{b}: {c} ({d}%)'
                },
                legend: {
                    orient: 'vertical',
                    left: 10,
                    data: ['订单金额', '订单数']
                },
                series: [
                    {
                        name: '订单金额',
                        type: 'pie',
                        selectedMode: 'single',
                        radius: [0, '30%'],

                        label: {
                            position: 'inner'
                        },
                        labelLine: {
                            show: false
                        },
                        data: paydata
                    },
                    {
                        name: '订单数',
                        type: 'pie',
                        radius: ['40%', '55%'],
                        label: {
                            formatter: '{a|{a}}{abg|}\n{hr|}\n  {b|{b}：}{c}  {per|{d}%}  ',
                            backgroundColor: '#eee',
                            borderColor: '#aaa',
                            borderWidth: 1,
                            borderRadius: 4,
                            shadowBlur: 3,
                            shadowOffsetX: 2,
                            shadowOffsetY: 2,
                            shadowColor: '#999',
                            padding: [0, 7],
                            rich: {
                                a: {
                                    color: '#999',
                                    lineHeight: 22,
                                    align: 'center'
                                },
                                abg: {
                                    backgroundColor: '#333',
                                    width: '100%',
                                    align: 'right',
                                    height: 22,
                                    borderRadius: [4, 4, 0, 0]
                                },
                                hr: {
                                    borderColor: '#aaa',
                                    width: '100%',
                                    borderWidth: 0.5,
                                    height: 0
                                },
                                b: {
                                    fontSize: 16,
                                    lineHeight: 33
                                },
                                per: {
                                    color: '#eee',
                                    backgroundColor: '#334455',
                                    padding: [2, 4],
                                    borderRadius: 2
                                }
                            }
                        },
                        data: countdata
                    }
                ]
            };

            // 使用刚指定的配置项和数据显示图表。

            myChart.setOption(option);

        },

        initorderpointana: function (paydata, countdata) {
            var myChart = echarts.init(document.getElementById('pointorder'));
            option = {
                tooltip: {
                    trigger: 'item',
                    formatter: '{a} <br/>{b}: {c} ({d}%)'
                },
                legend: {
                    orient: 'vertical',
                    left: 10,
                    data: ['订单金额', '订单数']
                },
                series: [
                    {
                        name: '订单金额',
                        type: 'pie',
                        selectedMode: 'single',
                        radius: [0, '30%'],

                        label: {
                            position: 'inner'
                        },
                        labelLine: {
                            show: false
                        },
                        data: paydata
                    },
                    {
                        name: '订单数',
                        type: 'pie',
                        radius: ['40%', '55%'],
                        label: {
                            formatter: '{a|{a}}{abg|}\n{hr|}\n  {b|{b}：}{c}  {per|{d}%}  ',
                            backgroundColor: '#eee',
                            borderColor: '#aaa',
                            borderWidth: 1,
                            borderRadius: 4,
                            shadowBlur: 3,
                            shadowOffsetX: 2,
                            shadowOffsetY: 2,
                            shadowColor: '#999',
                            padding: [0, 7],
                            rich: {
                                a: {
                                    color: '#999',
                                    lineHeight: 22,
                                    align: 'center'
                                },
                                abg: {
                                    backgroundColor: '#333',
                                    width: '100%',
                                    align: 'right',
                                    height: 22,
                                    borderRadius: [4, 4, 0, 0]
                                },
                                hr: {
                                    borderColor: '#aaa',
                                    width: '100%',
                                    borderWidth: 0.5,
                                    height: 0
                                },
                                b: {
                                    fontSize: 16,
                                    lineHeight: 33
                                },
                                per: {
                                    color: '#eee',
                                    backgroundColor: '#334455',
                                    padding: [2, 4],
                                    borderRadius: 2
                                }
                            }
                        },
                        data: countdata
                    }
                ]
            };
            myChart.setOption(option);
        },



        initorderana: function (res) {
            let data = res
            let paydata = [{ value: data.rmb.waitsend, name: '待发货' },
            { value: data.rmb.waitfin, name: '待签收' },
            { value: data.rmb.fin, name: '已完成' }]

            let pointdata = [{ value: data.point.waitsend, name: '待发货' },
            { value: data.point.waitfin, name: '待签收' },
            { value: data.point.fin, name: '已完成' }]

            let countrmbdata = [
                { value: data.ocrmb.waitsend, name: '待发货' },
                { value: data.ocrmb.waitfin, name: '待签收' },
                { value: data.ocrmb.fin, name: '已完成' }
            ]
            let countpointdata = [
                { value: data.ocpoint.waitsend, name: '待发货' },
                { value: data.ocpoint.waitfin, name: '待签收' },
                { value: data.ocpoint.fin, name: '已完成' }
            ]
            this.initorderrmbana(paydata, countrmbdata)
            this.initorderpointana(pointdata, countpointdata);
        },

        initproana: function (res) {
            this.isloadpro = true
            this.pros = res
            setTimeout(() => {
                $.HSCore.components.HSDatatables.init('.js-datatable');
            }, 1000);

            var hours = [];
            var days = [];
            var data = [];
            for(let i=0;i<res.length;++i){
                hours.push(res[i].shopname.substr(0, 10))
                data.push([res[i].rmb, i, 7])
            }


            option = {
                legend: {
                    data: ['销售额'],
                    left: 'right'
                },
                polar: {},
                tooltip: {
                    formatter: function (params) {
                        return params.value[0];
                    }
                },
                angleAxis: {
                    type: 'category',
                    data: hours,
                    boundaryGap: false,
                    splitLine: {
                        show: true,
                        lineStyle: {
                            color: '#999',
                            type: 'dashed'
                        }
                    },
                    axisLine: {
                        show: false
                    }
                },
                radiusAxis: {
                    type: 'category',
                    data: days,
                    axisLine: {
                        show: false
                    },
                    axisLabel: {
                        rotate: 45
                    }
                },
                series: [{
                    name: '销售额',
                    type: 'scatter',
                    coordinateSystem: 'polar',
                    symbolSize: function (val) {
                        return val[2] * 2;
                    },
                    data: data,
                    animationDelay: function (idx) {
                        return idx * 5;
                    },

                }]
            };
            var myChart = echarts.init(document.getElementById('prosale'));
            myChart.setOption(option);
        },
        loadproana: function () {
            this.con = "pro"
            if(!this.isloadpro){
                post("webshopana", { cate: "pro" }, this.initproana)
            }
            
        },

        loadorderana: function () {
            this.con = "order"
           
            post("webshopana", { cate: "order" }, this.initorderana)
        },

        loadana: function () {
            post("getordercountana", {}, function (res) {
                if (res.errorCode == 0) {
                    app.orderana.waitpay = res.data.waitpay
                    app.orderana.waitsend = res.data.waitsend
                    app.orderana.waitfin = res.data.waitfin
                }

            })
        },

    }
})

function initdata() {
    app.loadana()
    app.loadorderana()
}

