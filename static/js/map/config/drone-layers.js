// Site-specific: fetches drone tileset folders from GitHub and pushes XYZ tile
// layers into the provided OL group.

const GH_API = 'https://api.github.com/repos/lagobello/lagobello-tiles/contents/zxy?ref=master';
const TILE_ROOT = 'https://lagobello.github.io/lagobello-tiles/zxy/';

export function loadDroneLayers(droneGroup, layerSwitcher) {
  return fetch(GH_API)
    .then((r) => r.json())
    .then((entries) => entries.filter((e) => e.type === 'dir').map((e) => e.name).sort())
    .then((folders) => {
      if (!folders.length) return;
      for (const folder of folders) {
        const src = new ol.source.XYZ({
          url: `${TILE_ROOT}${encodeURIComponent(folder)}/{z}/{x}/{-y}.png`,
          attributions: `© Drone flight ${folder.replace(/_/g, ' ')}`,
          maxZoom: 22
        });
        const lyr = new ol.layer.Tile({ source: src, visible: false });
        lyr.set('title', folder);
        lyr.set('type', 'overlay');
        droneGroup.getLayers().push(lyr);
      }
      if (layerSwitcher && typeof layerSwitcher.renderPanel === 'function') layerSwitcher.renderPanel();
    })
    .catch((err) => console.error(err));
}
