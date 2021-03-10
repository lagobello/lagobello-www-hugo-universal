function makeplot() {
 	Plotly.d3.csv("https://docs.google.com/spreadsheets/d/1MgSxyI_AJyMk7-ZpGUoRCUcpONm7CMwWDo2diG-71IU/export?format=csv", function(data){ processData(data) } );

};

function processData(allRows) {
	
	if (allRows == null){
		console.log('Failed to retrieve data. Unable to build plot.');
	   return -1
	}
	
	var x = [], y = [], standard_deviation = [];

	for (var i=0; i<allRows.length; i++) {
		row = allRows[i];
		x.push( row['Timestamp ISO8601'] );
		y.push( row['water level [ft]'] );
	}
    var valueLatest = getValueLatest(x, y);
    var valueFromOneHourBefore = getValueFromOneHourBefore(x, y);
    var valueFromOneDayBefore = getValueFromOneDayBefore(x, y);
    var valueFromOneWeekBefore = getValueFromOneWeekBefore(x, y);
    var valueFromOneMonthBefore = getValueFromOneMonthBefore(x, y);
    makeScatterPlot(x,y,'Lake Water Level [ft]', "waterLevelScatter")
    makeDiffGauge(valueLatest,valueFromOneHourBefore, "Hourly Change [ft]", "waterLevelChangeHour")
    makeDiffGauge(valueLatest,valueFromOneDayBefore, "Daily Change [ft]", "waterLevelChangeDay")
    makeDiffGauge(valueLatest,valueFromOneWeekBefore, "Weekly Change [ft]", "waterLevelChangeWeek")
    makeDiffGauge(valueLatest,valueFromOneMonthBefore, "Monthly Change [ft]", "waterLevelChangeMonth")
}

function getValueLatest(x, y) {
    console.log('x head is', x[x.length-1], 'y head is', y[y.length-1] );
    return y[y.length-1]
}

function getValueFromOneHourBefore(x, y) {
    console.log('x head-1 is', x[x.length-2], 'y head-1 is', y[y.length-2] );
    return y[y.length-2]
}

function getValueFromOneDayBefore(x, y) {
    console.log('x head-24 is', x[x.length-24], 'y head-24 is', y[y.length-24] );
    return y[y.length-24]
}

function getValueFromOneWeekBefore(x, y) {
    console.log('x head-168 is', x[x.length-168], 'y head-168 is', y[y.length-168] );
    return y[y.length-168]
}

function getValueFromOneMonthBefore(x, y) {
    console.log('x[0] is', x[0], 'y[0] is', y[0] );
    return y[0]
}

function makeDiffGauge( valueCurrent, valuePrevious, title, div ){
    var data = [
        {
            domain: { x: [0, 1], y: [0, 1] },
            value: valueCurrent,
            title: { text: title },
            gauge: { bar: { color: "#8fbbd9" }},
            delta: { reference: valuePrevious },
            type: "indicator",
            mode: "gauge+number+delta"
        }
    ];
    var layout = { height: 250, width: 400, margin: { t: 0, b: 0 } };
    Plotly.newPlot(div, data, layout, {displaylogo: false});
};

function makeScatterPlot( x, y, title, div ){
    var trace1 = {
      type: "scatter",
      mode: "lines",
      name: 'Water Level [feet]',
      fill: 'tozeroy',
      x: x,
      y: y,
    }
    var data = [trace1];   
    
    var layout = {
          title: title, 

          xaxis: {
            autorange: true, 
            rangeselector: {buttons: [
                {
                  count: 1, 
                  label: '1m', 
                  step: 'month', 
                  stepmode: 'backward'
                }, 
                {
                  count: 6, 
                  label: '6m', 
                  step: 'month', 
                  stepmode: 'backward'
                }, 
                {step: 'all'}
              ]}, 
            rangeslider: {},
              type: 'date'
          }, 
          yaxis: {
            autorange: false, 
            range: [0, 6], 
            type: 'linear'
          }
        };
    
    Plotly.newPlot(div, data, layout, {displaylogo: false});
};

makeplot();
