var app = new Vue({
    el: '#mainarea',
    data: {
        weekrmb: {}
    },
    methods: {
        loadinfo: function (res) {
            let data = res.data
            var myChart = echarts.init(document.getElementById('infoana'));
            myChart.hideLoading();

        

            myChart.setOption(option = {
                tooltip: {
                    trigger: 'item',
                    triggerOn: 'mousemove'
                },
                series: [
                    {
                        type: 'tree',

                        data: [data],

                        top: '1%',
                        left: '7%',
                        bottom: '1%',
                        right: '20%',

                        symbolSize: 7,

                        label: {
                            position: 'left',
                            verticalAlign: 'middle',
                            align: 'right',
                            fontSize: 9
                        },

                        leaves: {
                            label: {
                                position: 'right',
                                verticalAlign: 'middle',
                                align: 'left'
                            }
                        },

                        expandAndCollapse: true,
                        animationDuration: 550,
                        animationDurationUpdate: 750
                    }
                ]
            });
        }
    }
})

function loadinfoana() {
    post("getinfoana", {}, app.loadinfo)
}
