var leaflet_map = L.map('mapid').setView([26.053611, -97.552014], 16);

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
  maxZoom: 18,
  attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
    '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
    'Imagery © <a href="http://mapbox.com">Mapbox</a>',
  id: 'mapbox.light'
}).addTo(leaflet_map);


// control that shows lot info on hover
var info = L.control();

info.onAdd = function(leaflet_map) {
  this._div = L.DomUtil.create('div', 'info');
  this.update();
  return this._div;
};

info.update = function(props) {
  this._div.innerHTML = '<h4>Lot info:</h4>' + 
    (props ? '<b>' + props.fid + ' lot ID</sup>':'Hover over a lot');
};

info.addTo(leaflet_map);


// get color depending on population density value
function getColor(d) {
  return d > 56 ? '#800026' :
    d > 48 ? '#BD0026' :
    d > 40 ? '#E31A1C' :
    d > 32 ? '#FC4E2A' :
    d > 24 ? '#FD8D3C' :
    d > 16 ? '#FEB24C' :
    d > 8 ? '#FED976' :
    '#FFEDA0';
}

function style_lots(feature) {
  return {
    weight: 2,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    fillOpacity: 0.7,
    fillColor: getColor(feature.properties.fid)
  };
}

function style_lake(feature) {
  return {
    weight: 2,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    fillOpacity: 0.7,
    fillColor: '#0000ff'
  };
}

function style_street(feature) {
  return {
    weight: 2,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    fillOpacity: 0.7,
    fillColor: '#800080'
  };
}

function highlightFeature(e) {
  var layer = e.target;

  layer.setStyle({
    weight: 5,
    color: '#666',
    dashArray: '',
    fillOpacity: 0.7
  });

  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }

  info.update(layer.feature.properties);
}

var geojsonLayerLots;

function resetHighlight(e) {
  geojsonLayerLots.resetStyle(e.target);
  info.update();
}

function zoomToFeature(e) {
  leaflet_map.fitBounds(e.target.getBounds());
}

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: zoomToFeature
  });
}

console.log("loading layers")
var geojsonLayerLake = new L.GeoJSON.AJAX("/files/lake.geojson", {
  style: style_lake
});
var geojsonLayerLots = new L.GeoJSON.AJAX("/files/lots.geojson", {
  style: style_lots,
  onEachFeature: onEachFeature
});
var geojsonLayerStreet = new L.GeoJSON.AJAX("/files/street.geojson", {
  style: style_street
});

console.log("Adding layers to leaflet_map")
geojsonLayerLake.addTo(leaflet_map);
geojsonLayerLots.addTo(leaflet_map);
geojsonLayerStreet.addTo(leaflet_map);


// Add layers from in memory
//	geojsonLayerLots = L.geoJson(lots, {
//		style: style_lots,
//		onEachFeature: onEachFeature
//	}).addTo(leaflet_map);
//	
//	geojsonLayerLake = L.geoJson(lake, {
//		style: style_lake,
//	}).addTo(leaflet_map);
//	
//	geojsonLayerStreet = L.geoJson(street, {
//		style: style_street,
//	}).addTo(leaflet_map);
//	

leaflet_map.attributionControl.addAttribution('Map by vitto');


var legend = L.control({
  position: 'bottomright'
});

legend.onAdd = function(leaflet_map) {

  var div = L.DomUtil.create('div', 'info legend');
  var grades = [0, 8, 16, 24, 32];
  var labels = [];
  var label_words = ["sold", "not sold", "reserved", "pending", "for lake use"];
  var from, to;

  for (var i = 0; i < grades.length; i++) {
    from = grades[i];
    to = grades[i + 1];

    labels.push(
      '<i style="background:' + getColor(from + 1) + '"></i> ' +
      label_words[i]);
  }

  div.innerHTML = labels.join('<br>');
  return div;
};
legend.addTo(leaflet_map);
