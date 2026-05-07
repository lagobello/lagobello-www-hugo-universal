// Augments an ol-layerswitcher panel with a copy-URL button and (for GeoJSON
// vector layers) a download link next to each layer label.

function findLayerByTitle(layerCollection, title) {
  let found = null;
  layerCollection.forEach(function (layer) {
    if (found) return;
    if (layer.get('title') === title && !(layer instanceof ol.layer.Group)) {
      found = layer;
    } else if (layer instanceof ol.layer.Group) {
      layer.getLayers().forEach(function (subLayer) {
        if (subLayer.get('title') === title && !(subLayer instanceof ol.layer.Group)) {
          found = subLayer;
        }
      });
    }
  });
  return found;
}

export function attachDownloadLinks({ map, layerSwitcher, sanitizeUrl }) {
  function run() {
    if (!layerSwitcher || !layerSwitcher.panel) return;
    const panelUl = layerSwitcher.panel.querySelector('ul');
    if (!panelUl) return;

    const listItems = panelUl.getElementsByTagName('li');
    for (let i = 0; i < listItems.length; i++) {
      const li = listItems[i];
      if (li.querySelector('a.download-geojson-link') || li.querySelector('button.copy-url-button')) continue;

      const label = li.querySelector('label');
      if (!label) continue;
      const layerTitle = label.textContent.trim();
      if (!layerTitle) continue;

      const targetLayer = findLayerByTitle(map.getLayers(), layerTitle);
      if (!targetLayer) continue;

      const source = targetLayer.getSource();
      let urlToCopy = null;
      let isGeoJSON = false;

      if (source instanceof ol.source.Vector && typeof source.getUrl === 'function' && source.getUrl()) {
        const rawUrl = source.getUrl();
        const format = source.getFormat();
        const isGeoJSONFormat = format && typeof format.getType === 'function' && format.getType().toLowerCase() === 'geojson';
        if (isGeoJSONFormat || (typeof rawUrl === 'string' && rawUrl.toLowerCase().endsWith('.geojson'))) {
          isGeoJSON = true;
          urlToCopy = rawUrl;
        }
      } else if (source instanceof ol.source.XYZ) {
        urlToCopy = source.getUrls()[0];
        if (sanitizeUrl) urlToCopy = sanitizeUrl(urlToCopy);
      }

      if (!urlToCopy) continue;

      const iconContainer = document.createElement('span');
      iconContainer.className = 'layer-action-icons';
      iconContainer.style.marginLeft = '8px';
      iconContainer.style.display = 'inline-flex';
      iconContainer.style.alignItems = 'center';

      const copyButton = document.createElement('button');
      copyButton.innerHTML = '🔗';
      copyButton.title = `Copy URL for ${layerTitle}`;
      copyButton.className = 'copy-url-button';
      copyButton.onclick = () => {
        navigator.clipboard.writeText(urlToCopy).then(() => {
          const originalText = copyButton.innerHTML;
          copyButton.innerHTML = '✅';
          setTimeout(() => { copyButton.innerHTML = originalText; }, 1500);
        }).catch((err) => {
          console.error(`Failed to copy URL for ${layerTitle}: `, err);
        });
      };
      iconContainer.appendChild(copyButton);

      if (isGeoJSON) {
        const downloadLink = document.createElement('a');
        downloadLink.href = urlToCopy;
        downloadLink.innerHTML = '⭳';
        downloadLink.title = `Download ${layerTitle}`;
        downloadLink.className = 'download-geojson-link';
        let filename = layerTitle.replace(/[^\w\s.-]/gi, '_').replace(/\s+/g, '_').toLowerCase();
        if (!filename) filename = 'layer';
        if (!filename.endsWith('.geojson')) filename += '.geojson';
        downloadLink.download = filename;
        iconContainer.appendChild(downloadLink);
      }

      if (label.parentNode === li) label.after(iconContainer);
    }
  }

  if (layerSwitcher && layerSwitcher.panel) {
    layerSwitcher.panel.addEventListener('rendercomplete', run);
    setTimeout(run, 500);
  }
  return run;
}
