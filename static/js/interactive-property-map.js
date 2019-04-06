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

var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');

var overlay = new ol.Overlay({
  element: container,
  autoPan: true,
  autoPanAnimation: {
    duration: 250
  }
});

closer.onclick = function() {
  overlay.setPosition(undefined);
  closer.blur();
  return false;
};

mapboxKey = 'pk.eyJ1IjoibGFnb3ZpdHRvcmlvIiwiYSI6ImNqazZvYWdnZTB6bjMzcG1rcDR1bGpncm0ifQ.E_grlJASX59FUqTlksn09Q'

/* Possibly better vector tile implementation */
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

var layerOsmStreet = new ol.layer.Tile({
    title: 'OpenStreetMap',
    type: 'base',
    source: new ol.source.OSM(),
    opacity: 1.0
});

var layerMapboxSatellite =  new ol.layer.Tile({
    title: 'Mapbox Satellite Streets',
    type: 'base',
    source: new ol.source.XYZ({
    attributions: '© <a href="https://www.mapbox.com/map-feedback/">Mapbox</a> ' +
      '© <a href="https://www.openstreetmap.org/copyright">' +
      'OpenStreetMap contributors</a>',
      url: 'https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v10/tiles/256/' +
                  '{z}/{x}/{y}?access_token=' + mapboxKey
	}),
	opacity: 1.0
});

var layerWatercolors = new ol.layer.Group({
    title: 'Watercolors',
    type: 'base',
    combine: true,
    layers:[
             new ol.layer.Tile({
                 source: new ol.source.Stamen({
                     layer: 'watercolor'
                 })
             }),
             new ol.layer.Tile({
                 source: new ol.source.Stamen({
                     layer: 'terrain-labels'
                 })
             })
         ],
    opacity: 1.0
});

var layerVectorLake = new ol.layer.Vector({
	title: 'Lake layer',
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
	title: 'Lot layer',
	source: new ol.source.Vector({
		format: new ol.format.GeoJSON(),
		url: '/files/lots.geojson'
		}),
	style: styleFunction,
	opacity: 0.5
});

var layerVectorPark =  new ol.layer.Vector({
	title: 'Park layer',
	source: new ol.source.Vector({
		format: new ol.format.GeoJSON(),
		url: '/files/park.geojson'
		}),
	style: stylePark,
	opacity: 0.5
});

var layerVectorStreet = new ol.layer.Vector({
	title: 'Street layer',
	source: new ol.source.Vector({
		format: new ol.format.GeoJSON(),
		url: '/files/street.geojson'
		}),
	style: styleStreet,
	opacity: 0.8
});

var olLayerGroupBasemaps = new ol.layer.Group({
    title: 'Base maps',
    layers: [
	    layerOsmStreet,
	    layerWatercolors,
            layerMapboxSatellite
    ]
});

var olLayerGroupOverlays = new ol.layer.Group({
    title: 'Overlays',
    layers: [
            layerVectorLake,
	    layerVectorLots,
	    layerVectorPark,
	    layerVectorStreet
    ]
});

var layerSwitcher = new ol.control.LayerSwitcher({
   tipLabel: 'Legend'
});

var controlMousePosition = new ol.control.MousePosition({
  coordinateFormat: function(coordinate) {
      return ol.coordinate.format(coordinate, '<span>{y}N, {x}W</span>', 4);},
  projection: 'EPSG:4326',
  className: 'ol-control ol-mouse-position',
  undefinedHTML: ''
}); 

var olViewRotated = new ol.View({
        center: ol.proj.fromLonLat([-97.553, 26.053]),
	rotation: Math.PI / 2.17,
        zoom: 17
});

var olView = new ol.View({
        center: ol.proj.fromLonLat([-97.553, 26.053]),
        zoom: 16
});

var olViewSelector = function(){
 
 if ( window.innerHeight > window.innerWidth ) {
    console.log("initializing map in portrait mode")
    return olView
  } else {
    console.log("initializing map in landscape mode")
    return olViewRotated
  }
}

var olMap = new ol.Map({
        target: 'ol-map',
        controls: [
		new ol.control.Attribution(),
		new ol.control.Rotate(),
		new ol.control.Zoom(),
		new ol.control.FullScreen(),
		// new ol.control.ScaleLine(),
		controlMousePosition,
		layerSwitcher
    	],
        overlays: [overlay],
	layers: [
		olLayerGroupBasemaps,
		olLayerGroupOverlays
		],
        view: olViewSelector()

});

var featureCalculateAreaMeters = function(feature) {
    var format = new ol.format.GeoJSON();
    var turfFeature = format.writeFeatureObject(feature, {'featureProjection': 'EPSG:3857'});
    var area = turf.area(turfFeature);
    return area
};


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


var retrieveFeatureInfoTable = function (evt) {
  var feature = retrieveFeature(evt.pixel);
  var area = featureCalculateAreaMeters(feature);
  var temp_string = 
`<table style="width:100%">
  <tr>
    <th>Entry</th>
    <th>Value</th>
  </tr>
  <tr>
    <td>Coordinates HDMS</td>
    <td><code>` + ol.coordinate.toStringHDMS(ol.proj.toLonLat(evt.coordinate)) + `</code></td>
  </tr>
  <tr>
    <td>Coordinates Lat/Lon</td>
    <td><code>` + ol.coordinate.format(ol.proj.toLonLat(evt.coordinate), '{y}N, {x}W', 4) + `</code></td>
  </tr>
  <tr>
    <td>Name</td>
    <td><code>` + feature.get('name') + `</code></td>
  </tr>
  <tr>
    <td>Status</td>
    <td><code>` + feature.get('status') + `</code></td>
  </tr>
  <tr>
    <td>Area [m^2]</td>
    <td><code>` + area.toFixed(2) + `</code></td>
  </tr>
  <tr>
    <td>Area [ft^2]</td>
    <td><code>` + (10.7639*area).toFixed(2)+ `</code></td>
  </tr>
</table>`

  return temp_string;
}

/* Event call-backs */

olMap.on('pointermove', function(evt) {
  if (evt.dragging) {
    console.debug("dragging detected")
    return;
  }
  var pixel = olMap.getEventPixel(evt.originalEvent);
  var feature = retrieveFeature(pixel);

  /* feature can be null */
  if (typeof feature === 'undefined') {
    console.debug("no feature found on mouse-over")
    return
  }
  
  featureHighlight(feature);
});

olMap.on('click', function(evt) {
  var feature = retrieveFeature(evt.pixel);

  /* feature can be null */
  if (typeof feature  === 'undefined') {
    console.log("no feature found under click or tap")
    return
  }
  
  content.innerHTML = retrieveFeatureInfoTable(evt);
  overlay.setPosition(evt.coordinate);
  featureHighlight(feature);
  
  var extent = feature.getGeometry().getExtent();
  olMap.getView().fit(extent, {duration: 500, padding: [50,50,50,50]})
 
});

window.addEventListener("orientationchange", function() {
  //console.log("the orientation of the device is now " + screen.orientation.angle);

  if ( screen.orientation.angle  === 0) {
    console.log("rotating map to portrait mode")
    olMap.setView(olView);
  } else {
    console.log("rotating map to landscape mode")
    olMap.setView(olViewRotated);
  }

});
