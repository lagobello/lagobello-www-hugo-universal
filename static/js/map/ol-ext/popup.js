// Generic popup overlay tied to existing #popup / #popup-content / #popup-closer DOM.

export function createPopup({ container, content, closer } = {}) {
  container = container || document.getElementById('popup');
  content = content || document.getElementById('popup-content');
  closer = closer || document.getElementById('popup-closer');

  const overlay = new ol.Overlay({
    element: container,
    autoPan: true,
    autoPanAnimation: { duration: 250 }
  });

  if (closer) {
    closer.onclick = () => {
      overlay.setPosition(undefined);
      closer.blur();
      return false;
    };
  }

  return {
    overlay,
    showAt(coord, html) {
      content.innerHTML = html;
      overlay.setPosition(coord);
    },
    close() { overlay.setPosition(undefined); }
  };
}
