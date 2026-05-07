// Loads /data/lots.json once and exposes accessors. Replaces the old
// jQuery $.getJSON IIFE.

let lotsData = null;
let loadPromise = null;
const onLoadedListeners = [];

export function loadLots(url = '/data/lots.json') {
  if (loadPromise) return loadPromise;
  loadPromise = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`Network response was not ok for ${url}`);
      return r.json();
    })
    .then((data) => {
      lotsData = data;
      window.lotsData = data;
      for (const fn of onLoadedListeners) {
        try { fn(data); } catch (e) { console.error(e); }
      }
      return data;
    })
    .catch((err) => {
      console.error('CRITICAL: Error loading lots.json:', err.message);
      lotsData = [];
      window.lotsData = [];
      return [];
    });
  return loadPromise;
}

export function getLots() { return lotsData; }

export function onLotsLoaded(fn) {
  if (lotsData) fn(lotsData);
  else onLoadedListeners.push(fn);
}
