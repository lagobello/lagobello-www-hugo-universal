// Site-specific default map views.

export const LAGO_BELLO_CENTER_LONLAT = [-97.553, 26.053];

export function makeDefaultView() {
  return new ol.View({
    center: ol.proj.fromLonLat(LAGO_BELLO_CENTER_LONLAT),
    zoom: 16
  });
}

export function makeRotatedView() {
  return new ol.View({
    center: ol.proj.fromLonLat(LAGO_BELLO_CENTER_LONLAT),
    rotation: Math.PI / 2.17,
    zoom: 17
  });
}

export function chooseDefaultView() {
  return (window.innerHeight > window.innerWidth) ? makeDefaultView() : makeRotatedView();
}

export function makeLotView(lotPointLonLat, zoom = 17) {
  return new ol.View({
    center: ol.proj.fromLonLat(lotPointLonLat),
    zoom,
    maxZoom: 22
  });
}
