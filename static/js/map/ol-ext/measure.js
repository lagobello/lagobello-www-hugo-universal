// Turf-backed feature area in square meters (assumes feature is in EPSG:3857).

export function featureAreaSqMeters(feature) {
  const format = new ol.format.GeoJSON();
  const turfFeature = format.writeFeatureObject(feature, { featureProjection: 'EPSG:3857' });
  return turf.area(turfFeature);
}

export function featureCentroidLonLat(feature) {
  const format = new ol.format.GeoJSON();
  const cloned = feature.clone();
  const turfGeom = JSON.parse(format.writeGeometry(cloned.getGeometry()));
  const c = turf.centroid(turfGeom);
  if (!c || !c.geometry || !c.geometry.coordinates) return null;
  return ol.proj.transform(c.geometry.coordinates, 'EPSG:3857', 'EPSG:4326');
}
