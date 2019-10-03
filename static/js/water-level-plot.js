Plotly.d3.csv("https://docs.google.com/spreadsheets/d/1MgSxyI_AJyMk7-ZpGUoRCUcpONm7CMwWDo2diG-71IU/export?format=csv", function(err, rows){

function unpack(rows, key) {
  return rows.map(function(row) { return row[key]; });
}
    
var trace1 = {
  type: "scatter",
  mode: "lines",
  name: 'Water Level [feet]',
  x: unpack(rows, 'Timestamp ISO8601'),
  y: unpack(rows, 'water level [ft]'),
  line: {color: '#000080'}
}


var data = [trace1];
    
var layout = {
  title: 'Lago Bello - Lake Water Level [ft]', 
  xaxis: {
    autorange: true, 
      range: ['2019-01-01', '2019-12-12'],
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
    rangeslider: {range: ['2019-01-01', 'today']},
      type: 'date'
  }, 
  yaxis: {
    autorange: true, 
    range: [0, 10], 
    type: 'linear'
  }
};

Plotly.newPlot('waterLevel', data, layout);
} )