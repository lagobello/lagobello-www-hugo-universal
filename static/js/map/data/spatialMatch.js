// Spatial match between an OL feature (in EPSG:3857) and a Lago Bello lot record
// (with a "Location" string of "lat, lon" in EPSG:4326).

export function lotPointToProjected(lotRecord) {
  if (!lotRecord || !lotRecord.Location || typeof lotRecord.Location !== 'string') return null;
  const parts = lotRecord.Location.split(',');
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0].trim());
  const lon = parseFloat(parts[1].trim());
  if (isNaN(lat) || isNaN(lon)) return null;
  try {
    return ol.proj.transform([lon, lat], 'EPSG:4326', 'EPSG:3857');
  } catch (e) {
    return null;
  }
}

export function findLotForFeature(feature, lotsData) {
  if (!feature || !lotsData || !lotsData.length) return null;
  const geom = feature.getGeometry();
  if (!geom || typeof geom.intersectsCoordinate !== 'function') return null;
  for (const lot of lotsData) {
    const coord = lotPointToProjected(lot);
    if (!coord) continue;
    if (geom.intersectsCoordinate(coord)) return lot;
  }
  return null;
}

export function findFeatureForLot(lot, layers) {
  const coord = lotPointToProjected(lot);
  if (!coord) return null;
  for (const layer of layers) {
    const source = layer.getSource && layer.getSource();
    if (!source || typeof source.getFeatures !== 'function') continue;
    for (const feature of source.getFeatures()) {
      const geom = feature.getGeometry();
      if (geom && typeof geom.intersectsCoordinate === 'function' && geom.intersectsCoordinate(coord)) {
        return feature;
      }
    }
  }
  return null;
}
