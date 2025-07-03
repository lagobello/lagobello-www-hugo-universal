/* eslint-env browser,jquery */
/* globals ol turf */
/* eslint semi: 2 */

// Global application state variables
var currentToolMode = 'info'; // Default tool: 'info', 'length', 'area'
let displayUnits = 'imperial'; // Default unit system: 'imperial' or 'metric' (changed to let)

// Global draw variable for interactions
var draw;

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
  opacity: 0.4
});

var layerVectorLotsPlat = new ol.layer.Vector({
  title: 'Lot layer - plat',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-LOTS.geojson'
  }),
  style: styleFunctionPlatLots,
  visible: false,
  opacity: 0.4
});

var layerVectorLotsPlat = new ol.layer.Vector({
  title: 'Lot layer - Section 3 (future)',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-LOTS-S3.geojson'
  }),
  style: styleFunctionPlatLots,
  visible: false,
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
  visible: true,
  opacity: 0.4
});

var layerVectorCommonArea = new ol.layer.Vector({
  title: 'Common Area - Section 3',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-COMMONAREA-S3.geojson'
  }),
  style: stylePark,
  visible: false,
  opacity: 0.4
});

var layerVectorCaminata = new ol.layer.Vector({
  title: 'Caminata layer',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-CAMINATA.geojson'
  }),
  style: stylePark,
  opacity: 0.8
});

var layerVectorCaminataProposed = new ol.layer.Vector({
  title: 'Caminata layer proposed',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-CAMINATA-PROPOSED.geojson'
  }),
  style: stylePark,
  opacity: 0.8
});


var layerVectorStreet = new ol.layer.Vector({
  title: 'Street layer',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-STREET.geojson'
  }),
  style: styleStreet,
  opacity: 0.4
});

var layerVectorStreetS3 = new ol.layer.Vector({
  title: 'Street layer - Section 3',
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-STREET-S3.geojson'
  }),
  style: styleStreet,
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
  layerVectorCaminata,
  layerVectorCaminataProposed,
  layerVectorLake,
  layerVectorLots,
  layerVectorLotsPlat,
  layerVectorLotsCameronAppraisalDistrict,
  layerVectorPark,
  layerVectorCommonArea,
  layerVectorStreet,
  layerVectorStreetS3
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

// Function to add download links to GeoJSON layers in the LayerSwitcher
function addDownloadLinksToLayerSwitcher() {
  if (!layerSwitcher || !layerSwitcher.panel) {
    // console.warn('LayerSwitcher panel not found or layerSwitcher not ready.');
    return;
  }

  const panelUl = layerSwitcher.panel.querySelector('ul');
  if (!panelUl) {
    // console.warn('LayerSwitcher panel UL element not found.');
    return;
  }

  // Iterate over layer list items. LayerSwitcher creates LIs with a label and input.
  // We need to find the corresponding OL layer to check its source.
  const listItems = panelUl.getElementsByTagName('li');

  for (let i = 0; i < listItems.length; i++) {
    const li = listItems[i];

    // Prevent adding multiple download links
    if (li.querySelector('a.download-geojson-link')) {
      continue;
    }

    const label = li.querySelector('label');
    if (!label) continue;

    const layerTitle = label.textContent.trim();
    if (!layerTitle) continue;

    let targetLayer = null;

    // Helper function to recursively find layer by title
    function findLayerByTitle(layerCollection, title) {
        let foundLayer = null;
        layerCollection.forEach(function(layer) {
            if (foundLayer) return; // Already found
            if (layer.get('title') === title && !(layer instanceof ol.layer.Group)) {
                foundLayer = layer;
            } else if (layer instanceof ol.layer.Group) {
                // Check if this group itself is the target (if LayerSwitcher allows group downloads)
                // For now, only targeting non-group layers. Recurse if needed.
                // foundLayer = findLayerByTitle(layer.getLayers(), title); // Simple recursion
                // More robust: LayerSwitcher.forEachRecursive might be better if available globally
                // or we can use its logic. For now, this simple recursion should work for a few levels.
                 layer.getLayers().forEach(function(subLayer){ // Basic one-level recursion for groups
                    if(subLayer.get('title') === title && !(subLayer instanceof ol.layer.Group)){
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
      if (source instanceof ol.source.Vector && typeof source.getUrl === 'function' && source.getUrl()) {
        const url = source.getUrl();
        const format = source.getFormat();
        const isGeoJSONFormat = format && typeof format.getType === 'function' && format.getType().toLowerCase() === 'geojson';

        if (isGeoJSONFormat || (typeof url === 'string' && url.toLowerCase().endsWith('.geojson'))) {
          const downloadLink = document.createElement('a');
          downloadLink.href = url;
          downloadLink.innerHTML = '📥'; // Updated Download icon (Inbox Tray)
          downloadLink.title = `Download ${layerTitle}`;
          downloadLink.className = 'download-geojson-link';

          let filename = layerTitle.replace(/[^\w\s.-]/gi, '_').replace(/\s+/g, '_').toLowerCase();
          if (!filename) filename = "layer"; // Fallback filename
          if (!filename.endsWith('.geojson')) filename += ".geojson"; // Ensure .geojson extension
          downloadLink.download = filename; // This attribute is key for download behavior

          // Append after the label, within the li but ensure it doesn't break flex layouts if any
          li.appendChild(downloadLink); // Simpler append, styling will handle positioning
        }
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

  // Old style geojson with 'name' and 'status'
  var areaString = '';
  if (area) {
    if (displayUnits === 'imperial') {
      var areaSqFt = area * 10.7639;
      if (areaSqFt > 43560) { // If larger than an acre
        areaString = `<td>Area</td><td><code>${(areaSqFt / 43560).toFixed(2)} acres</code></td>`;
      } else {
        areaString = `<td>Area</td><td><code>${areaSqFt.toFixed(2)} ft<sup>2</sup></code></td>`;
      }
    } else { // Metric
      if (area > 10000) {
        areaString = `<td>Area</td><td><code>${(area / 1000000).toFixed(2)} km<sup>2</sup></code></td>`;
      } else {
        areaString = `<td>Area</td><td><code>${area.toFixed(2)} m<sup>2</sup></code></td>`;
      }
    }
  } else {
    areaString = '<td>Area</td><td><code>N/A</code></td>';
  }

  if (feature.get('name') !== undefined) {
    tempString =
 `<table style="width:100%">
  <tr>
    <td>Name</td>
    <td><code>${feature.get('name')}</code></td>
  </tr>
  <tr>
    <td>Status</td>
    <td><code>${feature.get('status')}</code></td>
  </tr>
  <tr>${areaString}</tr>
  </table>`;
  }
  // New style geojson with 'EntityHandle'
  else if (feature.get('EntityHandle') !== undefined) {
    // Assuming 'Area registered' might be a property in the future, if not, it shows N/A
    var registeredAreaFt2 = feature.get('AREA_REGISTERED_FT2') || '---'; // Example property name
    var registeredAreaString = `<td>Area registered</td><td><code>${registeredAreaFt2} ${displayUnits === 'imperial' ? "ft<sup>2</sup>" : ""}</code></td>`;
    if (displayUnits === 'metric' && registeredAreaFt2 !== '---') {
        // Convert if necessary, or state units clearly if mixed display is intended for registered values
        // For now, assumes registered area is always in ft2 and we just display it.
        // A more robust solution would involve knowing the unit of registeredAreaFt2 or having it in both.
         registeredAreaString = `<td>Area registered (ft<sup>2</sup>)</td><td><code>${registeredAreaFt2}</code></td>`;
    }


    tempString =
    `<table style="width:100%">
  <tr>
    <td>Name</td>
    <td><code>---</code></td> <!-- Placeholder for Name -->
  </tr>
  <tr>
    <td>Parcel ID</td>
    <td><code>---</code></td> <!-- Placeholder for Parcel ID -->
  </tr>
  <tr>
    <td>Entity ID</td>
    <td><code>${feature.get('EntityHandle')}</code></td>
  </tr>
  <tr>${registeredAreaString}</tr>
  <tr>${areaString.replace('Area', 'Area calculated')}</tr>
</table>`;
  }
  // Fallback for other feature types or if no specific properties are found
  else {
    tempString =
    `<table style="width:100%">
  <tr>
    <td>Layer</td>
    <td><code>${(feature.get('Layer') || 'Unknown')}</code></td>
  </tr>
   <tr>
    <td>EntityHandle</td>
    <td><code>${(feature.get('EntityHandle') || 'N/A')}</code></td>
  </tr>
  <tr>${areaString}</tr>
</table>`;
  }
  return tempString;
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
