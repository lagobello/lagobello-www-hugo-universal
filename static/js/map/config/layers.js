// Site-specific layer factories. Each function returns a fresh ol.layer.* so
// LagoBelloMap can be instantiated more than once without sharing state.

import {
  styleLake, styleLotCameronAppraisalDistrict, stylePark, styleStreet,
  styleFloodHazard, styleDrawing, makeDynamicLotStyle
} from './styles.js';

export const MAPBOX_KEY = 'pk.eyJ1IjoibGFnb3ZpdHRvcmlvIiwiYSI6ImNqazZvYWdnZTB6bjMzcG1rcDR1bGpncm0ifQ.E_grlJASX59FUqTlksn09Q';

const PLAT_BASE = 'https://lagobello.github.io/lagobello-drawings/web/';

// ---- Basemaps ----
export function makeBasemap(kind, { visible = false } = {}) {
  switch (kind) {
    case 'osm':
      return new ol.layer.Tile({
        title: 'OpenStreetMap', type: 'base', visible, opacity: 1.0,
        source: new ol.source.OSM()
      });
    case 'mapbox-satellite':
      return new ol.layer.Tile({
        title: 'Mapbox Satellite Streets', type: 'base', visible, opacity: 1.0,
        source: new ol.source.XYZ({
          url: 'https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}?access_token=' + MAPBOX_KEY
        })
      });
    case 'google-hybrid':
      return new ol.layer.Tile({
        title: 'Google Maps Satellite', type: 'base', visible, opacity: 1.0,
        source: new ol.source.XYZ({
          url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          attributions: '© Google'
        })
      });
    default:
      throw new Error(`Unknown basemap: ${kind}`);
  }
}

// ---- Vector overlays ----
export function makeLakeLayer() {
  return new ol.layer.Vector({
    title: 'Lake layer',
    source: new ol.source.Vector({ format: new ol.format.GeoJSON(), url: '/files/lake.geojson' }),
    style: styleLake(),
    opacity: 0.4
  });
}

function makePlatLayer(title, file, getLotsData) {
  return new ol.layer.Vector({
    title,
    source: new ol.source.Vector({ format: new ol.format.GeoJSON(), url: PLAT_BASE + file }),
    style: makeDynamicLotStyle(getLotsData),
    opacity: 1
  });
}

export function makePlatLayers(getLotsData) {
  return {
    s1: makePlatLayer('Lot Layer - Plat Section 1', 'PLAT-HATCH-LOTS-S1.geojson', getLotsData),
    s2: makePlatLayer('Lot Layer - Plat Section 2', 'PLAT-HATCH-LOTS-S2.geojson', getLotsData),
    s3: makePlatLayer('Lot Layer - Plat Section 3 (future)', 'PLAT-HATCH-LOTS-S3.geojson', getLotsData)
  };
}

export function makeCameronCadLayer() {
  return new ol.layer.Vector({
    title: 'Lot layer - Cameron Appraisal District',
    source: new ol.source.Vector({
      format: new ol.format.GeoJSON(),
      url: '/files/lots_cameron_appraisal_district.geojson'
    }),
    style: styleLotCameronAppraisalDistrict(),
    visible: false,
    opacity: 0.8
  });
}

export function makeFountainLayer() {
  return new ol.layer.Vector({
    title: 'Fountain',
    source: new ol.source.Vector({ format: new ol.format.GeoJSON(), url: PLAT_BASE + 'PLAT-HATCH-FOUNTAIN.geojson' }),
    style: stylePark(),
    opacity: 0.4
  });
}

export function makeCommonAreaLayer() {
  return new ol.layer.Vector({
    title: 'Common Area - Section 3',
    source: new ol.source.Vector({ format: new ol.format.GeoJSON(), url: PLAT_BASE + 'PLAT-HATCH-COMMONAREA-S3.geojson' }),
    style: stylePark(),
    opacity: 0.4
  });
}

function makeCaminataLayer(title, file, { visible = true } = {}) {
  return new ol.layer.Vector({
    title,
    source: new ol.source.Vector({ format: new ol.format.GeoJSON(), url: PLAT_BASE + file }),
    style: stylePark(),
    visible,
    opacity: 0.8
  });
}

export function makeCaminataLayers() {
  return {
    s1: makeCaminataLayer('Caminata - Section 1', 'PLAT-HATCH-CAMINATA-S1.geojson'),
    s2: makeCaminataLayer('Caminata - Section 2', 'PLAT-HATCH-CAMINATA-S2.geojson'),
    proposed: makeCaminataLayer('Caminata (proposed)', 'PLAT-HATCH-CAMINATA-PROPOSED.geojson', { visible: false })
  };
}

function makeStreetLayer(title, file, { visible = true } = {}) {
  return new ol.layer.Vector({
    title,
    source: new ol.source.Vector({ format: new ol.format.GeoJSON(), url: PLAT_BASE + file }),
    style: styleStreet(),
    visible,
    opacity: 0.8
  });
}

export function makeStreetLayers() {
  return {
    s1: makeStreetLayer('Right of Way - Section 1', 'PLAT-HATCH-ROW-S1.geojson', { visible: false }),
    s2: makeStreetLayer('Right of Way - Section 2', 'PLAT-HATCH-ROW-S2.geojson', { visible: false }),
    s3: makeStreetLayer('Right of Way - Section 3', 'PLAT-HATCH-ROW-S3.geojson'),
    reserved: makeStreetLayer('Right of Way - Reserved', 'PLAT-HATCH-ROW-RESERVE.geojson'),
    access: makeStreetLayer('Right of Way - Access', 'PLAT-HATCH-ROW-ACCESS.geojson', { visible: false })
  };
}

export function makeFloodHazardLayer() {
  return new ol.layer.Vector({
    title: 'FEMA Flood Hazard Boundaries - 2/16/2018',
    source: new ol.source.Vector({
      format: new ol.format.GeoJSON(),
      url: '/files/lagobello_flood_hazard_boundaries.geojson'
    }),
    style: styleFloodHazard(),
    visible: false,
    opacity: 0.8
  });
}

export function makeDrawingLayer() {
  const source = new ol.source.Vector();
  const layer = new ol.layer.Vector({
    source, style: styleDrawing(), zIndex: 100
  });
  return { source, layer };
}
