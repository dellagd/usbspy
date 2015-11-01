var dataUpdate;
var tick = 200;
var points = [];

$(document).ready(function() {
    chart = new Highcharts.Chart({
    	chart: {
    		renderTo: 'chartDiv',
            defaultSeriesType: 'line',
            events: {
                load: startRefresh
            },
    		borderWidth: 2,
    		borderColor: "#C0C0C0",
    		
			style: {
	            fontFamily: 'sans-serif'
	        }
        },
        title: {
            text: 'Current',
            style: {
                fontWeight: 'bold'
            }
        },
        legend: {
            enabled: false
        },
        tooltip: {
            enabled: true,
            hideDelay: 5,
            pointFormat: "{point.y:.2f} mA"
        },
        xAxis: {
            title: {
                text: 'Time',
                margin: 15
            },
            labels: {
            	enabled: true,
            	format: " "
            },
            gridLineWidth: 1
        },
        yAxis: {
            title: {
                text: 'Milliamps',
                margin: 15
            },
            
            min: 0,
            max: 500
        },
        series: [{
            name: 'Current (mA)',
//            data: [[0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],
//                   [11,5],[12,5],[13,5],[14,5],[15,5],[16,5],[17,5],[18,5],[19,5],[20,5]]
        }],
        plotOptions: {
            series: {
                marker: {
                    enabled: false
                },
                states: {
                    hover: {
                        enabled: false
                    }
                }
            }
        },
        credits: {
        	enabled: true
        }
    });
});

function startRefresh(){
	dataUpdate = setInterval(function () {requestData()}, 50);

	for (i = 0; i < 400; i++){
		var point = new Highcharts.Point();
	    point.y = 10;

		points.push(point);
	}
}

function killRefresh(){
	clearInterval(dataUpdate);
}

function requestData() {    

}