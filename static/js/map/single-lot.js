// Entry for the per-lot detail page (/lots/<n>/).
import { SingleLotMap } from './LagoBelloMap.js';

function init() {
  if (typeof ol === 'undefined') { setTimeout(init, 100); return; }
  const target = document.getElementById('lot-map');
  if (!target) { setTimeout(init, 100); return; }
  if (target.innerHTML !== '') return; // already initialized

  if (!window.lotLocationData) return;
  const parts = window.lotLocationData.split(',');
  if (parts.length !== 2) return;
  const lat = parseFloat(parts[0].trim());
  const lon = parseFloat(parts[1].trim());
  if (isNaN(lat) || isNaN(lon)) return;

  new SingleLotMap({ target: 'lot-map', lotPointLonLat: [lon, lat] });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
