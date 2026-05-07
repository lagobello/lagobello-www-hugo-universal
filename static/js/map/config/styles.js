// Site-specific styles and lot-status color map.

export const styleLake = () => new ol.style.Style({
  fill: new ol.style.Fill({ color: '#92c5eb' })
});

export const styleLotCameronAppraisalDistrict = () => new ol.style.Style({
  fill: new ol.style.Fill({ color: '#FFFF00' }),
  stroke: new ol.style.Stroke({ color: '#000000', width: 1 })
});

export const stylePark = () => new ol.style.Style({
  fill: new ol.style.Fill({ color: '#6b8e23' })
});

export const styleStreet = () => new ol.style.Style({
  fill: new ol.style.Fill({ color: '#6F6E63' }),
  stroke: new ol.style.Stroke({ color: '#fade84', width: 2 })
});

export const styleHighlight = () => new ol.style.Style({
  stroke: new ol.style.Stroke({ color: 'blue', width: 3 })
});

export const styleFloodHazard = () => new ol.style.Style({
  stroke: new ol.style.Stroke({ color: 'rgba(255, 0, 0, 0.7)', width: 2 }),
  fill: new ol.style.Fill({ color: 'rgba(255, 0, 0, 0.1)' })
});

export const styleLotSingleDefault = () => new ol.style.Style({
  stroke: new ol.style.Stroke({ color: '#D3D3D3', width: 2 }),
  fill: new ol.style.Fill({ color: 'rgba(0, 60, 136, 0.4)' })
});

export const styleLotSingleHighlight = () => new ol.style.Style({
  stroke: new ol.style.Stroke({ color: '#ffcc33', width: 4 }),
  fill: new ol.style.Fill({ color: 'rgba(255, 204, 51, 0.6)' })
});

export const styleDrawing = () => new ol.style.Style({
  fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
  stroke: new ol.style.Stroke({ color: '#ffcc33', width: 3 }),
  image: new ol.style.Circle({ radius: 7, fill: new ol.style.Fill({ color: '#ffcc33' }) })
});

export const styleDraw = () => new ol.style.Style({
  fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
  stroke: new ol.style.Stroke({
    color: 'rgba(0, 0, 0, 0.5)',
    lineDash: [10, 10],
    width: 2
  }),
  image: new ol.style.Circle({
    radius: 5,
    stroke: new ol.style.Stroke({ color: 'rgba(0, 0, 0, 0.7)' }),
    fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' })
  })
});

// Lot status -> rgba color map for plat lot fill.
export const lotStatusColors = {
  'SOLD': 'rgba(229, 115, 115, 0.6)',
  'LISTED': 'rgba(76, 175, 80, 0.4)',
  'AVAILABLE': 'rgba(76, 175, 80, 0.4)',
  'UNDER CONTRACT': 'rgba(255, 235, 59, 0.4)',
  'PENDING': 'rgba(255, 235, 59, 0.4)',
  'RESERVED': 'rgba(100, 181, 246, 0.2)',
  'FUTURE': 'rgba(186, 104, 200, 0.7)',
  'DEFAULT': 'rgba(0, 60, 136, 0.4)'
};

// Returns an OL style function that picks fill color based on the spatially-
// matched lot's status. Pass in a getter for current lots data so it stays
// reactive across loads.
import { findLotForFeature } from '../data/spatialMatch.js';
export function makeDynamicLotStyle(getLotsData) {
  return function (feature) {
    let chosenColor = lotStatusColors.DEFAULT;
    const lots = getLotsData();
    const matched = lots && lots.length ? findLotForFeature(feature, lots) : null;
    if (matched) {
      const status = matched['Lot Status'] ? matched['Lot Status'].toUpperCase() : null;
      if (status && lotStatusColors[status]) chosenColor = lotStatusColors[status];
    }
    return new ol.style.Style({
      fill: new ol.style.Fill({ color: chosenColor }),
      stroke: new ol.style.Stroke({ color: '#D3D3D3', width: 2 })
    });
  };
}
