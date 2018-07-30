var styleLake = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#92c5eb'
  })
});

var lotStyles = {
        'FOR SALE': new ol.style.Style({
			fill: new ol.style.Fill({
			color: '#2dd187'
			}),
			stroke: new ol.style.Stroke({
            color: '#D3D3D3',
            width: 2
			}),
		}),
        'PRE-SALE': new ol.style.Style({
			fill: new ol.style.Fill({
			color: '#885ead'
		}),
			stroke: new ol.style.Stroke({
            color: '#D3D3D3',
            width: 2
			}),
        }),
        'SOLD': new ol.style.Style({
			fill: new ol.style.Fill({
			color: '#c03425'
		}),
			stroke: new ol.style.Stroke({
            color: '#D3D3D3',
            width: 2
			}),
        }),
};

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

mapboxKey = 'pk.eyJ1IjoibGFnb3ZpdHRvcmlvIiwiYSI6ImNqazZvYWdnZTB6bjMzcG1rcDR1bGpncm0ifQ.E_grlJASX59FUqTlksn09Q'

/* var layerVectorTileMapboxStreets =  new ol.layer.VectorTile({
    declutter: true,
    source: new ol.source.VectorTile({
      attributions: '© <a href="https://www.mapbox.com/map-feedback/">Mapbox</a> ' +
        '© <a href="https://www.openstreetmap.org/copyright">' +
        'OpenStreetMap contributors</a>',
      format: new ol.format.MVT(),
      url: 'https://{a-d}.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6/' +
                  '{z}/{x}/{y}.vector.pbf?access_token=' + mapboxKey
	}),
            style: createMapboxStreetsV6Style(ol.style.Style, ol.style.Fill, ol.style.Stroke, ol.style.Icon, ol.style.Text)
}); */

var layerMapboxSatellite =  new ol.layer.Tile({
    source: new ol.source.XYZ({
      attributions: '© <a href="https://www.mapbox.com/map-feedback/">Mapbox</a> ',
      url: 'https://a.tiles.mapbox.com/v4/mapbox.satellite/' +
                  '{z}/{x}/{y}.png?access_token=' + mapboxKey
	}),
	opacity: 0.4
});

var layerVectorLake = new ol.layer.Vector({
	source: new ol.source.Vector({
		format: new ol.format.GeoJSON(),
		url: '/files/lake.geojson',
		}),
	style: styleLake,
	opacity: 0.8
});

var styleFunction = function(feature) {
   return lotStyles[feature.get('status')];
};

var layerVectorLots = new ol.layer.Vector({
	source: new ol.source.Vector({
		format: new ol.format.GeoJSON(),
		url: '/files/lots.geojson'
		}),
	style: styleFunction,
	opacity: 0.5
});

var layerVectorPark =  new ol.layer.Vector({
	source: new ol.source.Vector({
		format: new ol.format.GeoJSON(),
		url: '/files/park.geojson'
		}),
	style: stylePark,
	opacity: 0.5
});

var layerVectorStreet = new ol.layer.Vector({
	source: new ol.source.Vector({
		format: new ol.format.GeoJSON(),
		url: '/files/street.geojson'
		}),
	style: styleStreet,
	opacity: 0.8
});

var layerOsmStreet = new ol.layer.Tile({
  source: new ol.source.OSM(),
  	opacity: 0.8
});

var controlMousePosition = new ol.control.MousePosition({
  coordinateFormat: ol.coordinate.createStringXY(4),
  projection: 'EPSG:4326',
  // comment the following two lines to have the mouse position
  // be placed within the map.
  className: 'custom-mouse-position',
  target: document.getElementById('mouse-position'),
  undefinedHTML: '&nbsp;'
}); 

var controlDefault = new ol.control.defaults({
        attributionOptions: {
            collapsible: true
            },
        }).extend([controlMousePosition]);

var olMap = new ol.Map({
        target: 'ol-map',
		controls: controlDefault,
        layers: [
			layerOsmStreet,
			layerMapboxSatellite,
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
    var format = new ol.format.GeoJSON();
	var turfFeature = format.writeFeatureObject(feature, {'featureProjection': 'EPSG:3857'});
    var area = turf.area(turfFeature);
	
      info.innerHTML = 'The status for area  ' + feature.get('name') + '  is  ' + feature.get('status') + '  and area is  ' + area.toFixed(2) + ' square meters or  ' +  (10.7639*area).toFixed(2) + ' square feet';
    } else {
      info.innerHTML = 'Please hover, click, or tap on a feature for more info!';
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

