/* eslint-env browser,jquery */
/* globals ol turf */
/* eslint semi: 2 */

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
    })
  }),
  'PRE-SALE': new ol.style.Style({
    fill: new ol.style.Fill({
      color: '#885ead'
    }),
    stroke: new ol.style.Stroke({
      color: '#D3D3D3',
      width: 2
    })
  }),
  SOLD: new ol.style.Style({
    fill: new ol.style.Fill({
      color: '#c03425'
    }),
    stroke: new ol.style.Stroke({
      color: '#D3D3D3',
      width: 2
    })
  }),
  PENDING: new ol.style.Style({
    fill: new ol.style.Fill({
      color: '#ffff00'
    }),
    stroke: new ol.style.Stroke({
      color: '#D3D3D3',
      width: 2
    })
  })
};

var styleLotCameronAppraisalDistrict = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#FFFF00'
  }),
  stroke: new ol.style.Stroke({
    color: '#000000',
    width: 1
  })
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
  })
});

var styleHighlight = new ol.style.Style({
  stroke: new ol.style.Stroke({
    color: 'blue',
    width: 3
  })
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

closer.onclick = function () {
  overlay.setPosition(undefined);
  closer.blur();
  return false;
};

var mapboxKey =
  'pk.eyJ1IjoibGFnb3ZpdHRvcmlvIiwiYSI6ImNqazZvYWdnZTB6bjMzcG1rcDR1bGpncm0ifQ.E_grlJASX59FUqTlksn09Q';

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

var layerMapboxSatellite = new ol.layer.Tile({
  title: 'Mapbox Satellite Streets',
  type: 'base',
  source: new ol.source.XYZ({
    attributions:
      '© <a href="https://www.mapbox.com/map-feedback/">Mapbox</a> ' +
      '© <a href="https://www.openstreetmap.org/copyright">' +
      'OpenStreetMap contributors</a>',
    url:
      'https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v10/tiles/256/' +
      '{z}/{x}/{y}?access_token=' +
      mapboxKey
  }),
  opacity: 1.0
});

var layerWatercolors = new ol.layer.Group({
  title: 'Watercolors',
  type: 'base',
  combine: true,
  layers: [
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

var layerDroneOrthophoto = new ol.layer.Tile({
  title: 'Drone Orthophoto 2022/07/04',
  source: new ol.source.XYZ({
    attributions:'© Vitto',
    url: '/tiles/orthophoto_20220704/{z}/{x}/{-y}.png'
  }),
  opacity: 1.0
});

var layerVectorLake = new ol.layer.Vector({
  title: 'Lake layer',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: '/files/lake.geojson'
  }),
  style: styleLake,
  opacity: 0.4
});

var styleFunction = function (feature) {
  return lotStyles[feature.get('status')];
};

var layerVectorLots = new ol.layer.Vector({
  title: 'Lot layer',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: '/files/lots.geojson'
  }),
  style: styleFunction,
  opacity: 0.4
});

var layerVectorLotsCameronAppraisalDistrict = new ol.layer.Vector({
  title: 'Lot layer - Cameron Appraisal District',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: '/files/lots_cameron_appraisal_district.geojson'
  }),
  style: styleLotCameronAppraisalDistrict,
  visible: false,
  opacity: 0.8
});

var layerVectorPark = new ol.layer.Vector({
  title: 'Park layer',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: '/files/park.geojson'
  }),
  style: stylePark,
  opacity: 0.4
});

var layerVectorStreet = new ol.layer.Vector({
  title: 'Street layer',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: '/files/street.geojson'
  }),
  style: styleStreet,
  opacity: 0.4
});

var source = new ol.source.Vector();

var layerVectorDrawings = new ol.layer.Vector({
  source: source,
  style: new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(255, 255, 255, 0.2)'
    }),
    stroke: new ol.style.Stroke({
      color: '#ffcc33',
      width: 2
    }),
    image: new ol.style.Circle({
      radius: 7,
      fill: new ol.style.Fill({
        color: '#ffcc33'
      })
    })
  })
});

var olLayerGroupBasemaps = new ol.layer.Group({
  title: 'Base maps',
  layers: [layerOsmStreet, layerWatercolors, layerMapboxSatellite]
});

var olLayerGroupOverlays = new ol.layer.Group({
  title: 'Overlays',
  layers: [
    layerDroneOrthophoto,
    layerVectorLake,
    layerVectorLots,
    layerVectorLotsCameronAppraisalDistrict,
    layerVectorPark,
    layerVectorStreet
    ]
});

var layerSwitcher = new ol.control.LayerSwitcher({
  tipLabel: 'Legend'
});

var controlMousePosition = new ol.control.MousePosition({
  coordinateFormat: function (coordinate) {
    return ol.coordinate.format(coordinate, '<span>{y}N, {x}W</span>', 4);
  },
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

var olViewSelector = function () {
  if (window.innerHeight > window.innerWidth) {
    console.log('initializing map in portrait mode');
    return olView;
  } else {
    console.log('initializing map in landscape mode');
    return olViewRotated;
  }
};

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
  layers: [olLayerGroupBasemaps, olLayerGroupOverlays, layerVectorDrawings],
  view: olViewSelector()
});

var featureCalculateAreaMeters = function (feature) {
  var format = new ol.format.GeoJSON();
  var turfFeature = format.writeFeatureObject(feature, {
    featureProjection: 'EPSG:3857'
  });
  var area = turf.area(turfFeature);
  return area;
};

var featureOverlayHighlight = new ol.layer.Vector({
  source: new ol.source.Vector(),
  map: olMap,
  style: styleHighlight
});

var highlight;

var featureHighlight = function (feature) {
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

var retrieveFeature = function (pixel) {
  var feature = olMap.forEachFeatureAtPixel(pixel, function (feature) {
    return feature;
  });
  return feature;
};

var retrieveFeatureInfoTable = function (evt) {
  var feature = retrieveFeature(evt.pixel);
  var area = featureCalculateAreaMeters(feature);
  var tempString;
  if (feature.get('name') !== undefined) {
    tempString =
 `<table style="width:100%">
  <tr>
    <td>Name</td>
    <td><code>` +
    feature.get('name') +
    `</code></td>
  </tr>
  <tr>
    <td>Status</td>
    <td><code>` +
    feature.get('status') +
    `</code></td>
  </tr>
  <tr>
    <td>Area [m^2]</td>
    <td><code>` +
    area.toFixed(2) +
    `</code></td>
  </tr>
  <tr>
    <td>Area [ft^2]</td>
    <td><code>` +
    (10.7639 * area).toFixed(2) +
    `</code></td>
  </tr>
  </table>`;
  } else {
    tempString =
    `<table style="width:100%">
  <tr>
    <td>Name</td>
    <td><code>` +
    feature.get('legal1') +
    `</code></td>
  </tr>
  <tr>
    <td>Parcel ID</td>
    <td><code>` +
    feature.get('PROP_ID') +
    `</code></td>
  </tr>
  <tr>
  <td>Area registered [ft^2]</td>
  <td><code>` +
  feature.get('Shape_area').toFixed(2) +
  `</code></td>
  </tr>
  <tr>
    <td>Area calculated [ft^2]</td>
    <td><code>` +
    (10.7639 * area).toFixed(2) +
    `</code></td>
  </tr>
</table>`;
  }
  return tempString;
};

var retrieveLotTable = function (url) {
  $.getJSON(url, function (data) {
    var items = [];
    items.push(
      '<tr><th><b>Lot ID</b></th><th><b>Lot Status</b></th><th><b>Lot Area [m^2]</b></th><th><b>Lot Area [ft^2]</b></th></tr>'
    );
    $.each(data.features, function (key, val) {
      var area = turf.area(val);
      items.push(
        '<tr><td>' +
          val.properties.name +
          '</td><td>' +
          val.properties.status +
          '</td><td>' +
          area.toFixed(2) +
          '</td><td>' +
          (10.7639 * area).toFixed(2) +
          '</td></tr>'
      );
    });

    $('<table/>', {
      class: 'lot-table',
      html: items.join('')
    }).appendTo('#lot-table');
  });
  return true;
};
retrieveLotTable('/files/lots.geojson');

/* Event call-backs */

olMap.on('pointermove', function (evt) {
  if (evt.dragging) {
    console.debug('dragging detected');
    return;
  }
  var pixel = olMap.getEventPixel(evt.originalEvent);
  var feature = retrieveFeature(pixel);

  /* feature can be null */
  if (typeof feature === 'undefined') {
    console.debug('no feature found on mouse-over');
    return;
  }

  featureHighlight(feature);
});

function getCenterOfExtent(Extent){
  var X = Extent[0] + (Extent[2]-Extent[0])/2;
  var Y = Extent[1] + (Extent[3]-Extent[1])/2;
  return [X, Y];
  }
function movePoint10mDown(Point){
  var X = Point[1];
  var Y = Point[0]-50;
  return [Y,X];
  }

olMap.on('click', function (evt) {
  if (typeSelect.value !== 'info') return;

  var feature = retrieveFeature(evt.pixel);

  /* feature can be null */
  if (typeof feature === 'undefined') {
    console.log('no feature found under click or tap');
    return;
  }

  content.innerHTML = retrieveFeatureInfoTable(evt);
  overlay.setPosition(evt.coordinate);
  featureHighlight(feature);

  var extent = feature.getGeometry().getExtent();
  var center= getCenterOfExtent(extent);
  console.debug('center of feature is: ' + center);
  var centerShifted= movePoint10mDown(center);
  olMap.getView().animate({zoom: 18, center: centerShifted });
});

window.addEventListener('orientationchange', function () {
  // console.log("the orientation of the device is now " + screen.orientation.angle);

  if (screen.orientation.angle === 0) {
    console.log('rotating map to portrait mode');
    olMap.setView(olView);
  } else {
    console.log('rotating map to landscape mode');
    olMap.setView(olViewRotated);
  }
});

/**
 * Currently drawn feature.
 * @type {import("../src/ol/Feature.js").default}
 */
var sketch;

/**
 * The help tooltip element.
 * @type {HTMLElement}
 */
var helpTooltipElement;

/**
 * Overlay to show the help messages.
 * @type {Overlay}
 */
var helpTooltip;

/**
 * The measure tooltip element.
 * @type {HTMLElement}
 */
var measureTooltipElement;

/**
 * Overlay to show the measurement.
 * @type {Overlay}
 */
var measureTooltip;

/**
 * Message to show when the user is drawing a polygon.
 * @type {string}
 */
var continuePolygonMsg = 'Click to continue drawing the polygon';

/**
 * Message to show when the user is drawing a line.
 * @type {string}
 */
var continueLineMsg = 'Click to continue drawing the line';

/**
 * Handle pointer move.
 * @param {import("../src/ol/MapBrowserEvent").default} evt The event.
 */
var pointerMoveHandler = function (evt) {
  if (typeSelect.value === 'info') return;
  if (evt.dragging) {
    return;
  }
  /** @type {string} */
  var helpMsg = 'Click to start drawing';

  if (sketch) {
    var geom = sketch.getGeometry();
    if (geom instanceof ol.geom.Polygon) {
      helpMsg = continuePolygonMsg;
    } else if (geom instanceof ol.geom.LineString) {
      helpMsg = continueLineMsg;
    } else {
      console.log('Could not determine geom type.');
    }
  }
  helpTooltipElement.innerHTML = helpMsg;
  helpTooltip.setPosition(evt.coordinate);

  helpTooltipElement.classList.remove('hidden');
};
olMap.on('pointermove', pointerMoveHandler);

olMap.getViewport().addEventListener('mouseout', function () {
  if (typeSelect.value === 'info') return;
  helpTooltipElement.classList.add('hidden');
});

var typeSelect = document.getElementById('type');

var draw; // global so we can remove it later

/**
 * Format length output.
 * @param {LineString} line The line.
 * @return {string} The formatted length.
 */
var formatLength = function (line) {
  var length = ol.sphere.getLength(line);
  var output;
  if (length > 100) {
    output = Math.round((length / 1000) * 100) / 100 + ' ' + 'km';
  } else {
    output = Math.round(length * 100) / 100 + ' ' + 'm';
  }
  return output;
};

/**
 * Format area output.
 * @param {Polygon} polygon The polygon.
 * @return {string} Formatted area.
 */
var formatArea = function (polygon) {
  var area = ol.sphere.getArea(polygon);
  var output;
  if (area > 10000) {
    output = Math.round((area / 1000000) * 100) / 100 + ' ' + 'km<sup>2</sup>';
  } else {
    output = Math.round(area * 100) / 100 + ' ' + 'm<sup>2</sup>';
  }
  return output;
};

function addInteraction () {
  if (typeSelect.value === 'info') return;
  var type = typeSelect.value === 'area' ? 'Polygon' : 'LineString';
  if (type === 'info') {
    return;
  }
  draw = new ol.interaction.Draw({
    source: source,
    type: type,
    style: new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.2)'
      }),
      stroke: new ol.style.Stroke({
        color: 'rgba(0, 0, 0, 0.5)',
        lineDash: [10, 10],
        width: 2
      }),
      image: new ol.style.Circle({
        radius: 5,
        stroke: new ol.style.Stroke({
          color: 'rgba(0, 0, 0, 0.7)'
        }),
        fill: new ol.style.Fill({
          color: 'rgba(255, 255, 255, 0.2)'
        })
      })
    })
  });
  olMap.addInteraction(draw);

  createMeasureTooltip();
  createHelpTooltip();

  var listener;
  draw.on('drawstart', function (evt) {
    // set sketch
    sketch = evt.feature;

    /** @type {import("../src/ol/coordinate.js").Coordinate|undefined} */
    var tooltipCoord = evt.coordinate;

    listener = sketch.getGeometry().on('change', function (evt) {
      var geom = evt.target;
      var output;
      if (geom instanceof ol.geom.Polygon) {
        output = formatArea(geom);
        tooltipCoord = geom.getInteriorPoint().getCoordinates();
      } else if (geom instanceof ol.geom.LineString) {
        output = formatLength(geom);
        tooltipCoord = geom.getLastCoordinate();
      }
      measureTooltipElement.innerHTML = output;
      measureTooltip.setPosition(tooltipCoord);
    });
  });

  draw.on('drawend', function () {
    measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
    measureTooltip.setOffset([0, -7]);
    // unset sketch
    sketch = null;
    // unset tooltip so that a new one can be created
    measureTooltipElement = null;
    createMeasureTooltip();
    ol.Observable.unByKey(listener);
  });
}

/**
 * Creates a new help tooltip
 */
function createHelpTooltip () {
  if (helpTooltipElement) {
    helpTooltipElement.parentNode.removeChild(helpTooltipElement);
  }
  helpTooltipElement = document.createElement('div');
  helpTooltipElement.className = 'ol-tooltip hidden';
  helpTooltip = new ol.Overlay({
    element: helpTooltipElement,
    offset: [15, 0],
    positioning: 'center-left'
  });
  olMap.addOverlay(helpTooltip);
}

/**
 * Creates a new measure tooltip
 */
function createMeasureTooltip () {
  if (measureTooltipElement) {
    measureTooltipElement.parentNode.removeChild(measureTooltipElement);
  }
  measureTooltipElement = document.createElement('div');
  measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
  measureTooltip = new ol.Overlay({
    element: measureTooltipElement,
    offset: [0, -15],
    positioning: 'bottom-center'
  });
  olMap.addOverlay(measureTooltip);
}

/**
 * Let user change the geometry type.
 */
typeSelect.onchange = function () {
  olMap.removeInteraction(draw);
  addInteraction();
};

addInteraction();

var geolocation = new ol.Geolocation({
  // enableHighAccuracy must be set to true to have the heading value.
  trackingOptions: {
    enableHighAccuracy: true
  },
  projection: olViewSelector().getProjection()
});

function el (id) {
  return document.getElementById(id);
}

el('track').addEventListener('change', function () {
  geolocation.setTracking(this.checked);
});

// update the HTML page when the position changes.
geolocation.on('change', function () {
  el('accuracy').innerText = geolocation.getAccuracy() + ' [m]';
  el('altitude').innerText = geolocation.getAltitude() + ' [m]';
  el('altitudeAccuracy').innerText = geolocation.getAltitudeAccuracy() + ' [m]';
  el('heading').innerText = geolocation.getHeading() + ' [rad]';
  el('speed').innerText = geolocation.getSpeed() + ' [m/s]';
});

// handle geolocation error.
geolocation.on('error', function (error) {
  var info = document.getElementById('info');
  info.innerHTML = error.message;
  info.style.display = '';
});

var accuracyFeature = new ol.Feature();
geolocation.on('change:accuracyGeometry', function () {
  accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
});

var positionFeature = new ol.Feature();
positionFeature.setStyle(new ol.style.Style({
  image: new ol.style.Circle({
    radius: 6,
    fill: new ol.style.Fill({
      color: '#3399CC'
    }),
    stroke: new ol.style.Stroke({
      color: '#fff',
      width: 2
    })
  })
}));

geolocation.on('change:position', function () {
  var coordinates = geolocation.getPosition();
  positionFeature.setGeometry(coordinates ? new ol.geom.Point(coordinates) : null);
});

var layerPositionMarker = new ol.layer.Vector({
  map: olMap,
  source: new ol.source.Vector({
    features: [accuracyFeature, positionFeature]
  })
});
