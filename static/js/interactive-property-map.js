/* eslint-env browser,jquery */
/* globals ol turf */
/* eslint semi: 2 */

// Global application state variables
var currentToolMode = 'info'; // Default tool: 'info', 'length', 'area'
let displayUnits = 'imperial'; // Default unit system: 'imperial' or 'metric' (changed to let)

// Global draw variable for interactions
var draw;

// Global variable to store lots.json data
var lotsData = null;

// Global references to individual tool control instances
window.infoControlInstance = window.infoControlInstance || null;
window.lengthControlInstance = window.lengthControlInstance || null;
window.areaControlInstance = window.areaControlInstance || null;


// -----------------------------
//  Lago Bello Interactive Map
//
// =============================
//  0.  Styles
// =============================
var styleLake = new ol.style.Style({
  fill: new ol.style.Fill({ color: '#92c5eb' })
});

var lotStyles = {
  'FOR SALE': new ol.style.Style({
    fill: new ol.style.Fill({ color: '#2dd187' }),
    stroke: new ol.style.Stroke({ color: '#D3D3D3', width: 2 })
  }),
  'PRE-SALE': new ol.style.Style({
    fill: new ol.style.Fill({ color: '#885ead' }),
    stroke: new ol.style.Stroke({ color: '#D3D3D3', width: 2 })
  }),
  'SOLD': new ol.style.Style({
    fill: new ol.style.Fill({ color: '#c03425' }),
    stroke: new ol.style.Stroke({ color: '#D3D3D3', width: 2 })
  }),
  'PENDING': new ol.style.Style({
    fill: new ol.style.Fill({ color: '#ffff00' }),
    stroke: new ol.style.Stroke({ color: '#D3D3D3', width: 2 })
  })
};

var styleLotCameronAppraisalDistrict = new ol.style.Style({
  fill: new ol.style.Fill({ color: '#FFFF00' }),
  stroke: new ol.style.Stroke({ color: '#000000', width: 1 })
});

var stylePark = new ol.style.Style({
  fill: new ol.style.Fill({ color: '#6b8e23' })
});

var styleStreet = new ol.style.Style({
  fill: new ol.style.Fill({ color: '#6F6E63' }),
  stroke: new ol.style.Stroke({ color: '#fade84', width: 2 })
});

var styleHighlight = new ol.style.Style({
  stroke: new ol.style.Stroke({ color: 'blue', width: 3 })
});

// =============================
//  1.  Map controls & overlays
// =============================
var container = document.getElementById('popup');
var content   = document.getElementById('popup-content');
var closer    = document.getElementById('popup-closer');

var overlay = new ol.Overlay({
  element: container,
  autoPan: true,
  autoPanAnimation: { duration: 250 }
});

closer.onclick = function () {
  overlay.setPosition(undefined);
  closer.blur();
  return false;
};

var mapboxKey = 'pk.eyJ1IjoibGFnb3ZpdHRvcmlvIiwiYSI6ImNqazZvYWdnZTB6bjMzcG1rcDR1bGpncm0ifQ.E_grlJASX59FUqTlksn09Q';

// ------------------ Base layers
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

// ------------- Vector overlays
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

var styleFunctionPlatLots = function (feature) {
  return lotStyles['FOR SALE'];
};

var layerVectorLots = new ol.layer.Vector({
  title: 'Lot layer',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: '/files/lots.geojson'
  }),
  style: styleFunction,
  visible: false,
  opacity: 0.4
});

var layerVectorLotsPlatS1 = new ol.layer.Vector({
  title: 'Lot Layer - Plat Section 1',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-LOTS-S1.geojson'
  }),
  style: styleFunctionPlatLots,
  opacity: 0.4
});

var layerVectorLotsPlatS2 = new ol.layer.Vector({
  title: 'Lot Layer - Plat Section 2',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-LOTS-S2.geojson'
  }),
  style: styleFunctionPlatLots,
  opacity: 0.4
});

var layerVectorLotsPlatS3 = new ol.layer.Vector({
  title: 'Lot Layer - Plat Section 3 (future)',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-LOTS-S3.geojson'
  }),
  style: styleFunctionPlatLots,
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

var layerVectorFountain = new ol.layer.Vector({
  title: 'Fountain',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-FOUNTAIN.geojson'
  }),
  style: stylePark,
  visible: false,
  opacity: 0.4
});

var layerVectorCommonArea = new ol.layer.Vector({
  title: 'Common Area - Section 3',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-COMMONAREA-S3.geojson'
  }),
  style: stylePark,
  visible: true,
  opacity: 0.4
});

var layerVectorCaminataS1 = new ol.layer.Vector({
  title: 'Caminata - Section 1',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-CAMINATA-S1.geojson'
  }),
  style: stylePark,
  opacity: 0.8
});

var layerVectorCaminataS2 = new ol.layer.Vector({
  title: 'Caminata - Section 2',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-CAMINATA-S2.geojson'
  }),
  style: stylePark,
  opacity: 0.8
});

var layerVectorCaminataProposed = new ol.layer.Vector({
  title: 'Caminata (proposed)',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-CAMINATA-PROPOSED.geojson'
  }),
  style: stylePark,
  visible: false,
  opacity: 0.8
});


var layerVectorStreetS1 = new ol.layer.Vector({
  title: 'Right of Way - Section 1',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-ROW-S1.geojson'
  }),
  style: styleStreet,
  opacity: 0.8
});

var layerVectorStreetS2 = new ol.layer.Vector({
  title: 'Right of Way - Section 2',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-ROW-S2.geojson'
  }),
  style: styleStreet,
  opacity: 0.8
});

var layerVectorStreetS3 = new ol.layer.Vector({
  title: 'Right of Way - Section 3',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-ROW-S3.geojson'
  }),
  style: styleStreet,
  opacity: 0.8
});

var layerVectorStreetReserved = new ol.layer.Vector({
  title: 'Right of Way - Reserved',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-ROW-RESERVE.geojson'
  }),
  style: styleStreet,
  visible: true,
  opacity: 0.8
});

var layerVectorStreetAccess = new ol.layer.Vector({
  title: 'Right of Way - Access',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-ROW-ACCESS.geojson'
  }),
  style: styleStreet,
  visible: false,
  opacity: 0.8
});

var genericSource = new ol.source.Vector();
var drawingLayerSource = new ol.source.Vector();

var layerVectorDrawings = new ol.layer.Vector({
  source: drawingLayerSource,
  style: new ol.style.Style({
    fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
    stroke: new ol.style.Stroke({ color: '#ffcc33', width: 3 }),
    image: new ol.style.Circle({ radius: 7, fill: new ol.style.Fill({ color: '#ffcc33' }) })
  }),
  zIndex: 100
});

var olLayerGroupBasemaps = new ol.layer.Group({
  title: 'Base maps',
  layers: [layerOsmStreet,  layerMapboxSatellite]

});

var olLayerGroupDrone = new ol.layer.Group({ title: 'Drone imagery', layers: [] });

var olLayerGroupOverlays = new ol.layer.Group({
  title: 'Overlays',
  layers: [
  layerVectorCaminataS1,
  layerVectorCaminataS2,
  layerVectorCaminataProposed,
  layerVectorLake,
  layerVectorLotsPlatS1,
  layerVectorLotsPlatS2,
  layerVectorLotsPlatS3,
  layerVectorLotsCameronAppraisalDistrict,
  layerVectorFountain,
  layerVectorCommonArea,
  layerVectorStreetS1,
  layerVectorStreetS2,
  layerVectorStreetS3,
  layerVectorStreetReserved,
  layerVectorStreetAccess

    ],
  zIndex: 10
});

var layerSwitcher = new ol.control.LayerSwitcher({ tipLabel: 'Legend' });

var controlMousePosition = new ol.control.MousePosition({
  coordinateFormat: function (coordinate) {
    return ol.coordinate.format(coordinate, '<span>{y}N, {x}W</span>', 4);
  },
  projection: 'EPSG:4326',
  className: 'ol-control ol-mouse-position',
  undefinedHTML: ''
});

var viewDefault = new ol.View({ center: ol.proj.fromLonLat([-97.553, 26.053]), zoom: 16 });
var viewRot = new ol.View({ center: ol.proj.fromLonLat([-97.553, 26.053]), rotation: Math.PI / 2.17, zoom: 17 });
function chooseView () { return (window.innerHeight > window.innerWidth) ? viewDefault : viewRot; }


function setSelectedTool(toolMode, clickedControlInstance) {
  currentToolMode = toolMode;

  const controls = [window.infoControlInstance, window.lengthControlInstance, window.areaControlInstance];
  controls.forEach(control => {
    if (control && control.element) {
      if (control === clickedControlInstance) {
        control.element.firstChild.classList.add('active');
      } else {
        control.element.firstChild.classList.remove('active');
      }
    }
  });
  setActiveToolInteraction(toolMode);
}

function addDownloadLinksToLayerSwitcher() {
  if (!layerSwitcher || !layerSwitcher.panel) {
    return;
  }

  const panelUl = layerSwitcher.panel.querySelector('ul');
  if (!panelUl) {
    return;
  }

  const listItems = panelUl.getElementsByTagName('li');

  for (let i = 0; i < listItems.length; i++) {
    const li = listItems[i];

    if (li.querySelector('a.download-geojson-link') || li.querySelector('button.copy-url-button')) {
      continue;
    }

    const label = li.querySelector('label');
    if (!label) continue;

    const layerTitle = label.textContent.trim();
    if (!layerTitle) continue;

    let targetLayer = null;

    function findLayerByTitle(layerCollection, title) {
      let foundLayer = null;
      layerCollection.forEach(function(layer) {
        if (foundLayer) return;
        if (layer.get('title') === title && !(layer instanceof ol.layer.Group)) {
          foundLayer = layer;
        } else if (layer instanceof ol.layer.Group) {
          layer.getLayers().forEach(function(subLayer) {
            if (subLayer.get('title') === title && !(subLayer instanceof ol.layer.Group)) {
              foundLayer = subLayer;
            }
          });
        }
      });
      return foundLayer;
    }

    targetLayer = findLayerByTitle(olMap.getLayers(), layerTitle);

    if (targetLayer) {
      const source = targetLayer.getSource();
      let urlToCopy = null;
      let isGeoJSON = false;

      if (source instanceof ol.source.Vector && typeof source.getUrl === 'function' && source.getUrl()) {
        const rawUrl = source.getUrl();
        const format = source.getFormat();
        const isGeoJSONFormat = format && typeof format.getType === 'function' && format.getType().toLowerCase() === 'geojson';
        if (isGeoJSONFormat || (typeof rawUrl === 'string' && rawUrl.toLowerCase().endsWith('.geojson'))) {
          isGeoJSON = true;
          urlToCopy = rawUrl;
        }
      } else if (source instanceof ol.source.XYZ) {
        urlToCopy = source.getUrls()[0];
        if (urlToCopy && urlToCopy.includes(mapboxKey)) {
          const urlObj = new URL(urlToCopy);
          urlObj.searchParams.set('access_token', 'YOUR_MAPBOX_API_KEY');
          urlToCopy = urlObj.toString();
        }
      }

      let iconContainer = null;
      if (urlToCopy || (isGeoJSON && urlToCopy)) {
        iconContainer = document.createElement('span');
        iconContainer.className = 'layer-action-icons';
        iconContainer.style.marginLeft = '8px';
        iconContainer.style.display = 'inline-flex';
        iconContainer.style.alignItems = 'center';
      }

      if (urlToCopy) {
        const copyButton = document.createElement('button');
        copyButton.innerHTML = '🔗';
        copyButton.title = `Copy URL for ${layerTitle}`;
        copyButton.className = 'copy-url-button';
        copyButton.onclick = function() {
          navigator.clipboard.writeText(urlToCopy).then(function() {
            const originalText = copyButton.innerHTML;
            copyButton.innerHTML = '✅';
            setTimeout(() => { copyButton.innerHTML = originalText; }, 1500);
          }).catch(function(err) {
            console.error(`Failed to copy URL for ${layerTitle}: `, err);
          });
        };
        iconContainer.appendChild(copyButton);
      }

      if (isGeoJSON && urlToCopy) {
        const downloadLink = document.createElement('a');
        downloadLink.href = urlToCopy;
        downloadLink.innerHTML = '⭳';
        downloadLink.title = `Download ${layerTitle}`;
        downloadLink.className = 'download-geojson-link';

        let filename = layerTitle.replace(/[^\w\s.-]/gi, '_').replace(/\s+/g, '_').toLowerCase();
        if (!filename) filename = "layer";
        if (!filename.endsWith('.geojson')) filename += ".geojson";
        downloadLink.download = filename;

        iconContainer.appendChild(downloadLink);
      }

      if (iconContainer && label && label.parentNode === li) {
        label.after(iconContainer);
      }
    }
  }
}

class InfoControl extends ol.control.Control {
  constructor(opt_options) {
    const options = opt_options || {};
    const button = document.createElement('button');
    button.innerHTML = 'ℹ️';
    button.title = 'Info Mode';

    const element = document.createElement('div');
    element.className = 'ol-info-control ol-unselectable ol-control';
    element.appendChild(button);

    super({ element: element, target: options.target });
    window.infoControlInstance = this;

    button.addEventListener('click', () => {
      setSelectedTool('info', this);
    });
  }
}

class LengthControl extends ol.control.Control {
  constructor(opt_options) {
    const options = opt_options || {};
    const button = document.createElement('button');
    button.innerHTML = '📏';
    button.title = 'Length Tool';

    const element = document.createElement('div');
    element.className = 'ol-length-control ol-unselectable ol-control';
    element.appendChild(button);

    super({ element: element, target: options.target });
    window.lengthControlInstance = this;

    button.addEventListener('click', () => {
      setSelectedTool('length', this);
    });
  }
}

class AreaControl extends ol.control.Control {
  constructor(opt_options) {
    const options = opt_options || {};
    const button = document.createElement('button');
    button.innerHTML = '📐';
    button.title = 'Area Tool';

    const element = document.createElement('div');
    element.className = 'ol-area-control ol-unselectable ol-control';
    element.appendChild(button);

    super({ element: element, target: options.target });
    window.areaControlInstance = this;

    button.addEventListener('click', () => {
      setSelectedTool('area', this);
    });
  }
}

class UnitToggleControl extends ol.control.Control {
  constructor(opt_options) {
    const options = opt_options || {};
    const element = document.createElement('div');
    element.className = 'ol-unit-toggle-control ol-unselectable ol-control';

    super({ element: element, target: options.target });

    this.imperialButton = document.createElement('button');
    this.imperialButton.innerHTML = '👑';
    this.imperialButton.title = 'Use Imperial Units';
    this.imperialButton.addEventListener('click', () => this.setUnit('imperial'));
    element.appendChild(this.imperialButton);

    this.metricButton = document.createElement('button');
    this.metricButton.innerHTML = '⚙️';
    this.metricButton.title = 'Use Metric Units';
    this.metricButton.addEventListener('click', () => this.setUnit('metric'));
    element.appendChild(this.metricButton);

    this.updateButtonActiveState();
  }

  setUnit(unit) {
    if (displayUnits === unit) return;
    displayUnits = unit;
    this.updateButtonActiveState();
    refreshMapMeasurements();
  }

  updateButtonActiveState() {
    if (displayUnits === 'metric') {
      this.metricButton.classList.add('active');
      this.imperialButton.classList.remove('active');
    } else {
      this.imperialButton.classList.add('active');
      this.metricButton.classList.remove('active');
    }
  }
}

function refreshMapMeasurements() {
  console.log(`Unit system changed to: ${displayUnits}. UI refresh needed.`);
}


var olMap = new ol.Map({
  target: 'ol-map',
  controls: [
    new ol.control.Attribution({collapsible: true}),
    new ol.control.Rotate(),
    new ol.control.FullScreen(),
    controlMousePosition,
    layerSwitcher,
    new ol.control.Zoom(),
    new InfoControl(),
    new LengthControl(),
    new AreaControl(),
    new UnitToggleControl(),
  ],
  overlays: [overlay],
  layers: [olLayerGroupBasemaps, olLayerGroupDrone, olLayerGroupOverlays, layerVectorDrawings],
  view: chooseView()
});

if (layerSwitcher && layerSwitcher.panel) {
  layerSwitcher.panel.addEventListener('rendercomplete', addDownloadLinksToLayerSwitcher);
  setTimeout(addDownloadLinksToLayerSwitcher, 500);
} else {
  console.warn('LayerSwitcher or its panel is not available to attach rendercomplete listener.');
}

(function loadDroneLayers () {
  const GH_API = 'https://api.github.com/repos/lagobello/lagobello-tiles/contents/zxy?ref=master';
  const TILE_ROOT = 'https://lagobello.github.io/lagobello-tiles/zxy/';

  fetch(GH_API)
    .then(r => r.json())
    .then(entries => entries.filter(e => e.type === 'dir').map(e => e.name).sort())
    .then(folders => {
      if (!folders.length) return;
      folders.forEach((folder, idx) => {
        const src = new ol.source.XYZ({
          url: `${TILE_ROOT}${encodeURIComponent(folder)}/{z}/{x}/{-y}.png`,
          attributions: `© Drone flight ${folder.replace(/_/g,' ')}`,
          maxZoom: 22
        });
        const lyr = new ol.layer.Tile({ source: src, visible: false });
        lyr.set('title', folder);
        lyr.set('type', 'overlay');
        olLayerGroupDrone.getLayers().push(lyr);
        if (idx === folders.length - 1) lyr.setVisible(true);
      });
      layerSwitcher.renderPanel();
    })
    .catch(console.error);
})();

(function loadLotsData() {
  fetch('/data/lots.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok for lots.json');
      }
      return response.json();
    })
    .then(data => {
      lotsData = data;
      console.log('lots.json loaded successfully.');
    })
    .catch(error => {
      console.error('CRITICAL: Error loading lots.json:', error.message);
      console.warn('lots.json fetch failed. Pop-up information linked to this file will be unavailable. Check file path and server logs.');
      lotsData = [];
    });
})();

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

function getFriendlyLayerName(clickedFeature) {
  if (!clickedFeature || !olMap) return 'Unknown Layer';

  let featureLayer = null;
  const mapLayers = olMap.getLayers().getArray();
  for (const layer of mapLayers) {
    if (layer instanceof ol.layer.Vector) {
      const source = layer.getSource();
      if (source && typeof source.getFeatures === 'function') {
        if (source.getFeatures().includes(clickedFeature)) {
          featureLayer = layer;
          break;
        }
      }
      if (source instanceof ol.source.Cluster) {
        const clusterSource = source.getSource();
         if (clusterSource && typeof clusterSource.getFeatures === 'function') {
            if (clusterSource.getFeatures().includes(clickedFeature)) {
                featureLayer = layer;
                break;
            }
        }
      }
    } else if (layer instanceof ol.layer.Group) {
      const groupLayers = layer.getLayers().getArray();
      for (const subLayer of groupLayers) {
        if (subLayer instanceof ol.layer.Vector) {
          const source = subLayer.getSource();
          if (source && typeof source.getFeatures === 'function') {
            if (source.getFeatures().includes(clickedFeature)) {
              featureLayer = subLayer;
              break;
            }
          }
           if (source instanceof ol.source.Cluster) {
            const clusterSource = source.getSource();
            if (clusterSource && typeof clusterSource.getFeatures === 'function') {
                if (clusterSource.getFeatures().includes(clickedFeature)) {
                    featureLayer = subLayer;
                    break;
                }
            }
          }
        }
      }
    }
    if (featureLayer) break;
  }

  if (featureLayer) {
    const title = featureLayer.get('title');
    return title || 'Unnamed Layer';
  }

  return clickedFeature.get('Layer') || 'Unknown Layer';
}


var retrieveFeatureInfoTable = function (evt) {
  var feature = retrieveFeature(evt.pixel);
  var geoJsonFeatureIdentifier = feature.get('EntityHandle') || feature.get('name');

  var area = featureCalculateAreaMeters(feature);
  var entityHandle = feature.get('EntityHandle') || 'N/A';
  var rawLayerName = feature.get('Layer') || 'Unknown';
  var friendlyLayerName = getFriendlyLayerName(feature);

  var matchedLot = null;
  const featureGeometry = feature.getGeometry();
  const isLotLayer = friendlyLayerName && (friendlyLayerName.toLowerCase().includes('lot') || friendlyLayerName.toLowerCase().includes('plat'));

  if (isLotLayer && lotsData && featureGeometry && typeof featureGeometry.intersectsCoordinate === 'function') {
    for (const lotRecord of lotsData) {
      if (lotRecord.Location && typeof lotRecord.Location === 'string') {
        const parts = lotRecord.Location.split(',');
        if (parts.length === 2) {
          const lat = parseFloat(parts[0].trim());
          const lon = parseFloat(parts[1].trim());

          if (!isNaN(lat) && !isNaN(lon)) {
            const lotPointWGS84 = [lon, lat];
            try {
              const lotPointInViewProj = ol.proj.transform(lotPointWGS84, 'EPSG:4326', 'EPSG:3857');
              if (featureGeometry.intersectsCoordinate(lotPointInViewProj)) {
                matchedLot = lotRecord;
                console.log("Spatial match found for feature with lot record:", matchedLot.Name);
                break;
              }
            } catch (e) {
              console.error("Error transforming lot location for spatial match:", lotRecord.Location, e);
            }
          }
        }
      }
    }
    if (!matchedLot) {
        console.log("No spatial match found for feature on a lot layer. Feature ID (if any):", geoJsonFeatureIdentifier);
    }
  }

  var parcelLegalDesc = (matchedLot && matchedLot.Name) ? matchedLot.Name : (geoJsonFeatureIdentifier || 'N/A');
  var status = matchedLot && matchedLot["Lot Status"] ? matchedLot["Lot Status"] : (feature.get('status') || 'N/A');
  var listPrice = matchedLot && matchedLot["List Price"] ? `$${parseFloat(matchedLot["List Price"]).toLocaleString()}` : 'N/A';
  var sqFootage = matchedLot && matchedLot["Size [sqft]"] ? `${parseFloat(matchedLot["Size [sqft]"]).toLocaleString()} sqft` : 'N/A';
  var listingAgent = matchedLot && matchedLot["Listing Agent"] ? matchedLot["Listing Agent"] : 'N/A';
  var listingAgentPhone = matchedLot && matchedLot["Listing Agent Phone Number"] ? String(matchedLot["Listing Agent Phone Number"]) : 'N/A';
  var listingURL = matchedLot && matchedLot["Listing Link"] ? matchedLot["Listing Link"] : 'N/A';

  var callNowButton = '';
  if (listingAgentPhone !== 'N/A' && listingAgentPhone) {
    var telLink = listingAgentPhone.replace(/\D/g, '');
    callNowButton = `<a href="tel:${telLink}" class="call-now-button">Call Now</a>`;
  }

  var listingLinkHtml = 'N/A';
  if (listingURL !== 'N/A' && listingURL) {
    if (listingURL.toLowerCase().includes('http')) {
      const urlMatch = listingURL.match(/https?:\/\/[^\s]+/i);
      if (urlMatch && urlMatch[0]) {
        listingLinkHtml = `<a href="${urlMatch[0]}" target="_blank" rel="noopener noreferrer">View Listing</a>`;
      } else {
        listingLinkHtml = listingURL;
      }
    } else {
      listingLinkHtml = listingURL;
    }
  }

  var areaString = 'N/A';
  if (area) {
    if (displayUnits === 'imperial') {
      var areaSqFt_calc = area * 10.7639;
      if (areaSqFt_calc > 43560) {
        areaString = `${(areaSqFt_calc / 43560).toFixed(2)} acres`;
      } else {
        areaString = `${areaSqFt_calc.toFixed(2)} ft<sup>2</sup>`;
      }
    } else {
      if (area > 10000) {
        areaString = `${(area / 1000000).toFixed(2)} km<sup>2</sup>`;
      } else {
        areaString = `${area.toFixed(2)} m<sup>2</sup>`;
      }
    }
  }

  var topLevelHtml = '';
  if (matchedLot) {
    topLevelHtml = `
      <div class="popup-section">
        <div class="popup-section-title main-title">${parcelLegalDesc}</div>
        <table style="width:100%">
          <tr><td>Status</td><td><code>${status}</code></td></tr>
          <tr><td>List Price</td><td><code>${listPrice}</code></td></tr>
          <tr><td>Size</td><td><code>${sqFootage}</code></td></tr>
          <tr><td>Listing Agent</td><td><code>${listingAgent}</code></td></tr>
          <tr><td>Agent Phone</td><td><code>${listingAgentPhone}</code> ${callNowButton}</td></tr>
          <tr><td>Listing URL</td><td>${listingLinkHtml}</td></tr>
        </table>
      </div>
    `;
  }

  var toggleButtonsHtml = '';

  var linkedDataContent = '<table style="width:100%">';
  let hasLinkedProps = false;
  if (matchedLot) {
    const topLevelKeys = ["Name", "Lot Status", "List Price", "Size [sqft]", "Listing Agent", "Listing Agent Phone Number", "Listing Link", "Location"]; // Added Location to exclude
    for (const key in matchedLot) {
      if (matchedLot.hasOwnProperty(key) && !topLevelKeys.includes(key)) {
        linkedDataContent += `<tr><td>${key}</td><td><code>${matchedLot[key] !== null && matchedLot[key] !== undefined ? matchedLot[key] : 'N/A'}</code></td></tr>`;
        hasLinkedProps = true;
      }
    }
  }
  if (!hasLinkedProps && matchedLot) {
    linkedDataContent += '<tr><td colspan="2">No additional linked data found.</td></tr>';
  } else if (!matchedLot) {
     linkedDataContent = '';
  }
  linkedDataContent += '</table>';

  var linkedDataDumpHtml = '';
  if (matchedLot) {
    linkedDataDumpHtml = `
      <div class="popup-section collapsible-section" style="display:none;" id="linked-data-section">
        <div class="popup-section-title">Linked Data (lots.json)</div>
        ${linkedDataContent}
      </div>
    `;
  }

  var areaSqFtImperial_display = '';
  var areaAcresImperial_display = '';
  if (displayUnits === 'imperial' && area) {
    let areaInSqFt = area * 10.7639;
    areaSqFtImperial_display = areaInSqFt.toFixed(2) + ' ft<sup>2</sup>';
    areaAcresImperial_display = (areaInSqFt / 43560).toFixed(3) + ' acres';
  }

  var centroidString = 'N/A';
  try {
    var turfFormatForCentroid = new ol.format.GeoJSON();
    const featureForTurf = feature.clone();
    const geometryInEPSG3857 = featureForTurf.getGeometry();
    const turfInputGeometry = JSON.parse(turfFormatForCentroid.writeGeometry(geometryInEPSG3857));

    var centroidProjected = turf.centroid(turfInputGeometry);

    if (centroidProjected && centroidProjected.geometry && centroidProjected.geometry.coordinates) {
      var lonLatCentroid = ol.proj.transform(centroidProjected.geometry.coordinates, 'EPSG:3857', 'EPSG:4326');

      const threshold = 0.01;
      if (Math.abs(lonLatCentroid[1]) < threshold && Math.abs(lonLatCentroid[0]) < threshold) {
        const featureExtent = feature.getGeometry().getExtent();
        const featureCenter = ol.extent.getCenter(featureExtent);
        const featureCenterWGS84 = ol.proj.transform(featureCenter, 'EPSG:3857', 'EPSG:4326');
        if (Math.abs(featureCenterWGS84[1]) > 1 && Math.abs(featureCenterWGS84[0]) > 1) {
            console.warn("Calculated WGS84 centroid is suspiciously close to (0,0) for feature:", geoJsonFeatureIdentifier);
            centroidString = 'N/A (Invalid Calc)';
        } else {
             centroidString = `${lonLatCentroid[1].toFixed(5)}, ${lonLatCentroid[0].toFixed(5)}`;
        }
      } else {
        centroidString = `${lonLatCentroid[1].toFixed(5)}, ${lonLatCentroid[0].toFixed(5)}`;
      }
    } else {
      console.warn("turf.centroid did not return valid coordinates for feature:", geoJsonFeatureIdentifier);
    }
  } catch (e) {
    console.error("Error calculating centroid for feature:", geoJsonFeatureIdentifier, e);
    centroidString = 'Error';
  }

  var calculatedDataContent = `<table style="width:100%">`;
  if (displayUnits === 'imperial') {
    if (area) {
        calculatedDataContent += `<tr><td>Area (sqft)</td><td><code>${areaSqFtImperial_display}</code></td></tr>`;
        calculatedDataContent += `<tr><td>Area (acres)</td><td><code>${areaAcresImperial_display}</code></td></tr>`;
    }
  } else {
    calculatedDataContent += `<tr><td>Area (calculated)</td><td><code>${areaString}</code></td></tr>`;
  }
  calculatedDataContent += `<tr><td>Centroid (Lat, Lon WGS84)</td><td><code>${centroidString}</code></td></tr>`;

  var clickedCoordWGS84 = ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
  var clickedCoordString = `${clickedCoordWGS84[1].toFixed(5)}, ${clickedCoordWGS84[0].toFixed(5)}`;
  calculatedDataContent += `<tr><td>Clicked (Lat, Lon WGS84)</td><td><code>${clickedCoordString}</code></td></tr>`;

  calculatedDataContent += `</table>`;

  var calculatedDataHtml = `
    <div class="popup-section collapsible-section" style="display:none;" id="calculated-data-section">
      <div class="popup-section-title">Calculated Data</div>
      ${calculatedDataContent}
    </div>
  `;

  var geoJsonMetadataContent = '<table style="width:100%">';
  const geoJsonProps = feature.getProperties();
  let hasGeoJsonProps = false;
  for (const key in geoJsonProps) {
    if (key !== 'geometry' && geoJsonProps.hasOwnProperty(key)) {
        geoJsonMetadataContent += `<tr><td>${key}</td><td><code>${geoJsonProps[key]}</code></td></tr>`;
        hasGeoJsonProps = true;
    }
  }
  if (!hasGeoJsonProps) {
    geoJsonMetadataContent += '<tr><td colspan="2">No GeoJSON properties found.</td></tr>';
  }
  geoJsonMetadataContent += '</table>';

  var geoJsonMetadataHtml = `
    <div class="popup-section collapsible-section" style="display:none;" id="geojson-metadata-section">
      <div class="popup-section-title">GeoJSON Metadata</div>
      ${geoJsonMetadataContent}
    </div>
  `;

  var buttonsArray = [];
  if (hasGeoJsonProps) {
    buttonsArray.push(`<button onclick="toggleSection('geojson-metadata-section', this)" class="popup-toggle-button popup-toggle-button-subtle">[+] Raw Data</button>`);
  }
  buttonsArray.push(`<button onclick="toggleSection('calculated-data-section', this)" class="popup-toggle-button">Calculated</button>`);

  if (matchedLot && hasLinkedProps) {
    buttonsArray.push(`<button onclick="toggleSection('linked-data-section', this)" class="popup-toggle-button">Linked Data</button>`);
  }

  toggleButtonsHtml = "";
  if (buttonsArray.length > 0) {
    toggleButtonsHtml = `<div class="popup-toggle-buttons">${buttonsArray.join('')}</div>`;
  }

  if (matchedLot) {
    return topLevelHtml + toggleButtonsHtml + geoJsonMetadataHtml + calculatedDataHtml + linkedDataDumpHtml;
  } else {
    // For UNMATCHED features
    let titleForUnmatched = "Feature Information"; // Default title

    if (friendlyLayerName) {
      const lowerFriendlyLayerName = friendlyLayerName.toLowerCase();
      if (lowerFriendlyLayerName.includes("section 1")) {
        titleForUnmatched = "Section 1 Lot";
      } else if (lowerFriendlyLayerName.includes("section 2")) {
        titleForUnmatched = "Section 2 Lot";
      } else if (lowerFriendlyLayerName.includes("section 3")) {
        titleForUnmatched = "Section 3 Lot";
      } else if (friendlyLayerName !== 'Unknown Layer' && friendlyLayerName !== 'Unnamed Layer') {
        titleForUnmatched = geoJsonFeatureIdentifier || friendlyLayerName;
      } else if (geoJsonFeatureIdentifier) {
        titleForUnmatched = geoJsonFeatureIdentifier;
      }
    } else if (geoJsonFeatureIdentifier) {
        titleForUnmatched = geoJsonFeatureIdentifier;
    }

    if (titleForUnmatched === 'Unknown Layer' || titleForUnmatched === 'Unnamed Layer') {
        titleForUnmatched = geoJsonFeatureIdentifier || "Feature Information";
    }

    let genericHeaderHtml = `
      <div class="popup-section">
        <div class="popup-section-title main-title">${titleForUnmatched}</div>`;

        if (friendlyLayerName && friendlyLayerName !== 'Unknown Layer' && friendlyLayerName !== 'Unnamed Layer' && titleForUnmatched !== friendlyLayerName) {
          genericHeaderHtml += `<table style="width:100%"><tr><td>Layer</td><td><code>${friendlyLayerName}</code></td></tr></table>`;
        }
    genericHeaderHtml += `</div>`;

    return genericHeaderHtml + toggleButtonsHtml + geoJsonMetadataHtml + calculatedDataHtml;
  }
};

window.toggleSection = function(sectionId, button) {
  var section = document.getElementById(sectionId);
  if (section) {
    if (section.style.display === 'none' || section.style.display === '') {
      section.style.display = 'block';
    } else {
      section.style.display = 'none';
    }
  } else {
    console.error('Section with ID ' + sectionId + ' not found.');
  }
};

var retrieveLotTable = function (url) {
  $.getJSON(url, function (data) {
    var items = [];
    var areaHeader = displayUnits === 'imperial' ? 'Lot Area [ft<sup>2</sup>]' : 'Lot Area [m<sup>2</sup>]';
    if (displayUnits === 'imperial') {
        areaHeader = turf.area(data.features[0]) * 10.7639 > 43560 ? 'Lot Area [acres]' : 'Lot Area [ft<sup>2</sup>]';
    } else {
        areaHeader = turf.area(data.features[0]) > 10000 ? 'Lot Area [km<sup>2</sup>]' : 'Lot Area [m<sup>2</sup>]';
    }


    items.push(
      `<tr><th><b>Lot ID</b></th><th><b>Lot Status</b></th><th><b>${areaHeader}</b></th></tr>`
    );
    $.each(data.features, function (key, val) {
      var areaM2 = turf.area(val);
      var displayArea;
      if (displayUnits === 'imperial') {
        var areaSqFt = areaM2 * 10.7639;
        if (areaSqFt > 43560) {
            displayArea = (areaSqFt / 43560).toFixed(2);
        } else {
            displayArea = areaSqFt.toFixed(2);
        }
      } else {
        if (areaM2 > 10000) {
            displayArea = (areaM2 / 1000000).toFixed(2);
        } else {
            displayArea = areaM2.toFixed(2);
        }
      }
      items.push(
        `<tr><td>${val.properties.name}</td><td>${val.properties.status}</td><td>${displayArea}</td></tr>`
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

olMap.on('pointermove', function (evt) {
  if (evt.dragging) {
    console.debug('dragging detected');
    return;
  }
  var pixel = olMap.getEventPixel(evt.originalEvent);
  var feature = retrieveFeature(pixel);

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
  if (currentToolMode !== 'info') {
    return;
  }

  var feature = retrieveFeature(evt.pixel);

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
  if (screen.orientation.angle === 0) {
    console.log('rotating map to portrait mode');
    olMap.setView(olView);
  } else {
    console.log('rotating map to landscape mode');
    olMap.setView(olViewRotated);
  }
});

var sketch;
var helpTooltipElement;
var helpTooltip;
var measureTooltipElement;
var measureTooltip;
var continuePolygonMsg = 'Click to continue drawing the polygon';
var continueLineMsg = 'Click to continue drawing the line';

var pointerMoveHandler = function (evt) {
  if (currentToolMode === 'info' || !sketch) {
    if (helpTooltipElement && !helpTooltipElement.classList.contains('hidden')) {
      helpTooltipElement.classList.add('hidden');
    }
    return;
  }
  if (evt.dragging) {
    return;
  }
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
  if (currentToolMode === 'info') return;
  helpTooltipElement.classList.add('hidden');
});

function setActiveToolInteraction(toolMode) {
  currentToolMode = toolMode;
  if (olMap) {
    if (draw) {
      olMap.removeInteraction(draw);
    }
    addInteraction();
  }
}

var formatLength = function (line) {
  var length = ol.sphere.getLength(line);
  var output;
  if (displayUnits === 'imperial') {
    var lengthFeet = length * 3.28084;
    if (lengthFeet > 5280) {
      output = (lengthFeet / 5280).toFixed(2) + ' ' + 'mi';
    } else {
      output = lengthFeet.toFixed(2) + ' ' + 'ft';
    }
  } else {
    if (length > 100) {
      output = (length / 1000).toFixed(2) + ' ' + 'km';
    } else {
      output = length.toFixed(2) + ' ' + 'm';
    }
  }
  return output;
};

var formatArea = function (polygon) {
  var area = ol.sphere.getArea(polygon);
  var output;
  if (displayUnits === 'imperial') {
    var areaSqFt = area * 10.7639;
    if (areaSqFt > 43560) {
      output = (areaSqFt / 43560).toFixed(2) + ' ' + 'acres';
    } else {
      output = areaSqFt.toFixed(2) + ' ' + 'ft<sup>2</sup>';
    }
  } else {
    if (area > 10000) {
      output = (area / 1000000).toFixed(2) + ' ' + 'km<sup>2</sup>';
    } else {
      output = area.toFixed(2) + ' ' + 'm<sup>2</sup>';
    }
  }
  return output;
};

function addInteraction () {
  if (currentToolMode === 'info') {
    olMap.removeInteraction(draw);
    return;
  }
  var type = currentToolMode === 'area' ? 'Polygon' : 'LineString';

  draw = new ol.interaction.Draw({
    source: drawingLayerSource,
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
    sketch = evt.feature;
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

  draw.on('drawend', function (evt) {
    measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
    measureTooltip.setOffset([0, -7]);
    if (evt.feature) {
      const debugRedStyle = new ol.style.Style({
          stroke: new ol.style.Stroke({ color: 'rgba(255, 0, 0, 1)', width: 4 }),
          fill: new ol.style.Fill({ color: 'rgba(255, 0, 0, 0.1)' }),
          image: new ol.style.Circle({ radius: 7, fill: new ol.style.Fill({ color: 'rgba(255, 0, 0, 1)' }) })
      });
      evt.feature.setStyle(debugRedStyle);
      console.log('Applied direct RED debug style to feature in drawend.');
    }
    sketch = null;
    measureTooltipElement = null;
    createMeasureTooltip();
    ol.Observable.unByKey(listener);

    console.log('drawend event triggered.');
    if (evt.feature) {
      console.log('Drawn feature geometry type:', evt.feature.getGeometry().getType());
    }
    console.log('Total features on drawingLayerSource:', drawingLayerSource.getFeatures().length);
    drawingLayerSource.changed();
  });
}

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

addInteraction();

var geolocation = new ol.Geolocation({
  trackingOptions: {
    enableHighAccuracy: true
  },
  projection: chooseView().getProjection()
});

function el (id) {
  return document.getElementById(id);
}

geolocation.on('change', function () {
  if (window.trackingControlInstance && window.trackingControlInstance.trackingOn_) {
    const accuracy = geolocation.getAccuracy() !== undefined ? geolocation.getAccuracy().toFixed(2) : '-';
    const altitude = geolocation.getAltitude() !== undefined ? geolocation.getAltitude().toFixed(2) : '-';
    const altitudeAccuracy = geolocation.getAltitudeAccuracy() !== undefined ? geolocation.getAltitudeAccuracy().toFixed(2) : '-';
    const heading = geolocation.getHeading() !== undefined ? geolocation.getHeading().toFixed(2) : '-';
    const speed = geolocation.getSpeed() !== undefined ? geolocation.getSpeed().toFixed(2) : '-';

    let currentCoords = {lat: '-', lon: '-'};
    const position = geolocation.getPosition();
    if (position) {
      const lonLat = ol.proj.toLonLat(position);
      currentCoords.lon = lonLat[0];
      currentCoords.lat = lonLat[1];

      if (window.trackingControlInstance.needsCentering_) {
        olMap.getView().animate({ center: position, zoom: Math.max(olMap.getView().getZoom(), 17), rotation: 0, duration: 500 });
        window.trackingControlInstance.needsCentering_ = false;
      }
    }

    window.trackingControlInstance.updateStats(accuracy, altitude, altitudeAccuracy, heading, speed, currentCoords);
  }
});

geolocation.on('error', function (error) {
  var info = document.getElementById('info');
  info.innerHTML = error.message;
  info.style.display = '';
  if (window.trackingControlInstance) {
    window.trackingControlInstance.updateStats('Error', 'Error', 'Error', 'Error', 'Error', {lat: 'Error', lon: 'Error'});
    if (window.trackingControlInstance.trackingOn_) {
        window.trackingControlInstance.handleTrackToggle_();
    }
  }
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

class TrackingControl extends ol.control.Control {
  constructor(opt_options) {
    const options = opt_options || {};

    const button = document.createElement('button');
    button.innerHTML = '🛰️';
    button.title = 'Toggle GPS Tracking';

    const element = document.createElement('div');
    element.className = 'ol-unselectable ol-control tracking-control';
    element.appendChild(button);

    super({
      element: element,
      target: options.target,
    });

    this.statsElement_ = document.createElement('div');
    this.statsElement_.className = 'tracking-stats';
    this.statsElement_.style.display = 'none';
    element.appendChild(this.statsElement_);

    this.accuracyElement_ = document.createElement('div');
    this.accuracyElement_.innerHTML = 'Accuracy: -';
    this.statsElement_.appendChild(this.accuracyElement_);

    this.altitudeElement_ = document.createElement('div');
    this.altitudeElement_.innerHTML = 'Altitude: -';
    this.statsElement_.appendChild(this.altitudeElement_);

    this.altitudeAccuracyElement_ = document.createElement('div');
    this.altitudeAccuracyElement_.innerHTML = 'Alt. Accuracy: -';
    this.statsElement_.appendChild(this.altitudeAccuracyElement_);

    this.headingElement_ = document.createElement('div');
    this.headingElement_.innerHTML = 'Heading: -';
    this.statsElement_.appendChild(this.headingElement_);

    this.speedElement_ = document.createElement('div');
    this.speedElement_.innerHTML = 'Speed: -';
    this.statsElement_.appendChild(this.speedElement_);

    this.coordinatesElement_ = document.createElement('div');
    this.coordinatesElement_.innerHTML = 'Coords: -';
    this.statsElement_.appendChild(this.coordinatesElement_);

    this.button_ = button;
    this.trackingOn_ = false;
    this.needsCentering_ = false;

    this.button_.addEventListener('click', this.handleTrackToggle_.bind(this), false);
  }

  handleTrackToggle_() {
    this.trackingOn_ = !this.trackingOn_;
    geolocation.setTracking(this.trackingOn_);
    if (this.trackingOn_) {
      this.button_.innerHTML = '📡';
      this.statsElement_.style.display = 'flex';
      this.needsCentering_ = true;
      const currentPosition = geolocation.getPosition();
      if (currentPosition && this.needsCentering_) {
        olMap.getView().animate({ center: currentPosition, zoom: Math.max(olMap.getView().getZoom(), 17), rotation: 0, duration: 500 });
        this.needsCentering_ = false;
      }
    } else {
      this.button_.innerHTML = '🛰️';
      this.statsElement_.style.display = 'none';
      this.updateStats('-', '-', '-', '-', '-', {lat: '-', lon: '-'});
      this.needsCentering_ = false;
    }
    console.log('Tracking toggled:', this.trackingOn_);
  }

  updateStats(accuracy, altitude, altitudeAccuracy, heading, speed, coordinates) {
    this.accuracyElement_.innerHTML = `Accuracy: ${accuracy} [m]`;
    this.altitudeElement_.innerHTML = `Altitude: ${altitude} [m]`;
    this.altitudeAccuracyElement_.innerHTML = `Alt. Accuracy: ${altitudeAccuracy} [m]`;
    this.headingElement_.innerHTML = `Heading: ${heading} [rad]`;
    this.speedElement_.innerHTML = `Speed: ${speed} [m/s]`;
    if (coordinates && coordinates.lat !== '-' && coordinates.lon !== '-') {
      this.coordinatesElement_.innerHTML = `Coords: ${coordinates.lat.toFixed(4)}, ${coordinates.lon.toFixed(4)}`;
    } else {
      this.coordinatesElement_.innerHTML = 'Coords: -';
    }
  }
}

window.trackingControlInstance = new TrackingControl();
olMap.addControl(window.trackingControlInstance);
