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

var styleHighlightLake = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#92c5eb'
  })
});

var styleHighlightLots = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#987654'
  }),
  stroke: new ol.style.Stroke({
          color: '#ffffff',
          width: 2
  }),
});

var styleHighlightPark = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#6b8e23'
  })
});

var styleHighlightStreet = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#6F6E63'
  }),
  stroke: new ol.style.Stroke({
          color: '#ffff00',
          width: 2
  }),
});

var styleHighlight = new ol.style.Style({
  stroke: new ol.style.Stroke({
          color: '#ffffff',
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
		  
var mapid = new ol.Map({
        target: 'mapid',
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


var hoverInteraction = new ol.interaction.Select({
    condition: ol.events.condition.pointerMove,
    layers: [
		  	layerVectorLake,
			layerVectorLots,
			layerVectorPark,
			layerVectorStreet
    ],
});
mapid.addInteraction(hoverInteraction);

var featureOverlayMouseover = new ol.layer.Vector({
	source: new ol.source.Vector(),
    map: mapid,
    style: function(feature) {
          styleHighlight.getText().setText(feature.get('name'));
          return styleHighlight;
        }
});

hoverInteraction.on('select', function(evt){
    if(evt.selected.length > 0){
        console.info('selected: ' + evt.selected[0].getId());
        
    }
});

