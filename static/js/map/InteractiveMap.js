// Generic configurable OpenLayers map. No site-specific imports — all layers,
// styles, view, and feature-info HTML are passed in as options. Site-specific
// composition lives in subclasses (e.g. LagoBelloMap).

import { InfoControl } from './ol-ext/controls/InfoControl.js';
import { LengthControl } from './ol-ext/controls/LengthControl.js';
import { AreaControl } from './ol-ext/controls/AreaControl.js';
import { UnitToggleControl, getUnits, onUnitsChange } from './ol-ext/controls/UnitToggleControl.js';
import { TrackingControl } from './ol-ext/controls/TrackingControl.js';
import { setOnToolChange, getToolMode } from './ol-ext/controls/ToolMode.js';

import { createPopup } from './ol-ext/popup.js';
import { createHighlighter } from './ol-ext/highlight.js';
import { attachDownloadLinks } from './ol-ext/layerSwitcherDownloads.js';

import { throttle } from './util/throttle.js';
import { formatLengthMeters, formatAreaSqMeters } from './util/units.js';

export class InteractiveMap {
  constructor(options) {
    const opts = Object.assign({
      target: 'ol-map',
      layers: [],
      drawingSource: null,
      view: null,
      controls: ['attribution', 'rotate', 'fullscreen', 'mousePosition', 'zoom', 'layerSwitcher',
        'info', 'length', 'area', 'unitToggle'],
      popup: true,
      highlightOnClick: true,
      highlightStyle: null,
      drawStyle: null,
      enableDrawTools: true,
      enableTracking: false,
      sanitizeLayerUrl: null,
      getFeatureInfoHtml: null,
      onFeatureSelect: null
    }, options || {});

    this.options = opts;
    this.draw_ = null;
    this.sketch_ = null;
    this.helpTooltipElement_ = null;
    this.helpTooltip_ = null;
    this.measureTooltipElement_ = null;
    this.measureTooltip_ = null;
    this.currentSelectedFeature_ = null;

    this._buildControls();
    this._buildOverlays();

    this.map = new ol.Map({
      target: opts.target,
      controls: this.controls_,
      overlays: this.overlays_,
      layers: opts.layers,
      view: opts.view
    });

    this._wireInteractions();
  }

  _buildControls() {
    const opts = this.options;
    const controls = [];
    const set = new Set(opts.controls);

    if (set.has('attribution')) controls.push(new ol.control.Attribution({ collapsible: true }));
    if (set.has('rotate')) controls.push(new ol.control.Rotate());
    if (set.has('fullscreen')) controls.push(new ol.control.FullScreen());
    if (set.has('mousePosition')) {
      controls.push(new ol.control.MousePosition({
        coordinateFormat: (coord) => ol.coordinate.format(coord, '<span>{y}N, {x}W</span>', 4),
        projection: 'EPSG:4326',
        className: 'ol-control ol-mouse-position',
        undefinedHTML: ''
      }));
    }
    if (set.has('zoom')) controls.push(new ol.control.Zoom());

    if (set.has('layerSwitcher') && typeof ol.control.LayerSwitcher === 'function') {
      this.layerSwitcher_ = new ol.control.LayerSwitcher({ tipLabel: 'Legend' });
      controls.push(this.layerSwitcher_);
    }

    if (set.has('info')) controls.push(new InfoControl());
    if (set.has('length')) controls.push(new LengthControl());
    if (set.has('area')) controls.push(new AreaControl());
    if (set.has('unitToggle')) controls.push(new UnitToggleControl());

    this.controls_ = controls;
  }

  _buildOverlays() {
    this.overlays_ = [];
    if (this.options.popup) {
      this.popup_ = createPopup();
      this.overlays_.push(this.popup_.overlay);
    }
  }

  _wireInteractions() {
    const map = this.map;
    const opts = this.options;

    if (this.layerSwitcher_) {
      attachDownloadLinks({
        map, layerSwitcher: this.layerSwitcher_, sanitizeUrl: opts.sanitizeLayerUrl
      });
    }

    if (opts.highlightOnClick && opts.highlightStyle) {
      this.featureHighlight_ = createHighlighter(map, opts.highlightStyle);
      const debounced = throttle(console.debug, 2000);
      map.on('pointermove', (evt) => {
        if (evt.dragging) { debounced('dragging'); return; }
        const feature = this._featureAtPixel(evt.pixel);
        if (!feature) return;
        this.featureHighlight_(feature);
      });
    }

    map.on('click', (evt) => {
      if (getToolMode() !== 'info') return;
      const feature = this._featureAtPixel(evt.pixel);
      this.showMapCard(feature, evt);
    });

    map.on('moveend', () => this._handleZoomChange());

    if (opts.enableDrawTools) {
      setOnToolChange((mode) => this._setActiveToolInteraction(mode));
      this._setActiveToolInteraction('info');
      onUnitsChange(() => {
        if (this.sketch_) this.sketch_.getGeometry().changed();
      });
    }

    if (opts.enableTracking) this._setupTracking();

    const mapCardClose = document.getElementById('map-card-close');
    if (mapCardClose) {
      mapCardClose.addEventListener('click', () => {
        const card = document.getElementById('map-card');
        if (card) card.style.display = 'none';
        if (this.featureHighlight_) this.featureHighlight_(null);
        this.currentSelectedFeature_ = null;
      });
    }
  }

  _handleZoomChange() {
    // Subclasses may override to hide popups outside zoom range, etc.
  }

  _setupTracking() {
    const map = this.map;
    const geolocation = new ol.Geolocation({
      trackingOptions: { enableHighAccuracy: true },
      projection: map.getView().getProjection()
    });
    this.geolocation_ = geolocation;

    const accuracyFeature = new ol.Feature();
    const positionFeature = new ol.Feature();
    positionFeature.setStyle(new ol.style.Style({
      image: new ol.style.Circle({
        radius: 6,
        fill: new ol.style.Fill({ color: '#3399CC' }),
        stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
      })
    }));

    geolocation.on('change:accuracyGeometry', () => accuracyFeature.setGeometry(geolocation.getAccuracyGeometry()));
    geolocation.on('change:position', () => {
      const c = geolocation.getPosition();
      positionFeature.setGeometry(c ? new ol.geom.Point(c) : null);
    });

    new ol.layer.Vector({
      map,
      source: new ol.source.Vector({ features: [accuracyFeature, positionFeature] })
    });

    const trackingControl = new TrackingControl({ map, geolocation });
    map.addControl(trackingControl);
    this.trackingControl_ = trackingControl;

    geolocation.on('change', () => {
      if (!trackingControl.trackingOn_) return;
      const fmt = (v) => v !== undefined ? v.toFixed(2) : '-';
      let coords = { lat: '-', lon: '-' };
      const position = geolocation.getPosition();
      if (position) {
        const lonLat = ol.proj.toLonLat(position);
        coords = { lon: lonLat[0], lat: lonLat[1] };
        if (trackingControl.needsCentering_) {
          map.getView().animate({ center: position, zoom: Math.max(map.getView().getZoom(), 17), rotation: 0, duration: 500 });
          trackingControl.needsCentering_ = false;
        }
      }
      trackingControl.updateStats(
        fmt(geolocation.getAccuracy()),
        fmt(geolocation.getAltitude()),
        fmt(geolocation.getAltitudeAccuracy()),
        fmt(geolocation.getHeading()),
        fmt(geolocation.getSpeed()),
        coords
      );
    });

    geolocation.on('error', (error) => {
      const info = document.getElementById('info');
      if (info) { info.innerHTML = error.message; info.style.display = ''; }
      trackingControl.updateStats('Error', 'Error', 'Error', 'Error', 'Error', { lat: 'Error', lon: 'Error' });
      if (trackingControl.trackingOn_) trackingControl.handleTrackToggle_();
    });
  }

  _featureAtPixel(pixel) {
    return this.map.forEachFeatureAtPixel(pixel, (feature) => feature);
  }

  panToFeature(feature) {
    if (!feature) return;
    const center = ol.extent.getCenter(feature.getGeometry().getExtent());
    this.map.getView().animate({ center, zoom: 19, duration: 500 });
    const evt = { pixel: this.map.getPixelFromCoordinate(center), coordinate: center };
    this.showMapCard(feature, evt);
  }

  showMapCard(feature, evt) {
    const mapCard = document.getElementById('map-card');
    const mapCardContent = document.getElementById('map-card-content');

    if (!feature) {
      if (mapCard) mapCard.style.display = 'none';
      if (this.featureHighlight_) this.featureHighlight_(null);
      this.currentSelectedFeature_ = null;
      return;
    }
    if (this.currentSelectedFeature_ === feature && mapCard && mapCard.style.display !== 'none') {
      mapCard.style.display = 'none';
      if (this.featureHighlight_) this.featureHighlight_(null);
      this.currentSelectedFeature_ = null;
      return;
    }

    this.currentSelectedFeature_ = feature;

    if (mapCard && mapCardContent && typeof this.options.getFeatureInfoHtml === 'function') {
      mapCardContent.innerHTML = this.options.getFeatureInfoHtml(feature, evt || { pixel: null, coordinate: null }, this);
      mapCard.style.display = 'block';
    }

    if (this.featureHighlight_) this.featureHighlight_(feature);
    if (typeof this.options.onFeatureSelect === 'function') this.options.onFeatureSelect(feature, this);
  }

  friendlyLayerName(feature) {
    if (!feature || !this.map) return 'Unknown Layer';
    let found = null;
    const visit = (layer) => {
      if (found) return;
      if (layer instanceof ol.layer.Group) { layer.getLayers().forEach(visit); return; }
      if (layer instanceof ol.layer.Vector) {
        const source = layer.getSource();
        if (source && typeof source.getFeatures === 'function' && source.getFeatures().includes(feature)) {
          found = layer;
        }
      }
    };
    this.map.getLayers().forEach(visit);
    if (found) return found.get('title') || 'Unnamed Layer';
    return feature.get('Layer') || 'Unknown Layer';
  }

  // ---------- Draw / measurement interactions ----------

  _setActiveToolInteraction(toolMode) {
    if (!this.options.enableDrawTools) return;
    if (this.draw_) this.map.removeInteraction(this.draw_);
    if (toolMode === 'info' || !this.options.drawingSource) {
      this.draw_ = null;
      return;
    }
    this._addDrawInteraction(toolMode);
  }

  _addDrawInteraction(toolMode) {
    const type = toolMode === 'area' ? 'Polygon' : 'LineString';
    const draw = new ol.interaction.Draw({
      source: this.options.drawingSource,
      type,
      style: this.options.drawStyle || undefined
    });
    this.map.addInteraction(draw);
    this.draw_ = draw;

    this._createMeasureTooltip();
    this._createHelpTooltip();

    let listener;
    draw.on('drawstart', (evt) => {
      this.sketch_ = evt.feature;
      let tooltipCoord = evt.coordinate;
      listener = this.sketch_.getGeometry().on('change', (e) => {
        const geom = e.target;
        let output;
        if (geom instanceof ol.geom.Polygon) {
          output = formatAreaSqMeters(ol.sphere.getArea(geom), getUnits());
          tooltipCoord = geom.getInteriorPoint().getCoordinates();
        } else if (geom instanceof ol.geom.LineString) {
          output = formatLengthMeters(ol.sphere.getLength(geom), getUnits());
          tooltipCoord = geom.getLastCoordinate();
        }
        this.measureTooltipElement_.innerHTML = output;
        this.measureTooltip_.setPosition(tooltipCoord);
      });
    });

    draw.on('drawend', () => {
      this.measureTooltipElement_.className = 'ol-tooltip ol-tooltip-static';
      this.measureTooltip_.setOffset([0, -7]);
      this.sketch_ = null;
      this.measureTooltipElement_ = null;
      this._createMeasureTooltip();
      ol.Observable.unByKey(listener);
    });

    if (!this.pointerMoveBound_) {
      this.pointerMoveBound_ = true;
      this.map.on('pointermove', (evt) => {
        if (getToolMode() === 'info' || !this.sketch_) {
          if (this.helpTooltipElement_ && !this.helpTooltipElement_.classList.contains('hidden')) {
            this.helpTooltipElement_.classList.add('hidden');
          }
          return;
        }
        if (evt.dragging) return;
        let helpMsg = 'Click to start drawing';
        const geom = this.sketch_.getGeometry();
        if (geom instanceof ol.geom.Polygon) helpMsg = 'Click to continue drawing the polygon';
        else if (geom instanceof ol.geom.LineString) helpMsg = 'Click to continue drawing the line';
        if (this.helpTooltipElement_) {
          this.helpTooltipElement_.innerHTML = helpMsg;
          this.helpTooltip_.setPosition(evt.coordinate);
          this.helpTooltipElement_.classList.remove('hidden');
        }
      });

      this.map.getViewport().addEventListener('mouseout', () => {
        if (getToolMode() === 'info') return;
        if (this.helpTooltipElement_) this.helpTooltipElement_.classList.add('hidden');
      });
    }
  }

  _createHelpTooltip() {
    if (this.helpTooltipElement_) this.helpTooltipElement_.parentNode.removeChild(this.helpTooltipElement_);
    this.helpTooltipElement_ = document.createElement('div');
    this.helpTooltipElement_.className = 'ol-tooltip hidden';
    this.helpTooltip_ = new ol.Overlay({
      element: this.helpTooltipElement_,
      offset: [15, 0],
      positioning: 'center-left'
    });
    this.map.addOverlay(this.helpTooltip_);
  }

  _createMeasureTooltip() {
    if (this.measureTooltipElement_) this.measureTooltipElement_.parentNode.removeChild(this.measureTooltipElement_);
    this.measureTooltipElement_ = document.createElement('div');
    this.measureTooltipElement_.className = 'ol-tooltip ol-tooltip-measure';
    this.measureTooltip_ = new ol.Overlay({
      element: this.measureTooltipElement_,
      offset: [0, -15],
      positioning: 'bottom-center'
    });
    this.map.addOverlay(this.measureTooltip_);
  }
}
