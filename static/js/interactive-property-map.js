var mousePositionControl = new ol.control.MousePosition({
  coordinateFormat: ol.coordinate.createStringXY(4),
  projection: 'EPSG:4326',
  // comment the following two lines to have the mouse position
  // be placed within the map.
  className: 'custom-mouse-position',
  target: document.getElementById('mouse-position'),
  undefinedHTML: '&nbsp;'
}); 
  
var styleLake = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#92c5eb'
  })
});

var styleLots = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#987654'
  }),
  stroke: new ol.style.Stroke({
          color: '#D3D3D3',
          width: 2
  }),
});

var stylePark = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#6b8e23'
  })
});

var styleStreet = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#6F6E63'
  }),
  stroke: new ol.style.Stroke({
          color: '#fade84',
          width: 2
  }),
});

var styleHighlight = new ol.style.Style({
  stroke: new ol.style.Stroke({
          color: 'blue',
          width: 3
  }),
});

var layerVectorLake = new ol.layer.Vector({
	source: new ol.source.Vector({
		format: new ol.format.GeoJSON(),
		url: '/files/lake.geojson',
		}),
	style: styleLake
});

var layerVectorLots = new ol.layer.Vector({
	source: new ol.source.Vector({
		format: new ol.format.GeoJSON(),
		url: '/files/lots.geojson'
		}),
	style: styleLots
});

var layerVectorPark =  new ol.layer.Vector({
	source: new ol.source.Vector({
		format: new ol.format.GeoJSON(),
		url: '/files/park.geojson'
		}),
	style: stylePark
});

var layerVectorStreet = new ol.layer.Vector({
	source: new ol.source.Vector({
		format: new ol.format.GeoJSON(),
		url: '/files/street.geojson'
		}),
	style: styleStreet
});

var layerTileOsm = new ol.layer.Tile({
  source: new ol.source.OSM(),
});
		  
var olMap = new ol.Map({
        target: 'ol-map',
		controls: ol.control.defaults({
          attributionOptions: {
            collapsible: true
          }
        }).extend([mousePositionControl]),
        layers: [
			layerTileOsm,
		  	layerVectorLake,
			layerVectorLots,
			layerVectorPark,
			layerVectorStreet
        ],
        view: new ol.View({
          center: ol.proj.fromLonLat([-97.553, 26.053]),
		  rotation: Math.PI / 2.17,
          zoom: 17
	})
});

var featureOverlayHighlight = new ol.layer.Vector({
	source: new ol.source.Vector(),
    map: olMap,
    style: styleHighlight
});

var highlight;

var featureHighlight = function(feature) {
  
  if (feature !== highlight) {
    if (highlight) {
      featureOverlayHighlight.getSource().removeFeature(highlight);
    }
    if (feature) {
      featureOverlayHighlight.getSource().addFeature(feature);
    }
    highlight = feature;
  }
};

var retrieveFeature = function(pixel) {
  var feature = olMap.forEachFeatureAtPixel(pixel, function(feature) {
    return feature;
  });
  return feature;
};

var displayFeatureInfo = function(feature) {

  var info = document.getElementById('feature-name');
  if (feature) {
      // console.log(feature.get('name'));
      // console.log(feature.get('status'));
      info.innerHTML = 'The status for area  ' + feature.get('name') + '  is  ' + feature.get('status');
    } else {
      info.innerHTML = 'Please hover or click on a feature for more info.';
    }

};

 olMap.on('pointermove', function(evt) {
   if (evt.dragging) {
     return;
   }
   var pixel = olMap.getEventPixel(evt.originalEvent);
   var feature = retrieveFeature(pixel);
   displayFeatureInfo(feature);
   featureHighlight(feature);
 });

 olMap.on('click', function(evt) {
   var feature = retrieveFeature(evt.pixel);
   displayFeatureInfo(feature);
   featureHighlight(feature);
   
   var extent = feature.getGeometry().getExtent();
   olMap.getView().fit(extent, {duration: 500, padding: [50,50,50,50]})
  
 });

