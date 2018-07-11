var lakeStyle = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#92c5eb'
  })
});

var lotsStyle = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#987654'
  }),
  stroke: new ol.style.Stroke({
          color: '#D3D3D3',
          width: 2
  }),
});

var parkStyle = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#6b8e23'
  })
});

var streetStyle = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#6F6E63'
  }),
  stroke: new ol.style.Stroke({
          color: '#fade84',
          width: 2
  }),
});

var lakeHighlightStyle = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#92c5eb'
  })
});

var lotsHighlightStyle = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#987654'
  }),
  stroke: new ol.style.Stroke({
          color: '#ffffff',
          width: 2
  }),
});

var parkHighlightStyle = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#6b8e23'
  })
});

var streetHighlightStyle = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#6F6E63'
  }),
  stroke: new ol.style.Stroke({
          color: '#ffff00',
          width: 2
  }),
});

var mapid = new ol.Map({
        target: 'mapid',
        layers: [
          new ol.layer.Tile({
            source: new ol.source.OSM()
          }),
		  new ol.layer.Vector({
			source: new ol.source.Vector({
				format: new ol.format.GeoJSON(),
				url: '/files/lake.geojson',
				}),
			style: lakeStyle
		}),
		  new ol.layer.Vector({
			source: new ol.source.Vector({
				format: new ol.format.GeoJSON(),
				url: '/files/lots.geojson'
				}),
			style: lotsStyle
		}),
		  new ol.layer.Vector({
			source: new ol.source.Vector({
				format: new ol.format.GeoJSON(),
				url: '/files/park.geojson'
				}),
			style: parkStyle
		}),
		  new ol.layer.Vector({
			source: new ol.source.Vector({
				format: new ol.format.GeoJSON(),
				url: '/files/street.geojson'
				}),
			style: streetStyle
		})
        ],
        view: new ol.View({
          center: ol.proj.fromLonLat([-97.553, 26.053]),
		  rotation: Math.PI / 2.17,
          zoom: 17
	})
});