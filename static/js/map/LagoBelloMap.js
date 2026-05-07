// Lago Bello composer: builds the layer set, view, and popup HTML renderer for
// the real-estate use case, then constructs a generic InteractiveMap with them.

import { InteractiveMap } from './InteractiveMap.js';

import {
  MAPBOX_KEY, makeBasemap, makeLakeLayer, makePlatLayers, makeCameronCadLayer,
  makeFountainLayer, makeCommonAreaLayer, makeCaminataLayers, makeStreetLayers,
  makeFloodHazardLayer, makeDrawingLayer
} from './config/layers.js';
import { loadDroneLayers } from './config/drone-layers.js';
import { chooseDefaultView, makeLotView } from './config/views.js';
import { styleHighlight, styleDraw, styleLotSingleDefault, styleLotSingleHighlight } from './config/styles.js';

import { getUnits } from './ol-ext/controls/UnitToggleControl.js';
import { featureAreaSqMeters, featureCentroidLonLat } from './ol-ext/measure.js';

import { loadLots, getLots } from './data/lots.js';
import { findLotForFeature } from './data/spatialMatch.js';

import { formatAreaSqMeters, formatAreaImperialBoth } from './util/units.js';

const MIN_POPUP_ZOOM = 17;
const MAX_POPUP_ZOOM = 20;

function sanitizeMapboxUrl(url) {
  if (!url || !url.includes(MAPBOX_KEY)) return url;
  const u = new URL(url);
  u.searchParams.set('access_token', 'YOUR_MAPBOX_API_KEY');
  return u.toString();
}

export class LagoBelloMap extends InteractiveMap {
  constructor(options) {
    const opts = Object.assign({
      target: 'ol-map',
      basemaps: ['mapbox-satellite', 'google-hybrid', 'osm'],
      defaultBasemap: 'google-hybrid',
      layerGroups: ['plats', 'lake', 'streets', 'caminata', 'fountain', 'common-areas', 'cameron-cad', 'flood', 'drone'],
      controls: ['attribution', 'rotate', 'fullscreen', 'mousePosition', 'zoom', 'layerSwitcher',
        'info', 'length', 'area', 'unitToggle', 'tracking'],
      view: { mode: 'default' },
      lotsUrl: '/data/lots.json',
      onTableHighlight: null
    }, options || {});

    const layers = {};

    // Basemaps
    layers.basemapsGroup = new ol.layer.Group({
      title: 'Base maps',
      layers: opts.basemaps.map((kind) =>
        makeBasemap(kind, { visible: kind === opts.defaultBasemap })
      )
    });

    // Drone group (populated async)
    layers.droneGroup = new ol.layer.Group({ title: 'Drone imagery', layers: [] });

    // Vector overlays
    const overlayLayers = [];
    const enabled = new Set(opts.layerGroups);

    if (enabled.has('caminata')) {
      const c = makeCaminataLayers();
      layers.caminataS1 = c.s1; layers.caminataS2 = c.s2; layers.caminataProposed = c.proposed;
      overlayLayers.push(c.s1, c.s2, c.proposed);
    }
    if (enabled.has('lake')) {
      layers.lake = makeLakeLayer();
      overlayLayers.push(layers.lake);
    }
    if (enabled.has('plats')) {
      const p = makePlatLayers(getLots);
      layers.platS1 = p.s1; layers.platS2 = p.s2; layers.platS3 = p.s3;
      overlayLayers.push(p.s1, p.s2, p.s3);
    }
    if (enabled.has('cameron-cad')) {
      layers.cameronCad = makeCameronCadLayer();
      overlayLayers.push(layers.cameronCad);
    }
    if (enabled.has('fountain')) {
      layers.fountain = makeFountainLayer();
      overlayLayers.push(layers.fountain);
    }
    if (enabled.has('common-areas')) {
      layers.commonArea = makeCommonAreaLayer();
      overlayLayers.push(layers.commonArea);
    }
    if (enabled.has('streets')) {
      const s = makeStreetLayers();
      layers.streetS1 = s.s1; layers.streetS2 = s.s2; layers.streetS3 = s.s3;
      layers.streetReserved = s.reserved; layers.streetAccess = s.access;
      overlayLayers.push(s.s1, s.s2, s.s3, s.reserved, s.access);
    }
    if (enabled.has('flood')) {
      layers.floodHazard = makeFloodHazardLayer();
      overlayLayers.push(layers.floodHazard);
    }
    layers.overlaysGroup = new ol.layer.Group({ title: 'Overlays', layers: overlayLayers, zIndex: 10 });

    // Drawing layer
    const draw = makeDrawingLayer();
    layers.drawingSource = draw.source;
    layers.drawingLayer = draw.layer;

    const mapLayers = [layers.basemapsGroup, layers.droneGroup, layers.overlaysGroup, layers.drawingLayer];

    // View
    const v = opts.view || { mode: 'default' };
    const view = (v.mode === 'lot' && Array.isArray(v.lotPoint))
      ? makeLotView(v.lotPoint, v.zoom || 17)
      : chooseDefaultView();

    super({
      target: opts.target,
      controls: opts.controls,
      view,
      layers: mapLayers,
      drawingSource: layers.drawingSource,
      highlightStyle: styleHighlight(),
      drawStyle: styleDraw(),
      enableDrawTools: true,
      enableTracking: opts.controls.includes('tracking'),
      sanitizeLayerUrl: sanitizeMapboxUrl,
      getFeatureInfoHtml: (feature, evt, mapInstance) => mapInstance._renderFeatureInfoHtml(feature, evt),
      onFeatureSelect: (feature, mapInstance) => mapInstance._notifyTableHighlight(feature)
    });

    this.lagoOptions = opts;
    this.layers = layers;

    if (opts.layerGroups.includes('drone')) {
      loadDroneLayers(layers.droneGroup, this.layerSwitcher_);
    }
    loadLots(opts.lotsUrl).then(() => {
      ['platS1', 'platS2', 'platS3'].forEach((k) => {
        if (layers[k]) layers[k].changed();
      });
    });
  }

  _handleZoomChange() {
    if (!this.popup_) return;
    const z = this.map.getView().getZoom();
    if (this.popup_.overlay.getPosition() && (z < MIN_POPUP_ZOOM || z >= MAX_POPUP_ZOOM)) {
      this.popup_.close();
      if (this.featureHighlight_) this.featureHighlight_(null);
    }
  }

  _notifyTableHighlight(feature) {
    if (typeof this.lagoOptions.onTableHighlight !== 'function') return;
    const matched = this._matchedLotFor(feature);
    this.lagoOptions.onTableHighlight(matched && matched.Name ? matched.Name : null);
  }

  _matchedLotFor(feature) {
    if (!feature) return null;
    const friendly = this.friendlyLayerName(feature);
    const isLot = friendly && (friendly.toLowerCase().includes('lot') || friendly.toLowerCase().includes('plat'));
    if (!isLot) return null;
    const lots = getLots();
    if (!lots) return null;
    return findLotForFeature(feature, lots);
  }

  // Real-estate-specific popup HTML.
  _renderFeatureInfoHtml(feature, evt) {
    const geoJsonFeatureIdentifier = feature.get('EntityHandle') || feature.get('name');
    const friendlyLayerName = this.friendlyLayerName(feature);
    const matchedLot = this._matchedLotFor(feature);

    const parcelLegalDesc = (matchedLot && matchedLot.Name) ? matchedLot.Name : (geoJsonFeatureIdentifier || 'N/A');
    const status = matchedLot && matchedLot['Lot Status'] ? matchedLot['Lot Status'] : (feature.get('status') || 'N/A');
    const listPriceVal = matchedLot && matchedLot['List Price'] ? parseFloat(matchedLot['List Price']) : null;
    const listPrice = listPriceVal ? `$${listPriceVal.toLocaleString()}` : 'N/A';

    let saleActive = window.saleConfig && window.saleConfig.enable;
    if (saleActive && window.saleConfig.location_filter) {
      if (!matchedLot || matchedLot['Close-to'] !== window.saleConfig.location_filter) saleActive = false;
    }
    let priceDisplay = listPrice;
    if (saleActive && listPriceVal) {
      const salePriceVal = listPriceVal * (1 - window.saleConfig.percentage);
      const salePrice = `$${salePriceVal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      priceDisplay = `<span style="color: red; font-weight: bold;">${salePrice}</span> <span style="text-decoration: line-through; font-size: 0.9em;">${listPrice}</span>`;
    }

    const sqFootage = matchedLot && matchedLot['Size [sqft]'] ? `${parseFloat(matchedLot['Size [sqft]']).toLocaleString()} sqft` : 'N/A';
    const listingAgent = matchedLot && matchedLot['Listing Agent'] ? matchedLot['Listing Agent'] : 'N/A';
    const listingAgentPhone = matchedLot && matchedLot['Listing Agent Phone Number'] ? String(matchedLot['Listing Agent Phone Number']) : 'N/A';
    const listingURL = matchedLot && matchedLot['Listing Link'] ? matchedLot['Listing Link'] : 'N/A';

    let callNowButton = '';
    if (listingAgentPhone !== 'N/A' && listingAgentPhone) {
      const telLink = listingAgentPhone.replace(/\D/g, '');
      callNowButton = `<a href="tel:${telLink}" class="call-now-button">Call Now</a>`;
    }

    let listingLinkHtml = 'N/A';
    if (listingURL !== 'N/A' && listingURL) {
      const m = listingURL.match(/https?:\/\/[^\s]+/i);
      if (m && m[0]) listingLinkHtml = `<a href="${m[0]}" target="_blank" rel="noopener noreferrer">View Listing</a>`;
      else listingLinkHtml = listingURL;
    }

    let titleHtml = parcelLegalDesc;
    if (matchedLot && matchedLot.Name) {
      const slug = matchedLot.Name.replace(/ /g, '-').toLowerCase();
      titleHtml = `<a href="/lots/${slug}/" style="color: inherit; text-decoration: underline;">${parcelLegalDesc}</a>`;
    }

    let topLevelHtml = '';
    if (matchedLot) {
      const topLevelKeys = ['Name', 'Lot Status', 'List Price', 'Size [sqft]', 'Listing Agent', 'Listing Agent Phone Number', 'Listing Link', 'Location'];
      let extraRows = '';
      for (const key in matchedLot) {
        if (Object.prototype.hasOwnProperty.call(matchedLot, key) && !topLevelKeys.includes(key)) {
          const v = matchedLot[key] != null ? matchedLot[key] : 'N/A';
          extraRows += `<tr><td>${key}</td><td><code>${v}</code></td></tr>`;
        }
      }
      topLevelHtml = `
        <div class="popup-section">
          <div class="popup-section-title main-title">${titleHtml}</div>
          <table style="width:100%">
            <tr><td>Status</td><td><code>${status}</code></td></tr>
            <tr><td>Price</td><td><code>${priceDisplay}</code></td></tr>
            <tr><td>Size</td><td><code>${sqFootage}</code></td></tr>
            <tr><td>Listing Agent</td><td><code>${listingAgent}</code></td></tr>
            <tr><td>Agent Phone</td><td><code>${listingAgentPhone}</code> ${callNowButton}</td></tr>
            <tr><td>Listing URL</td><td>${listingLinkHtml}</td></tr>
            ${extraRows}
          </table>
        </div>
      `;
    }

    const area = featureAreaSqMeters(feature);
    const units = getUnits();
    let calcContent = '<table style="width:100%">';
    if (units === 'imperial') {
      if (area) {
        const both = formatAreaImperialBoth(area);
        calcContent += `<tr><td>Area (sqft)</td><td><code>${both.sqft}</code></td></tr>`;
        calcContent += `<tr><td>Area (acres)</td><td><code>${both.acres}</code></td></tr>`;
      }
    } else if (area) {
      calcContent += `<tr><td>Area (calculated)</td><td><code>${formatAreaSqMeters(area, units)}</code></td></tr>`;
    }

    let centroidStr = 'N/A';
    try {
      const c = featureCentroidLonLat(feature);
      if (c) centroidStr = `${c[1].toFixed(5)}, ${c[0].toFixed(5)}`;
    } catch (e) { centroidStr = 'Error'; }
    calcContent += `<tr><td>Centroid (Lat, Lon WGS84)</td><td><code>${centroidStr}</code></td></tr>`;

    if (evt && evt.coordinate) {
      const ll = ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
      calcContent += `<tr><td>Clicked (Lat, Lon WGS84)</td><td><code>${ll[1].toFixed(5)}, ${ll[0].toFixed(5)}</code></td></tr>`;
    }
    calcContent += '</table>';

    const props = feature.getProperties();
    let metaContent = '<table style="width:100%">';
    let hasProps = false;
    for (const key in props) {
      if (key !== 'geometry' && Object.prototype.hasOwnProperty.call(props, key)) {
        metaContent += `<tr><td>${key}</td><td><code>${props[key]}</code></td></tr>`;
        hasProps = true;
      }
    }
    if (!hasProps) metaContent += '<tr><td colspan="2">No GeoJSON properties found.</td></tr>';
    metaContent += '</table>';

    let sectionsHtml = `
      <details class="popup-section">
        <summary>Calculated Data</summary>
        ${calcContent}
      </details>`;
    if (hasProps) {
      sectionsHtml += `
        <details class="popup-section">
          <summary>GeoJSON Metadata</summary>
          ${metaContent}
        </details>`;
    }

    if (matchedLot) return topLevelHtml + sectionsHtml;

    let titleForUnmatched = 'Feature Information';
    if (friendlyLayerName && friendlyLayerName !== 'Unknown Layer' && friendlyLayerName !== 'Unnamed Layer') {
      titleForUnmatched = friendlyLayerName;
    } else if (geoJsonFeatureIdentifier && geoJsonFeatureIdentifier !== 'N/A') {
      titleForUnmatched = geoJsonFeatureIdentifier;
    }
    let header = `<div class="popup-section"><div class="popup-section-title main-title">${titleForUnmatched}</div>`;
    if ((titleForUnmatched === geoJsonFeatureIdentifier && friendlyLayerName && friendlyLayerName !== 'Unknown Layer' && friendlyLayerName !== 'Unnamed Layer' && friendlyLayerName !== titleForUnmatched) ||
        (titleForUnmatched === 'Feature Information' && friendlyLayerName && friendlyLayerName !== 'Unknown Layer' && friendlyLayerName !== 'Unnamed Layer')) {
      header += `<table style="width:100%"><tr><td>Layer</td><td><code>${friendlyLayerName}</code></td></tr></table>`;
    }
    header += '</div>';
    return header + sectionsHtml;
  }
}

// SingleLotMap is also Lago-Bello-specific (hardcoded plat URLs); kept here.
export class SingleLotMap {
  constructor({ target = 'lot-map', lotPointLonLat } = {}) {
    if (!Array.isArray(lotPointLonLat)) return;
    const lotPointProj = ol.proj.fromLonLat(lotPointLonLat);

    const baseLayer = new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        attributions: '© Google'
      }),
      opacity: 1.0
    });

    const lake = new ol.layer.Vector({
      source: new ol.source.Vector({ format: new ol.format.GeoJSON(), url: '/files/lake.geojson' }),
      style: new ol.style.Style({ fill: new ol.style.Fill({ color: '#92c5eb' }) }),
      opacity: 0.6
    });

    const makeLotLayer = (url) => new ol.layer.Vector({
      source: new ol.source.Vector({ format: new ol.format.GeoJSON(), url }),
      style: (feature) => {
        const geom = feature.getGeometry();
        return geom && typeof geom.intersectsCoordinate === 'function' && geom.intersectsCoordinate(lotPointProj)
          ? styleLotSingleHighlight()
          : styleLotSingleDefault();
      },
      opacity: 0.8
    });

    const PLAT_BASE = 'https://lagobello.github.io/lagobello-drawings/web/';
    const layerS1 = makeLotLayer(PLAT_BASE + 'PLAT-HATCH-LOTS-S1.geojson');
    const layerS2 = makeLotLayer(PLAT_BASE + 'PLAT-HATCH-LOTS-S2.geojson');
    const layerS3 = makeLotLayer(PLAT_BASE + 'PLAT-HATCH-LOTS-S3.geojson');

    const street = (url) => new ol.layer.Vector({
      source: new ol.source.Vector({ format: new ol.format.GeoJSON(), url }),
      style: new ol.style.Style({
        fill: new ol.style.Fill({ color: '#6F6E63' }),
        stroke: new ol.style.Stroke({ color: '#fade84', width: 2 })
      }),
      opacity: 0.8
    });

    const map = new ol.Map({
      target,
      layers: [
        baseLayer, lake,
        street(PLAT_BASE + 'PLAT-HATCH-ROW-S1.geojson'),
        street(PLAT_BASE + 'PLAT-HATCH-ROW-S2.geojson'),
        street(PLAT_BASE + 'PLAT-HATCH-ROW-S3.geojson'),
        layerS1, layerS2, layerS3
      ],
      view: new ol.View({ center: lotPointProj, zoom: 17, maxZoom: 22 })
    });
    this.map = map;

    let zoomed = false;
    const fitToHighlight = (source) => {
      if (zoomed) return false;
      for (const feature of source.getFeatures()) {
        const geom = feature.getGeometry();
        if (geom && typeof geom.intersectsCoordinate === 'function' && geom.intersectsCoordinate(lotPointProj)) {
          map.getView().fit(geom.getExtent(), { padding: [100, 100, 100, 100], maxZoom: 20, duration: 1000 });
          zoomed = true;
          return true;
        }
      }
      return false;
    };
    const check = () => {
      fitToHighlight(layerS1.getSource());
      fitToHighlight(layerS2.getSource());
      fitToHighlight(layerS3.getSource());
    };
    layerS1.getSource().on('change', check);
    layerS2.getSource().on('change', check);
    layerS3.getSource().on('change', check);
  }
}
