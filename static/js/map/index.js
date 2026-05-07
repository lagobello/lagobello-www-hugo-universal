// Entry for the full interactive property map shortcode.
import { LagoBelloMap } from './LagoBelloMap.js';
import { findFeatureForLot } from './data/spatialMatch.js';
import { onLotsLoaded, getLots } from './data/lots.js';

const map = new LagoBelloMap({
  target: 'ol-map',
  onTableHighlight(lotName) {
    const rows = document.querySelectorAll('#lot-table tbody tr');
    rows.forEach((tr) => tr.classList.remove('table-info'));
    if (!lotName) return;
    const target = document.querySelector(`#lot-table tbody tr[data-lot-name="${CSS.escape(lotName)}"]`);
    if (target) {
      target.classList.add('table-info');
      const container = target.closest('div, section') || target.parentElement;
      if (container) {
        const rect = target.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        if (rect.top < cRect.top || rect.bottom > cRect.bottom) {
          target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
    }
  }
});

window.lagoBelloMap = map;

// Bridge for lots-table.js: row click finds feature and pans/opens card.
window.focusLotByName = function (lotName) {
  const lots = getLots();
  if (!lots) return;
  const lot = lots.find((l) => l.Name === lotName);
  if (!lot) return;
  const platLayers = [map.layers.platS1, map.layers.platS2, map.layers.platS3].filter(Boolean);
  const onceReady = () => {
    const feature = findFeatureForLot(lot, platLayers);
    if (feature) map.panToLotFeature(feature);
  };
  // If sources are still loading, retry briefly.
  let tries = 0;
  const tryNow = () => {
    const platLayer = platLayers[0];
    if (platLayer && platLayer.getSource().getFeatures().length > 0) onceReady();
    else if (tries++ < 20) setTimeout(tryNow, 200);
  };
  tryNow();
};

// Initialize the lots table once map module has loaded.
function bootTable() {
  if (typeof window.makeListingsTable === 'function') {
    window.makeListingsTable('/data/lots.json');
  } else {
    setTimeout(bootTable, 50);
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootTable);
} else {
  bootTable();
}

// Orientation handling — re-set view when orientation flips.
window.addEventListener('orientationchange', () => {
  // Rebuild a default view based on new orientation.
  // Simplest approach: just re-instantiate the view from config helpers.
  import('./config/views.js').then(({ chooseDefaultView }) => {
    map.map.setView(chooseDefaultView());
  });
});

// Expose onLotsLoaded for table consumers that depend on lots data.
window.onLotsLoaded = onLotsLoaded;
