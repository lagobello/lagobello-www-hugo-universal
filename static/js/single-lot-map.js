/* eslint-env browser,jquery */
/* globals ol */

var initSingleLotMap = function() {
    if (!window.lotLocationData) return;
    
    // Parse location data: "26.0518, -97.5524"
    var parts = window.lotLocationData.split(',');
    if (parts.length !== 2) return;
    
    var lat = parseFloat(parts[0].trim());
    var lon = parseFloat(parts[1].trim());
    
    if (isNaN(lat) || isNaN(lon)) return;
    
    var lotPointWGS84 = [lon, lat];
    var lotPointProj = ol.proj.fromLonLat(lotPointWGS84);
    
    var layerGoogleHybrid = new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        attributions: '© Google'
      }),
      opacity: 1.0
    });
    
    var lotStyle = new ol.style.Style({
      stroke: new ol.style.Stroke({ color: '#D3D3D3', width: 2 }),
      fill: new ol.style.Fill({ color: 'rgba(0, 60, 136, 0.4)' })
    });
    
    var highlightStyle = new ol.style.Style({
      stroke: new ol.style.Stroke({ color: '#ffcc33', width: 4 }),
      fill: new ol.style.Fill({ color: 'rgba(255, 204, 51, 0.6)' })
    });
    
    var createLotLayer = function(url) {
      return new ol.layer.Vector({
        source: new ol.source.Vector({
          format: new ol.format.GeoJSON(),
          url: url
        }),
        style: function(feature) {
          // Check if this feature contains the lot point
          var geometry = feature.getGeometry();
          if (geometry && typeof geometry.intersectsCoordinate === 'function' && geometry.intersectsCoordinate(lotPointProj)) {
            return highlightStyle;
          }
          return lotStyle; // We display other lots with default style for context
        },
        opacity: 0.8
      });
    };
    
    // Lake layer for context
    var layerVectorLake = new ol.layer.Vector({
      source: new ol.source.Vector({
        format: new ol.format.GeoJSON(),
        url: '/files/lake.geojson'
      }),
      style: new ol.style.Style({
        fill: new ol.style.Fill({ color: '#92c5eb' })
      }),
      opacity: 0.6
    });

    var layerS1 = createLotLayer('https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-LOTS-S1.geojson');
    var layerS2 = createLotLayer('https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-LOTS-S2.geojson');
    var layerS3 = createLotLayer('https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-LOTS-S3.geojson');

    var layerVectorStreetS1 = new ol.layer.Vector({
      source: new ol.source.Vector({
        format: new ol.format.GeoJSON(),
        url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-ROW-S1.geojson'
      }),
      style: new ol.style.Style({
        fill: new ol.style.Fill({ color: '#6F6E63' }),
        stroke: new ol.style.Stroke({ color: '#fade84', width: 2 })
      }),
      opacity: 0.8
    });

    var layerVectorStreetS2 = new ol.layer.Vector({
      source: new ol.source.Vector({
        format: new ol.format.GeoJSON(),
        url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-ROW-S2.geojson'
      }),
      style: new ol.style.Style({
        fill: new ol.style.Fill({ color: '#6F6E63' }),
        stroke: new ol.style.Stroke({ color: '#fade84', width: 2 })
      }),
      opacity: 0.8
    });

    var layerVectorStreetS3 = new ol.layer.Vector({
      source: new ol.source.Vector({
        format: new ol.format.GeoJSON(),
        url: 'https://lagobello.github.io/lagobello-drawings/web/PLAT-HATCH-ROW-S3.geojson'
      }),
      style: new ol.style.Style({
        fill: new ol.style.Fill({ color: '#6F6E63' }),
        stroke: new ol.style.Stroke({ color: '#fade84', width: 2 })
      }),
      opacity: 0.8
    });

    
    var map = new ol.Map({
        target: 'lot-map',
        layers: [
          layerGoogleHybrid, 
          layerVectorLake, 
          layerVectorStreetS1, layerVectorStreetS2, layerVectorStreetS3, 
          layerS1, layerS2, layerS3
        ],
        view: new ol.View({
            center: lotPointProj,
            zoom: 17, // default zoom, will adjust when feature found
            maxZoom: 22
        })
    });
    
    // Zoom to the highlighted feature once loaded
    var zoomed = false;
    var fitToHighlight = function(source) {
        if (zoomed) return false;
        var features = source.getFeatures();
        for (var i = 0; i < features.length; i++) {
            var feature = features[i];
            var geometry = feature.getGeometry();
            if (geometry && typeof geometry.intersectsCoordinate === 'function' && geometry.intersectsCoordinate(lotPointProj)) {
                var extent = geometry.getExtent();
                // Add some padding to the extent
                map.getView().fit(extent, {
                    padding: [100, 100, 100, 100],
                    maxZoom: 20,
                    duration: 1000
                });
                zoomed = true;
                return true; // Found and zoomed
            }
        }
        return false;
    };
    
    // Listen to source change events to zoom when features are ready
    var checkSources = function() {
        fitToHighlight(layerS1.getSource());
        fitToHighlight(layerS2.getSource());
        fitToHighlight(layerS3.getSource());
    };
    
    layerS1.getSource().on('change', checkSources);
    layerS2.getSource().on('change', checkSources);
    layerS3.getSource().on('change', checkSources);
};

var ensureMapInitialized = function() {
    if (typeof ol === 'undefined') {
        setTimeout(ensureMapInitialized, 100);
        return;
    }
    
    var mapTarget = document.getElementById('lot-map');
    if (!mapTarget) {
        setTimeout(ensureMapInitialized, 100);
        return;
    }

    if (mapTarget.innerHTML !== "") {
        return; // Already initialized
    }
    
    initSingleLotMap();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureMapInitialized);
} else {
    ensureMapInitialized();
}
