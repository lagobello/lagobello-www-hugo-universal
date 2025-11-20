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

// Zoom level thresholds for pop-up visibility
const MIN_POPUP_ZOOM = 17; // Pop-up visible at or above this zoom level
const MAX_POPUP_ZOOM = 20; // Pop-up visible below this zoom level (i.e., up to 19.x)

// Global references to individual tool control instances
window.infoControlInstance = window.infoControlInstance || null;
window.lengthControlInstance = window.lengthControlInstance || null;
window.areaControlInstance = window.areaControlInstance || null;

// Throttle function
function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function(...args) {
    if (!lastRan) {
      func.apply(this, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function() {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(this, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

// Throttled logger for specific debug messages
const throttledDebugLog = throttle(console.debug, 2000); // Log at most once every 2 seconds


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

// Status to Color Mapping for dynamic lot styling
const lotStatusColors = {
  'SOLD': 'rgba(229, 115, 115, 0.6)', // Reddish hue, slightly more opaque (0.6)
  'LISTED': 'rgba(76, 175, 80, 0.4)', // Green with original opacity
  'AVAILABLE': 'rgba(76, 175, 80, 0.4)', // Green with original opacity
  'UNDER CONTRACT': 'rgba(255, 235, 59, 0.4)', // Yellow with original opacity
  'PENDING': 'rgba(255, 235, 59, 0.4)', // Yellow with original opacity
  'RESERVED': 'rgba(100, 181, 246, 0.2)', // Blueish hue, less opaque (0.2)
  'FUTURE': 'rgba(186, 104, 200, 0.7)', // Pink-purpleish hue, more opaque (0.7)
  'DEFAULT': 'rgba(0, 60, 136, 0.4)'
};

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
  title: 'Mapbox Satellite',
  type: 'base',
  source: new ol.source.XYZ({
    url: 'https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.png?access_token=' + mapboxKey
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
  return lotStyles[feature.get('status')]; // This might be for a different layer or an old setup.
};

// New dynamic style function for lot layers based on lots.json status via spatial matching
var dynamicLotStyleFunction = function(feature) {
  let chosenColor = lotStatusColors.DEFAULT; // Default color

  if (lotsData && lotsData.length > 0) {
    const featureGeometry = feature.getGeometry();
    if (featureGeometry && typeof featureGeometry.intersectsCoordinate === 'function') {
      let spatiallyMatchedLot = null;
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
                  spatiallyMatchedLot = lotRecord;
                  break;
                }
              } catch (e) { /* ignore transform errors for styling */ }
            }
          }
        }
      }

      if (spatiallyMatchedLot) {
        const status = spatiallyMatchedLot["Lot Status"] ? spatiallyMatchedLot["Lot Status"].toUpperCase() : null;
        if (status && lotStatusColors[status]) {
          chosenColor = lotStatusColors[status];
        } else if (status) {
          console.warn(`No color mapping for status: ${status}. Using default.`);
        }
      }
    }
  }

  return new ol.style.Style({
    fill: new ol.style.Fill({
      color: chosenColor
    }),
    stroke: new ol.style.Stroke({ color: '#D3D3D3', width: 2 }) // Consistent stroke
  });
};


var layerVectorLotsPlatS1 = new ol.layer.Vector({
  title: 'Lot Layer - Plat Section 1',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-LOTS-S1.geojson'
  }),
  style: dynamicLotStyleFunction,
  opacity: 1 // Changed from 0.4
});

var layerVectorLotsPlatS2 = new ol.layer.Vector({
  title: 'Lot Layer - Plat Section 2',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-LOTS-S2.geojson'
  }),
  style: dynamicLotStyleFunction,
  opacity: 1 // Changed from 0.4
});

var layerVectorLotsPlatS3 = new ol.layer.Vector({
  title: 'Lot Layer - Plat Section 3 (future)',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-LOTS-S3.geojson'
  }),
  style: dynamicLotStyleFunction,
  opacity: 1 // Changed from 0.4
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
  opacity: 0.4
});

var layerVectorCommonArea = new ol.layer.Vector({
  title: 'Common Area - Section 3',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-COMMONAREA-S3.geojson'
  }),
  style: stylePark,
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
  opacity: 0.8
});

var layerVectorStreetAccess = new ol.layer.Vector({
  title: 'Right of Way - Access',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-ROW-ACCESS.geojson'
  }),
  style: styleStreet,
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
  layers: [layerMapboxSatellite, layerOsmStreet]

});

var olLayerGroupDrone = new ol.layer.Group({ title: 'Drone imagery', layers: [] });

var olLayerGroupOverlays = new ol.layer.Group({
  title: 'Overlays',
  layers: [
  layerVectorCaminataS1,
  layerVectorCaminataProposed,
  layerVectorLake,
  layerVectorLotsPlatS1,
  layerVectorLotsCameronAppraisalDistrict,
  layerVectorFountain,
  layerVectorCommonArea,
  layerVectorStreetS1,
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

// Function to handle zoom changes and pop-up visibility
function handleZoomChange() {
  var currentZoom = olMap.getView().getZoom();
  // Check if the overlay has a position (meaning it's likely visible or intended to be)
  if (overlay.getPosition()) {
    if (currentZoom < MIN_POPUP_ZOOM || currentZoom >= MAX_POPUP_ZOOM) {
      // console.log(`Zoom out of range (${currentZoom}), hiding pop-up.`); // Removed for production
      overlay.setPosition(undefined);
      // Optionally, unhighlight the feature if the pop-up is closed due to zoom
      if (highlight) {
        featureOverlayHighlight.getSource().removeFeature(highlight);
        highlight = null;
      }
    }
  }
}

// Listen to map view changes (zoom, pan)
olMap.on('moveend', handleZoomChange);

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

      if (layerVectorLotsPlatS1) layerVectorLotsPlatS1.changed();
      if (layerVectorLotsPlatS2) layerVectorLotsPlatS2.changed();
      if (layerVectorLotsPlatS3) layerVectorLotsPlatS3.changed();

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
        hasLinkedProps = true;
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

    // Prioritize friendlyLayerName if it's specific
    if (friendlyLayerName && friendlyLayerName !== 'Unknown Layer' && friendlyLayerName !== 'Unnamed Layer') {
        titleForUnmatched = friendlyLayerName;
    }
    // If friendlyLayerName is generic, try geoJsonFeatureIdentifier
    else if (geoJsonFeatureIdentifier && geoJsonFeatureIdentifier !== 'N/A') {
        titleForUnmatched = geoJsonFeatureIdentifier;
    }
    // If both are generic or unavailable, title remains "Feature Information"

    let genericHeaderHtml = `
      <div class="popup-section">
        <div class="popup-section-title main-title">${titleForUnmatched}</div>`;

        // If the title ended up being the geoJsonFeatureIdentifier, and a more friendly (but generic) layer name exists, show it as sub-info.
        // Or, if the title is "Feature Information" but we have a friendlyLayerName, show that.
        if ( (titleForUnmatched === geoJsonFeatureIdentifier && friendlyLayerName && friendlyLayerName !== 'Unknown Layer' && friendlyLayerName !== 'Unnamed Layer' && friendlyLayerName !== titleForUnmatched) ||
             (titleForUnmatched === "Feature Information" && friendlyLayerName && friendlyLayerName !== 'Unknown Layer' && friendlyLayerName !== 'Unnamed Layer') ) {
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

var makeListingsTable = function (url) {
  $.getJSON(url, function (data) {
    lotsData = data; // Store fetched data globally for reuse

    // Remove old global filter container if it exists from previous versions of the script
    $('#table-filters-container').remove();

    // Generate options for "Close To" filter (fixed for Section 2)
    var closeToOptionsHtml = `
        <option value="">All Locations</option>
        <option value="Lake">Lake</option>
        <option value="School">School</option>
    `;

    // Generate options for "Status" filter (fixed for now, could also be dynamic)
    var statusOptionsHtml = `
        <option value="">All Statuses</option>
        <option value="Available">Available</option>
        <option value="Listed">Listed</option>
    `;
    // The base filter in applyFiltersAndSortAndRender already limits to Available/Listed.
    // This dropdown will further refine *within* that set if a specific status is chosen.

    var items = []; // Initialize items array

    var tableHeadersHtml = `
      <thead>
        <tr>
          <th>Address</th>
          <th>Status</th>
          <th>Block</th>
          <th>Lot</th>
          <th>Price</th>
          <th>Size (sqft)</th>
          <th>Agent</th>
          <th>Agent Phone</th>
          <th>Listing</th>
          <th>Location</th>
          <th>Close To <br><select id="header-filter-location" class="header-filter form-control form-control-sm" style="width: 90%; margin-top: 4px; padding: 0.15rem 0.5rem; font-size: 0.85em; height: auto; color: #495057; background-color: #fff;">${closeToOptionsHtml}</select></th>
        </tr>
      </thead>`;

    items.push(tableHeadersHtml); // Push headers to items
    items.push('<tbody></tbody>'); // Empty tbody, populated by applyFiltersAndSortAndRender

    var tableElement = $('<table/>', {
      class: 'lot-table table table-striped table-hover',
      html: items.join('')
    });

    // Clear existing table content and append new table structure
    $('#lot-table').empty().append(tableElement);

    // Set initial values for dropdowns if they exist in tableDisplayState (e.g. from previous interaction before a full reload)
    if (tableDisplayState.filters.location) {
        $('#header-filter-location').val(tableDisplayState.filters.location);
    }

    applyFiltersAndSortAndRender(); // Initial render which also sets up sort indicators

    // Event listeners (use .off().on() to prevent multiple bindings if makeListingsTable is ever recalled)
    $('#lot-table').off('click', '.call-now-btn').on('click', '.call-now-btn', function(e) {
        e.stopPropagation();
        var phone = $(this).data('phone');
        if (phone) {
            window.location.href = 'tel:' + phone;
        }
    });

    $('#lot-table thead th').off('click').on('click', function(e) {
      if ($(e.target).is('select.header-filter')) {
          e.stopPropagation(); // Prevent sorting when clicking on the select dropdown itself
          return;
      }
      // Use clone to get text without children like select or span.sort-arrow
      var columnText = $(this).clone().children().remove().end().text().trim();
      var columnKey;
      switch (columnText) {
        case 'Address': columnKey = 'Name'; break;
        case 'Size (sqft)': columnKey = 'Size [sqft]'; break;
        case 'Price': columnKey = 'List Price'; break;
        // Status and Close To are handled by their select, not direct th click for sorting
        default: return;
      }

      if (tableDisplayState.sort.column === columnKey) {
        tableDisplayState.sort.order = tableDisplayState.sort.order === 'asc' ? 'desc' : 'asc';
      } else {
        tableDisplayState.sort.column = columnKey;
        tableDisplayState.sort.order = 'asc'; // Default to asc on new column
      }
      applyFiltersAndSortAndRender();
    });

    // Filter dropdown listeners
    $('#header-filter-status, #header-filter-location').off('change').on('change', function(e) {
        e.stopPropagation(); // Prevent th click event if selects are inside th
        tableDisplayState.filters.status = $('#header-filter-status').val();
        tableDisplayState.filters.location = $('#header-filter-location').val();
        applyFiltersAndSortAndRender();
    });

  });
  return true;
};

// Helper function to render the table body based on provided lots data
function renderTableBody(lotsToRender) {
  var tableBodyItems = [];
  $.each(lotsToRender, function (key, val) {
    var listPrice = val["List Price"] ? `$${parseFloat(val["List Price"]).toLocaleString()}` : 'N/A';
    var sizeSqft = val["Size [sqft]"] ? `${parseFloat(val["Size [sqft]"]).toLocaleString()} sqft` : 'N/A';

    var listingLinkHtml = 'N/A';
    if (val["Listing Link"]) {
        var rawLink = val["Listing Link"];
        // Attempt to extract URL if it's embedded, e.g. "Zillow Link - https://..."
        var urlMatch = rawLink.match(/https?:\/\/[^\s]+/i);
        var actualUrl = urlMatch && urlMatch[0] ? urlMatch[0] : (rawLink.toLowerCase().startsWith('http') ? rawLink : null);

        if (actualUrl) {
            var linkText = "View Listing"; // Default text
            try {
                var domain = new URL(actualUrl).hostname;
                linkText = domain.replace(/^www\./, ''); // Show domain as link text
            } catch (e) { /* use default linkText */ }
            // Apply truncation via CSS class if needed, e.g., class="truncated-link"
            listingLinkHtml = `<a href="${actualUrl}" target="_blank" rel="noopener noreferrer" class="listing-link-cell" title="${actualUrl}">${linkText}</a>`;
        } else {
            // If no valid URL, display the text but not as a link
            listingLinkHtml = `<span title="${rawLink}">${rawLink.substring(0,30)}${rawLink.length > 30 ? '...' : ''}</span>`;
        }
    }

    var agentPhoneStr = val["Listing Agent Phone Number"] ? String(val["Listing Agent Phone Number"]).replace(/\D/g, '') : '';
    var callNowButton = agentPhoneStr ? `<button class="btn btn-sm btn-success call-now-btn" data-phone="${agentPhoneStr}">Call</button>` : '';
    var agentPhoneDisplay = val["Listing Agent Phone Number"] ? String(val["Listing Agent Phone Number"]) : 'N/A';

    tableBodyItems.push(
      `<tr data-lot-name="${val.Name}" style="cursor:pointer;">
        <td>${val.Name || 'N/A'}</td>
        <td>${val["Lot Status"] || 'N/A'}</td>
        <td>${listPrice}</td>
        <td>${sizeSqft}</td>
        <td>${val["Street Address"] || 'N/A'}</td>
        <td>${val["Listing Agent"] || 'N/A'}</td>
        <td>${agentPhoneDisplay} ${callNowButton}</td>
        <td>${listingLinkHtml}</td>
        <td>${val.Location || 'N/A'}</td>
        <td>${val["Close-to"] || 'N/A'}</td>
      </tr>`
    );
  });
  $('#lot-table tbody').html(tableBodyItems.join(''));

  // Re-attach row click listeners
  $('#lot-table tbody tr').on('click', function(e) { // Added event 'e'
    var $target = $(e.target); // Get the actual clicked element

    // Prevent row click if the click was on a button or a link inside the row
    if ($target.is('a, button') || $target.closest('a, button').length) {
        // If it's a link or button, or inside one, let its default action proceed.
        // No need to e.stopPropagation() unless other row-level behaviors are unintentionally triggered by link/button.
        return;
    }

    var lotName = $(this).data('lot-name');
    if (!lotName) return;
    $('#lot-table tbody tr').removeClass('table-info');
    $(this).addClass('table-info');
    var lotDataEntry = lotsData.find(ld => ld.Name === lotName);
    if (lotDataEntry && lotDataEntry.Location) {
      var constructedLotName = 'BLK ' + Math.floor(lotDataEntry['Block Number']) + ' LOT ' + Math.floor(lotDataEntry['Lot Number']);
      const targetFeature = findFeatureByLotName(constructedLotName);
      if (targetFeature) {
        var featureCenter = ol.extent.getCenter(targetFeature.getGeometry().getExtent());
        olMap.getView().animate({ center: featureCenter, zoom: 19, duration: 500 });
        var pseudoEvt = { pixel: olMap.getPixelFromCoordinate(featureCenter), coordinate: featureCenter };
        content.innerHTML = retrieveFeatureInfoTable(pseudoEvt);
        overlay.setPosition(featureCenter);
        featureHighlight(targetFeature);
      }
    }
  });
}

// Global store for current filters and sort state
var tableDisplayState = {
    filters: {
        location: '', // "Close-to"
        status: ''     // "Lot Status" - this will be ANDed with the default "Available/Listed"
    },
    sort: { column: 'List Price', order: 'asc' }
};

// Function to apply filters and sort, then render table
function applyFiltersAndSortAndRender() {
    if (!lotsData) return;

    // 1. Apply base filter (Section 2, Available/Listed)
    var currentLots = lotsData.filter(function(lot) {
        return lot.Subdivision === "Section 2" &&
               (lot["Lot Status"] === "Available" || lot["Lot Status"] === "Listed");
    });

    // 2. Apply "Close-to" (Location) filter from header dropdown
    var locationFilterValue = $('#header-filter-location').val();
    if (locationFilterValue) {
        currentLots = currentLots.filter(function(lot) {
            return lot["Close-to"] && lot["Close-to"].toLowerCase() === locationFilterValue.toLowerCase();
        });
    }

    // 3. Apply "Lot Status" filter from header dropdown
    var statusFilterValue = $('#header-filter-status').val();
    if (statusFilterValue) {
        currentLots = currentLots.filter(function(lot) {
            return lot["Lot Status"] && lot["Lot Status"].toLowerCase() === statusFilterValue.toLowerCase();
        });
    }

    // 4. Apply sorting from tableDisplayState
    currentLots = sortLotsData(currentLots, tableDisplayState.sort.column, tableDisplayState.sort.order);

    // 5. Render
    renderTableBody(currentLots);


    // Update sort indicators in table headers
    $('#lot-table thead th').each(function() {
        var $this = $(this);
        // Normalize header text by removing existing indicators and extra spaces for reliable matching
        var headerText = $this.clone().children('.sort-arrow').remove().end().text().trim();
        var indicatorSpan = $this.find('span.sort-arrow');
        if (indicatorSpan.length === 0 && ['Address', 'Size (sqft)', 'Price'].includes(headerText)) {
            // Ensure span exists for sortable columns if not already there
            $this.append(' <span class="sort-arrow"></span>');
            indicatorSpan = $this.find('span.sort-arrow'); // Re-find it
        }

        var indicatorChar = ''; // Default to no indicator
        var columnKeyMappings = {'Address': 'Name', 'Size (sqft)': 'Size [sqft]', 'Price': 'List Price'};
        var currentHeaderKey = columnKeyMappings[headerText];

        if (currentHeaderKey) { // If it's a sortable column
            $this.css('cursor', 'pointer');
            if (currentHeaderKey === tableDisplayState.sort.column) {
                indicatorChar = tableDisplayState.sort.order === 'asc' ? '▲' : '▼';
            }
            if (indicatorSpan.length) {
                 indicatorSpan.text(indicatorChar); // Set text of existing span
            } else if (indicatorChar) {
                // This case should be less common if span is added above, but as a fallback
                $this.append(' <span class="sort-arrow">' + indicatorChar + '</span>');
            }
        } else {
            $this.css('cursor', 'default');
            if (indicatorSpan.length) indicatorSpan.text(''); // Clear indicator for non-sortable if any somehow existed
        }
    });
}

// Helper sort function
function sortLotsData(lotsArray, columnKey, order) {
  return lotsArray.sort(function(a, b) {
    var valA = a[columnKey];
    var valB = b[columnKey];

    // Handle numeric sort for price and size
    if (columnKey === 'List Price' || columnKey === 'Size [sqft]') {
      valA = parseFloat(valA);
      valB = parseFloat(valB);
      if (isNaN(valA)) valA = (order === 'asc' ? Infinity : -Infinity); // Push NaNs to end/start
      if (isNaN(valB)) valB = (order === 'asc' ? Infinity : -Infinity);
    } else { // Handle string sort for Name
      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
    }

    if (valA < valB) {
      return order === 'asc' ? -1 : 1;
    }
    if (valA > valB) {
      return order === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

makeListingsTable('/data/lots.json');


// Helper function to find a feature by its 'Name' property from lots.json
// This might be slow if there are many features.
// Consider adding 'Name' property directly to GeoJSON features during conversion if possible.
function findFeatureByLotName(lotName) {
    let foundFeature = null;
    const layersToSearch = [layerVectorLotsPlatS1, layerVectorLotsPlatS2, layerVectorLotsPlatS3];

    for (const layer of layersToSearch) {
        if (foundFeature) break;
        const source = layer.getSource();
        if (source && source.getFeatures) {
            const features = source.getFeatures();
            for (const feature of features) {
                // This is the tricky part: GeoJSON features might not have a direct 'Name' property
                // that matches lots.json. We rely on spatial matching for popups.
                // For reverse (map to table), we need a reliable link.
                // This placeholder shows the need for such a link.
                // If features are guaranteed to have a unique ID that maps to lotName:
                // if (feature.get('id_property_that_matches_lotName') === lotName) {
                //    foundFeature = feature;
                //    break;
                // }

                // Fallback: if lotsData is available, try to match by location, then check if this feature contains that location
                const lotJsonEntry = lotsData.find(l => 'BLK ' + Math.floor(l['Block Number']) + ' LOT ' + Math.floor(l['Lot Number']) === lotName);
                if (lotJsonEntry && lotJsonEntry.Location) {
                    const parts = lotJsonEntry.Location.split(',');
                    if (parts.length === 2) {
                        const lat = parseFloat(parts[0].trim());
                        const lon = parseFloat(parts[1].trim());
                        if (!isNaN(lat) && !isNaN(lon)) {
                            const lotPointWGS84 = [lon, lat];
                            const lotPointInFeatureProj = ol.proj.transform(lotPointWGS84, 'EPSG:4326', olMap.getView().getProjection());
                            if (feature.getGeometry().intersectsCoordinate(lotPointInFeatureProj)) {
                                foundFeature = feature;
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
    return foundFeature;
}


olMap.on('pointermove', function (evt) {
  if (evt.dragging) {
    throttledDebugLog('dragging detected');
    return;
  }
  var pixel = olMap.getEventPixel(evt.originalEvent);
  var feature = retrieveFeature(pixel);

  if (typeof feature === 'undefined') {
    throttledDebugLog('no feature found on mouse-over');
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
  var center = getCenterOfExtent(extent);
  var centerShifted = movePoint10mDown(center); // Assuming this function is still desired for map centering
  olMap.getView().animate({ zoom: 17, center: centerShifted }, function(completed) {
    if (completed) {
      // Ensure pop-up visibility is checked after click-animation completes.
      // Since zoom 18 is within valid range [17, 20), this will ensure it remains visible.
      handleZoomChange();
    }
  });

  // Highlight corresponding row in the table
  // This requires knowing which property of the feature links to the table rows (e.g., lot name)
  // Assuming 'retrieveFeatureInfoTable' can provide the matched lot's name or we can get it from the feature
  var matchedLotData = null; // This would be populated by info from the clicked feature that links to lots.json

  // Attempt to find matching lot data from the feature clicked.
  // This relies on the spatial matching already present in retrieveFeatureInfoTable or similar logic.
  const featureGeometry = feature.getGeometry();
  const friendlyLayerName = getFriendlyLayerName(feature); // Use existing helper
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
                matchedLotData = lotRecord;
                break;
              }
            } catch (e) { /* ignore */ }
          }
        }
      }
    }
  }

  if (matchedLotData && matchedLotData.Name) {
    $('#lot-table tbody tr').removeClass('table-info'); // Remove highlight from other rows
    // Find the row with the matching data-lot-name and add class
    var targetRow = $(`#lot-table tbody tr[data-lot-name="${matchedLotData.Name}"]`);
    if (targetRow.length) {
      targetRow.addClass('table-info');
      // Optional: Scroll the table to make the highlighted row visible
      // This requires the #lot-table container to have a fixed height and overflow-y: auto;
      var tableContainer = $('#lot-table').parent(); // Or specific scrollable container
      if (tableContainer.length && targetRow.position()) {
        var rowTop = targetRow.position().top;
        var containerScrollTop = tableContainer.scrollTop();
        var containerHeight = tableContainer.height();
        // Check if row is not visible
        if (rowTop < 0 || rowTop > containerHeight - targetRow.outerHeight()) {
          tableContainer.scrollTop(containerScrollTop + rowTop - (containerHeight / 2) + (targetRow.outerHeight() / 2) );
        }
      }
    }
  }
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
