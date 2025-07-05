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

// var layerWatercolors = new ol.layer.Group({
//   title: 'Watercolors',
//   type: 'base',
//   combine: true,
//   layers: [
//     new ol.layer.Tile({ source: new ol.source.Stamen({ layer: 'watercolor' }) }),
//     new ol.layer.Tile({ source: new ol.source.Stamen({ layer: 'terrain-labels' }) })
//   ],
//   opacity: 1.0
// });

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

var genericSource = new ol.source.Vector(); // Renamed from 'source' in case it's used elsewhere
var drawingLayerSource = new ol.source.Vector(); // Dedicated source for drawings

var layerVectorDrawings = new ol.layer.Vector({
  source: drawingLayerSource, // Use dedicated source
  style: new ol.style.Style({
    fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' }), // Original fill
    stroke: new ol.style.Stroke({ color: '#ffcc33', width: 3 }),    // Original color, slightly thicker width
    image: new ol.style.Circle({ radius: 7, fill: new ol.style.Fill({ color: '#ffcc33' }) }) // Original image style
  }),
  zIndex: 100 // Ensure drawing layer is on top
});

var olLayerGroupBasemaps = new ol.layer.Group({
  title: 'Base maps',
  layers: [layerOsmStreet,  layerMapboxSatellite] // disabled on port to ol 10.6: layerWatercolors

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
  zIndex: 10 // Ensure this group is below the drawing layer (zIndex 100)
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

// Global references to individual tool control instances for managing active state
// window.infoControlInstance, window.lengthControlInstance, window.areaControlInstance are initialized at the top.

// Global function to manage active state of tool controls
function setSelectedTool(toolMode, clickedControlInstance) {
  currentToolMode = toolMode;

  const controls = [window.infoControlInstance, window.lengthControlInstance, window.areaControlInstance];
  controls.forEach(control => {
    if (control && control.element) { // Check if control and its element exist
      if (control === clickedControlInstance) {
        control.element.firstChild.classList.add('active'); // Assuming button is firstChild
      } else {
        control.element.firstChild.classList.remove('active');
      }
    }
  });
  setActiveToolInteraction(toolMode); // This handles map interactions
}

// Function to add download/copy links to layers in the LayerSwitcher
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

    // Prevent adding multiple sets of links
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

      // Determine URL and type
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
      // OSM layers are intentionally skipped for copy URL as they don't have a simple one.

      // Create a container for the icons if we have any actions
      let iconContainer = null;
      if (urlToCopy || (isGeoJSON && urlToCopy)) {
        iconContainer = document.createElement('span');
        iconContainer.className = 'layer-action-icons';
        // Basic styling for the container - can be refined in CSS
        iconContainer.style.marginLeft = '8px'; // Space it from the label
        iconContainer.style.display = 'inline-flex';
        iconContainer.style.alignItems = 'center';
      }

      // Add Copy URL button
      if (urlToCopy) {
        const copyButton = document.createElement('button');
        copyButton.innerHTML = '🔗';
        copyButton.title = `Copy URL for ${layerTitle}`;
        copyButton.className = 'copy-url-button';
        // copyButton.style.marginLeft = '5px'; // Spacing now handled by container or individual button margins
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

      // Add Download link for GeoJSON
      if (isGeoJSON && urlToCopy) {
        const downloadLink = document.createElement('a');
        downloadLink.href = urlToCopy;
        downloadLink.innerHTML = '⭳';
        downloadLink.title = `Download ${layerTitle}`;
        downloadLink.className = 'download-geojson-link';
        // downloadLink.style.marginLeft = '5px'; // Spacing now handled by container or individual button margins

        let filename = layerTitle.replace(/[^\w\s.-]/gi, '_').replace(/\s+/g, '_').toLowerCase();
        if (!filename) filename = "layer";
        if (!filename.endsWith('.geojson')) filename += ".geojson";
        downloadLink.download = filename;

        iconContainer.appendChild(downloadLink);
      }

      // Append the icon container to the list item after the label
      if (iconContainer && label && label.parentNode === li) { // Ensure label exists and is a direct child of li
        // Use label.after() to insert the icon container immediately after the label element.
        // This is a more direct and modern way to ensure correct placement.
        label.after(iconContainer);
      }
    }
  }
}


// --- InfoControl ---
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
    window.infoControlInstance = this; // Store instance for global access

    button.addEventListener('click', () => {
      setSelectedTool('info', this);
    });
  }
}

// --- LengthControl ---
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
    window.lengthControlInstance = this; // Store instance for global access

    button.addEventListener('click', () => {
      setSelectedTool('length', this);
    });
  }
}

// --- AreaControl ---
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
    window.areaControlInstance = this; // Store instance for global access

    button.addEventListener('click', () => {
      setSelectedTool('area', this);
    });
  }
}

// --- UnitToggleControl ---
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
    element.appendChild(this.imperialButton); // Imperial button first

    this.metricButton = document.createElement('button');
    this.metricButton.innerHTML = '⚙️';
    this.metricButton.title = 'Use Metric Units';
    this.metricButton.addEventListener('click', () => this.setUnit('metric'));
    element.appendChild(this.metricButton); // Metric button second

    // Set initial active state based on global displayUnits
    this.updateButtonActiveState();
  }

  setUnit(unit) {
    if (displayUnits === unit) return; // No change
    displayUnits = unit;
    this.updateButtonActiveState();
    refreshMapMeasurements(); // Call global function to update UI
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

// Placeholder for the function that will refresh UI elements when units change
function refreshMapMeasurements() {
  console.log(`Unit system changed to: ${displayUnits}. UI refresh needed.`);
  // Implementation will be in Phase 2
  // This function will need to update:
  // - Active drawing tooltips (length/area)
  // - Feature info pop-up (if open)
  // - Lot table
}


var olMap = new ol.Map({
  target: 'ol-map',
  controls: [
    // Standard controls that might be positioned elsewhere by default by OL
    new ol.control.Attribution({collapsible: true}),
    new ol.control.Rotate(),
    new ol.control.FullScreen(),
    controlMousePosition,
    layerSwitcher,

    // Controls intended for the single top-left column
    new ol.control.Zoom(),
    new InfoControl(),
    new LengthControl(),
    new AreaControl(),
    new UnitToggleControl(),
  ],
  overlays: [overlay],
  layers: [olLayerGroupBasemaps, olLayerGroupDrone, olLayerGroupOverlays, layerVectorDrawings], // Restored layerVectorDrawings
  view: chooseView()
});

// After map is initialized and layer switcher is added, listen for its panel updates
if (layerSwitcher && layerSwitcher.panel) {
  layerSwitcher.panel.addEventListener('rendercomplete', addDownloadLinksToLayerSwitcher);
  // Also call it once initially in case the panel is already rendered (e.g. if startActive is true)
  // or if the event isn't caught reliably on first load.
  // A small timeout ensures the DOM elements are likely available.
  setTimeout(addDownloadLinksToLayerSwitcher, 500);
} else {
  console.warn('LayerSwitcher or its panel is not available to attach rendercomplete listener.');
}


// =============================
//  3.  Dynamic XYZ drone layers
// =============================
// ============================= Dynamic XYZ loader =============================
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
        // latest flight visible by default
        if (idx === folders.length - 1) lyr.setVisible(true);
      });
      layerSwitcher.renderPanel();
    })
    .catch(console.error);
})();

// =============================
//  Load lots.json data
// =============================
(function loadLotsData() {
  fetch('/data/lots.json') // Restoring correct path as per user feedback
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok for lots.json');
      }
      return response.json();
    })
    .then(data => {
      lotsData = data;
      console.log('lots.json loaded successfully:', lotsData); // Log the data itself
    })
    .catch(error => {
      console.error('CRITICAL: Error loading lots.json:', error.message);
      console.warn('lots.json fetch failed. Pop-up information linked to this file will be unavailable. Check file path and server logs.');
      lotsData = []; // Initialize as empty array on error to prevent other parts from breaking
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

// Helper function to find the friendly layer name (title)
function getFriendlyLayerName(clickedFeature) {
  if (!clickedFeature || !olMap) return 'Unknown Layer';

  let featureLayer = null;
  // Find the layer the feature belongs to. This is a bit complex as features don't directly store their layer.
  // We iterate over layers and see if the feature is in its source.
  // This assumes vector layers. For other layer types, this approach might need adjustment.

  // Check top-level layers first
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
      // If source is a Cluster source, check its source's features
      if (source instanceof ol.source.Cluster) {
        const clusterSource = source.getSource();
         if (clusterSource && typeof clusterSource.getFeatures === 'function') {
            if (clusterSource.getFeatures().includes(clickedFeature)) {
                // We found the feature in the source of a cluster. Use the cluster layer's title.
                featureLayer = layer;
                break;
            }
        }
      }
    } else if (layer instanceof ol.layer.Group) {
      // Check layers within groups
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
                    featureLayer = subLayer; // Use the subLayer (vector layer) title
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
    return title || 'Unnamed Layer'; // Return title or a placeholder if title is missing
  }

  // Fallback if layer not easily found by feature instance (e.g. complex scenarios or non-vector layers)
  // This part may need more sophisticated handling if features come from diverse layer types not covered above.
  return clickedFeature.get('Layer') || 'Unknown Layer'; // Original fallback
}


var retrieveFeatureInfoTable = function (evt) {
  var feature = retrieveFeature(evt.pixel);
  // Using 'EntityHandle' as the potential key for matching with lots.json based on logs.
  // This should be confirmed by the user. If another key holds the "BLK 1 LOT X" identifier, this needs to change.
  var geoJsonName = feature.get('EntityHandle');
  console.log(`Using feature.get('EntityHandle') for geoJsonName: ${geoJsonName}`);

  var area = featureCalculateAreaMeters(feature);
  var entityHandle = feature.get('EntityHandle') || 'N/A'; // Retain for GeoJSON section if different from matching key
  var rawLayerName = feature.get('Layer') || 'Unknown'; // Keep raw layer name for specific cases if needed
  var friendlyLayerName = getFriendlyLayerName(feature);

  // Find matching lot in lotsData
  var matchedLot = null;
  if (lotsData && geoJsonName) {
    console.log("Attempting to match GeoJSON feature name:", `'${geoJsonName}'`);
    // Trim whitespace from both names for more robust matching
    const trimmedGeoJsonName = geoJsonName.trim();
    matchedLot = lotsData.find(lot => lot.Name && lot.Name.trim() === trimmedGeoJsonName);
    if (!matchedLot) {
      // Optional: Add a case-insensitive fallback if strict matching fails
      // matchedLot = lotsData.find(lot => lot.Name && lot.Name.trim().toLowerCase() === trimmedGeoJsonName.toLowerCase());
      // if (matchedLot) console.log("Matched case-insensitively:", matchedLot);
    }
    console.log("Matched lot from lots.json:", matchedLot);
  } else if (lotsData === null) {
    console.warn("lotsData is null. Cannot perform match. Check if lots.json loaded correctly.");
  } else if (!geoJsonName) {
    console.log("No geoJsonName found on feature, cannot match with lots.json.");
  }


  // --- Top Level Information (only for matched lots) ---
  var parcelLegalDesc = matchedLot && matchedLot.Name ? matchedLot.Name : (geoJsonName || 'N/A');
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

  var areaString = 'N/A'; // This is for metric display or general fallback
  if (area) {
    if (displayUnits === 'imperial') {
      var areaSqFt_calc = area * 10.7639;
      // For areaString (used in metric or if imperial doesn't specify format)
      if (areaSqFt_calc > 43560) {
        areaString = `${(areaSqFt_calc / 43560).toFixed(2)} acres`;
      } else {
        areaString = `${areaSqFt_calc.toFixed(2)} ft<sup>2</sup>`;
      }
    } else { // Metric
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

  // --- Linked Data (from lots.json) Section ---
  var linkedDataContent = '<table style="width:100%">';
  let hasLinkedProps = false;
  if (matchedLot) {
    const topLevelKeys = ["Name", "Lot Status", "List Price", "Size [sqft]", "Listing Agent", "Listing Agent Phone Number", "Listing Link"];
    for (const key in matchedLot) {
      if (matchedLot.hasOwnProperty(key) && !topLevelKeys.includes(key)) {
        linkedDataContent += `<tr><td>${key}</td><td><code>${matchedLot[key] !== null && matchedLot[key] !== undefined ? matchedLot[key] : 'N/A'}</code></td></tr>`;
        hasLinkedProps = true;
      }
    }
  }
  if (!hasLinkedProps && matchedLot) { // Show message only if it's a matched lot but no *extra* props
    linkedDataContent += '<tr><td colspan="2">No additional linked data found.</td></tr>';
  } else if (!matchedLot) { // Clear content if not a matched lot (section won't be shown anyway)
     linkedDataContent = '';
  }
  linkedDataContent += '</table>';

  var linkedDataDumpHtml = '';
  if (matchedLot) { // Only build this section if there's a matched lot
    linkedDataDumpHtml = `
      <div class="popup-section collapsible-section" style="display:none;" id="linked-data-section">
        <div class="popup-section-title">Linked Data (lots.json)</div>
        ${linkedDataContent}
      </div>
    `;
  }

  // --- Calculated Data Section ---
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
    const featureForTurf = feature.clone(); // Clone to avoid altering the original feature
    const geometryInEPSG3857 = featureForTurf.getGeometry(); // This geometry is in EPSG:3857

    // Create a GeoJSON geometry object with EPSG:3857 coordinates for turf.
    // turf.js typically expects GeoJSON, and while GeoJSON standard is WGS84,
    // for planar calculations, it uses the coordinate values as-is.
    const turfInputGeometry = JSON.parse(turfFormatForCentroid.writeGeometry(geometryInEPSG3857));

    console.log("Input Geometry for turf.centroid (coords are EPSG:3857):", JSON.stringify(turfInputGeometry));
    var centroidProjected = turf.centroid(turfInputGeometry); // turf calculates centroid, result coords are EPSG:3857

    if (centroidProjected && centroidProjected.geometry && centroidProjected.geometry.coordinates) {
      console.log("Raw turf.centroid output (coords are EPSG:3857):", centroidProjected.geometry.coordinates);
      var lonLatCentroid = ol.proj.transform(centroidProjected.geometry.coordinates, 'EPSG:3857', 'EPSG:4326'); // Transform to WGS84

      // Check for suspicious (0,0)-like WGS84 coordinates
      // Threshold can be adjusted. 0.001 degrees is roughly 111 meters.
      const threshold = 0.01; // Approx 1.1 km, if centroid is this close to 0,0 lat/lon, it's suspicious for typical data
      if (Math.abs(lonLatCentroid[1]) < threshold && Math.abs(lonLatCentroid[0]) < threshold) {
        // Heuristic: if original feature extent is far from 0,0 then a 0,0 centroid is likely an error
        const featureExtent = feature.getGeometry().getExtent(); // EPSG:3857
        const featureCenter = ol.extent.getCenter(featureExtent);
        const featureCenterWGS84 = ol.proj.transform(featureCenter, 'EPSG:3857', 'EPSG:4326');
        // If feature center is far from (0,0) but centroid is very close, then treat centroid as invalid.
        if (Math.abs(featureCenterWGS84[1]) > 1 && Math.abs(featureCenterWGS84[0]) > 1) { // e.g. if feature is more than ~1 deg from Null Island
            console.warn("Calculated WGS84 centroid is suspiciously close to (0,0):", lonLatCentroid, "Original feature center (WGS84):", featureCenterWGS84);
            centroidString = 'N/A (Invalid Calc)';
        } else {
             centroidString = `${lonLatCentroid[1].toFixed(5)}, ${lonLatCentroid[0].toFixed(5)}`; // Lat, Lon
        }
      } else {
        centroidString = `${lonLatCentroid[1].toFixed(5)}, ${lonLatCentroid[0].toFixed(5)}`; // Lat, Lon
      }
    } else {
      console.warn("turf.centroid did not return valid coordinates for feature:", feature.get('name'), turfGeom);
    }
  } catch (e) {
    console.error("Error calculating centroid:", e);
    centroidString = 'Error';
  }

  var calculatedDataContent = `<table style="width:100%">`;
  if (displayUnits === 'imperial') {
    if (area) { // Only show area if calculated
        calculatedDataContent += `<tr><td>Area (sqft)</td><td><code>${areaSqFtImperial_display}</code></td></tr>`;
        calculatedDataContent += `<tr><td>Area (acres)</td><td><code>${areaAcresImperial_display}</code></td></tr>`;
    }
  } else { // Metric
    calculatedDataContent += `<tr><td>Area (calculated)</td><td><code>${areaString}</code></td></tr>`;
  }
  calculatedDataContent += `<tr><td>Centroid (Lat, Lon WGS84)</td><td><code>${centroidString}</code></td></tr>`;

  // Add Clicked Coordinates
  var clickedCoordWGS84 = ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
  var clickedCoordString = `${clickedCoordWGS84[1].toFixed(5)}, ${clickedCoordWGS84[0].toFixed(5)}`; // Lat, Lon
  calculatedDataContent += `<tr><td>Clicked (Lat, Lon WGS84)</td><td><code>${clickedCoordString}</code></td></tr>`;

  calculatedDataContent += `</table>`;

  var calculatedDataHtml = `
    <div class="popup-section collapsible-section" style="display:none;" id="calculated-data-section">
      <div class="popup-section-title">Calculated Data</div>
      ${calculatedDataContent}
    </div>
  `;

  // --- GeoJSON Metadata Section ---
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

  // --- Toggle Buttons ---
  var buttonsArray = [];
  if (hasGeoJsonProps) {
    buttonsArray.push(`<button onclick="toggleSection('geojson-metadata-section', this)" class="popup-toggle-button">GeoJSON Details</button>`);
  }
  buttonsArray.push(`<button onclick="toggleSection('calculated-data-section', this)" class="popup-toggle-button">Calculated</button>`);

  if (matchedLot && hasLinkedProps) {
    buttonsArray.push(`<button onclick="toggleSection('linked-data-section', this)" class="popup-toggle-button">Linked Data</button>`);
  }

  toggleButtonsHtml = "";
  if (buttonsArray.length > 0) {
    toggleButtonsHtml = `<div class="popup-toggle-buttons">${buttonsArray.join('')}</div>`;
  }

  // Assemble the final HTML
  if (matchedLot) {
    return topLevelHtml + toggleButtonsHtml + geoJsonMetadataHtml + calculatedDataHtml + linkedDataDumpHtml;
  } else {
    let titleForUnmatched = parcelLegalDesc !== 'N/A' ? parcelLegalDesc : friendlyLayerName;
    if (titleForUnmatched === 'Unknown Layer' && parcelLegalDesc === 'N/A') {
        titleForUnmatched = "Feature Information";
    }

    let genericHeaderHtml = `
      <div class="popup-section">
        <div class="popup-section-title main-title">${titleForUnmatched}</div>`;

        if (friendlyLayerName !== 'Unknown Layer' && titleForUnmatched !== friendlyLayerName) {
          genericHeaderHtml += `<table style="width:100%"><tr><td>Layer</td><td><code>${friendlyLayerName}</code></td></tr></table>`;
        }
    genericHeaderHtml += `</div>`;

    return genericHeaderHtml + toggleButtonsHtml + geoJsonMetadataHtml + calculatedDataHtml;
  }
};

// Make sure this function is accessible globally for the inline onclick
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
      var areaM2 = turf.area(val); // Area in square meters
      var displayArea;
      if (displayUnits === 'imperial') {
        var areaSqFt = areaM2 * 10.7639;
        if (areaSqFt > 43560) { // acre
            displayArea = (areaSqFt / 43560).toFixed(2);
        } else {
            displayArea = areaSqFt.toFixed(2);
        }
      } else { // Metric
        if (areaM2 > 10000) { // km2
            displayArea = (areaM2 / 1000000).toFixed(2);
        } else { // m2
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
  // Corrected: typeSelect.value to currentToolMode
  if (currentToolMode !== 'info') {
    return;
  }

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
  // Corrected: typeSelect.value to currentToolMode
  if (currentToolMode === 'info' || !sketch) { // Also ensure sketch exists before trying to use it for messages
    if (helpTooltipElement && !helpTooltipElement.classList.contains('hidden')) {
      helpTooltipElement.classList.add('hidden'); // Hide tooltip if not in draw mode or no sketch
    }
    return;
  }
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
  if (currentToolMode === 'info') return; // Updated
  helpTooltipElement.classList.add('hidden');
});

// Global variables currentToolMode, displayUnits, and draw are defined at the top of the script.

// Function to set the active tool and update interactions.
// Called by the individual tool controls.
function setActiveToolInteraction(toolMode) {
  currentToolMode = toolMode;
  if (olMap) {
    if (draw) {
      olMap.removeInteraction(draw);
    }
    addInteraction();
  }
}

/**
 * Format length output.
 * @param {LineString} line The line.
 * @return {string} The formatted length.
 */
var formatLength = function (line) {
  var length = ol.sphere.getLength(line); // Length in meters
  var output;
  if (displayUnits === 'imperial') {
    var lengthFeet = length * 3.28084;
    if (lengthFeet > 5280) { // If longer than a mile
      output = (lengthFeet / 5280).toFixed(2) + ' ' + 'mi';
    } else {
      output = lengthFeet.toFixed(2) + ' ' + 'ft';
    }
  } else { // Metric
    if (length > 100) {
      output = (length / 1000).toFixed(2) + ' ' + 'km';
    } else {
      output = length.toFixed(2) + ' ' + 'm';
    }
  }
  return output;
};

/**
 * Format area output.
 * @param {Polygon} polygon The polygon.
 * @return {string} Formatted area.
 */
var formatArea = function (polygon) {
  var area = ol.sphere.getArea(polygon); // Area in square meters
  var output;
  if (displayUnits === 'imperial') {
    var areaSqFt = area * 10.7639;
    if (areaSqFt > 43560) { // If larger than an acre
      output = (areaSqFt / 43560).toFixed(2) + ' ' + 'acres';
    } else {
      output = areaSqFt.toFixed(2) + ' ' + 'ft<sup>2</sup>';
    }
  } else { // Metric
    if (area > 10000) {
      output = (area / 1000000).toFixed(2) + ' ' + 'km<sup>2</sup>';
    } else {
      output = area.toFixed(2) + ' ' + 'm<sup>2</sup>';
    }
  }
  return output;
};

function addInteraction () {
  if (currentToolMode === 'info') { // Updated
    olMap.removeInteraction(draw); // Ensure draw interaction is removed when in info mode
    return;
  }
  var type = currentToolMode === 'area' ? 'Polygon' : 'LineString'; // Updated
  // No need for: if (type === 'info') return; as it's handled above

  draw = new ol.interaction.Draw({
    source: drawingLayerSource, // Use dedicated drawing source
    type: type,
    style: new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.2)' // Original fill
      }),
      stroke: new ol.style.Stroke({
        color: 'rgba(0, 0, 0, 0.5)', // Original stroke color
        lineDash: [10, 10],
        width: 2 // Original width
      }),
      image: new ol.style.Circle({
        radius: 5,
        stroke: new ol.style.Stroke({
          color: 'rgba(0, 0, 0, 0.7)' // Original image stroke
        }),
        fill: new ol.style.Fill({
          color: 'rgba(255, 255, 255, 0.2)' // Original image fill
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

  draw.on('drawend', function (evt) { // Added evt parameter here
    measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
    measureTooltip.setOffset([0, -7]);
    // Ensure the feature uses the layer's style, not the interaction's temporary style
    if (evt.feature) {
      // evt.feature.setStyle(undefined); // Previous attempt
      const debugRedStyle = new ol.style.Style({
          stroke: new ol.style.Stroke({ color: 'rgba(255, 0, 0, 1)', width: 4 }), // Bright solid red, width 4
          fill: new ol.style.Fill({ color: 'rgba(255, 0, 0, 0.1)' }),
          image: new ol.style.Circle({ radius: 7, fill: new ol.style.Fill({ color: 'rgba(255, 0, 0, 1)' }) })
      });
      evt.feature.setStyle(debugRedStyle);
      console.log('Applied direct RED debug style to feature in drawend.');
    }
    // unset sketch
    sketch = null;
    // unset tooltip so that a new one can be created
    measureTooltipElement = null;
    createMeasureTooltip();
    ol.Observable.unByKey(listener);

    // Console logs for debugging drawing persistence
    console.log('drawend event triggered.');
    if (evt.feature) {
      console.log('Drawn feature geometry type:', evt.feature.getGeometry().getType());
    }
    console.log('Total features on drawingLayerSource:', drawingLayerSource.getFeatures().length);

    // Ensure the drawingLayerSource (and thus layerVectorDrawings) refreshes
    drawingLayerSource.changed();
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

addInteraction(); // Initial call to set up interaction based on default currentToolMode

var geolocation = new ol.Geolocation({
  // enableHighAccuracy must be set to true to have the heading value.
  trackingOptions: {
    enableHighAccuracy: true
  },
  projection: chooseView().getProjection()
});

function el (id) {
  return document.getElementById(id);
}

// The old el('track') listener will be removed as the new control handles this.
// el('track').addEventListener('change', function () {
//   geolocation.setTracking(this.checked);
// });

// update the HTML page when the position changes.
// This assumes 'trackingControlInstance' will be the instance of our new control.
// This instance needs to be created before this part of the script runs,
// or this callback needs to be set after the control is instantiated.
geolocation.on('change', function () {
  if (window.trackingControlInstance && window.trackingControlInstance.trackingOn_) {
    const accuracy = geolocation.getAccuracy() !== undefined ? geolocation.getAccuracy().toFixed(2) : '-';
    const altitude = geolocation.getAltitude() !== undefined ? geolocation.getAltitude().toFixed(2) : '-';
    const altitudeAccuracy = geolocation.getAltitudeAccuracy() !== undefined ? geolocation.getAltitudeAccuracy().toFixed(2) : '-';
    const heading = geolocation.getHeading() !== undefined ? geolocation.getHeading().toFixed(2) : '-';
    const speed = geolocation.getSpeed() !== undefined ? geolocation.getSpeed().toFixed(2) : '-';

    let currentCoords = {lat: '-', lon: '-'};
    const position = geolocation.getPosition(); // This is in view projection
    if (position) {
      const lonLat = ol.proj.toLonLat(position); // Transform to EPSG:4326 for display
      currentCoords.lon = lonLat[0];
      currentCoords.lat = lonLat[1];

      // Center map if needsCentering_ flag is true
      if (window.trackingControlInstance.needsCentering_) {
        olMap.getView().animate({ center: position, zoom: Math.max(olMap.getView().getZoom(), 17), rotation: 0, duration: 500 });
        window.trackingControlInstance.needsCentering_ = false; // Reset flag after centering
      }
    }

    window.trackingControlInstance.updateStats(accuracy, altitude, altitudeAccuracy, heading, speed, currentCoords);
  }
  // The custom control now handles these updates.
  // el('accuracy').innerText = geolocation.getAccuracy() + ' [m]';
  // el('altitude').innerText = geolocation.getAltitude() + ' [m]';
  // el('altitudeAccuracy').innerText = geolocation.getAltitudeAccuracy() + ' [m]';
  // el('heading').innerText = geolocation.getHeading() + ' [rad]';
  // el('speed').innerText = geolocation.getSpeed() + ' [m/s]';
});

// handle geolocation error.
geolocation.on('error', function (error) {
  var info = document.getElementById('info');
  info.innerHTML = error.message;
  info.style.display = '';
  if (window.trackingControlInstance) {
    window.trackingControlInstance.updateStats('Error', 'Error', 'Error', 'Error', 'Error', {lat: 'Error', lon: 'Error'});
    // Optionally disable tracking or show error state on button
    if (window.trackingControlInstance.trackingOn_) {
        window.trackingControlInstance.handleTrackToggle_(); // Toggle to off state
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


// =============================
//  Custom Tracking Control
// =============================
// Make sure this class definition is before its instantiation
class TrackingControl extends ol.control.Control {
  /**
   * @param {Object} [opt_options] Control options.
   */
  constructor(opt_options) {
    const options = opt_options || {};

    const button = document.createElement('button');
    button.innerHTML = '🛰️'; // Satellite emoji for "off" state / enable tracking
    button.title = 'Toggle GPS Tracking';

    const element = document.createElement('div');
    element.className = 'ol-unselectable ol-control tracking-control'; // Added a custom class
    element.appendChild(button);

    // Call super constructor first
    super({
      element: element,
      target: options.target,
    });

    // Create container for stats
    this.statsElement_ = document.createElement('div');
    this.statsElement_.className = 'tracking-stats';
    // Initially hide stats or show placeholder text
    this.statsElement_.style.display = 'none';
    element.appendChild(this.statsElement_);

    // Create individual stat elements
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
    this.trackingOn_ = false; // To keep track of tracking state
    this.needsCentering_ = false; // Flag to control centering on first fix

    this.button_.addEventListener('click', this.handleTrackToggle_.bind(this), false);
  }

  handleTrackToggle_() {
    this.trackingOn_ = !this.trackingOn_;
    geolocation.setTracking(this.trackingOn_);
    if (this.trackingOn_) {
      this.button_.innerHTML = '📡';
      this.statsElement_.style.display = 'flex';
      this.needsCentering_ = true; // Set flag to center on next position update
      // Attempt to center immediately if position is already available
      const currentPosition = geolocation.getPosition();
      if (currentPosition && this.needsCentering_) {
        olMap.getView().animate({ center: currentPosition, zoom: Math.max(olMap.getView().getZoom(), 17), rotation: 0, duration: 500 });
        this.needsCentering_ = false; // Centered, so reset flag
      }
    } else {
      this.button_.innerHTML = '🛰️';
      this.statsElement_.style.display = 'none';
      this.updateStats('-', '-', '-', '-', '-', {lat: '-', lon: '-'});
      this.needsCentering_ = false; // Tracking off, no need to center
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

// Instantiate the custom control
window.trackingControlInstance = new TrackingControl();

// Add the custom control to the map
// Need to ensure olMap is defined before this line.
// Typically, map initialization code is wrapped in a DOMContentLoaded or similar event,
// or this part of the script is placed after the map div and OL map instantiation.
// For this file structure, olMap is defined much earlier.
olMap.addControl(window.trackingControlInstance);
