// Single-feature highlight overlay layer. createHighlighter() returns a function
// that swaps which feature is highlighted (pass null to clear).

export function createHighlighter(map, style) {
  const layer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    map,
    style
  });
  let current = null;

  return function highlight(feature) {
    if (feature === current) return;
    if (current) layer.getSource().removeFeature(current);
    if (feature) layer.getSource().addFeature(feature);
    current = feature;
  };
}
