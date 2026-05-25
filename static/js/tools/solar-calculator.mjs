import {
  aggregateSeries,
  buildPanelArray,
  dailySolarModel,
  extraterrestrialDailyIrradiation,
  fetchNasaDailySeries,
  inverseEarthSunDistance,
  solarDeclination,
  summarizeEnergy,
  sunsetHourAngle,
} from './solar-calculator-model.mjs';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const EARTH_TILT_DEGREES = 23.44;

const roots = document.querySelectorAll('[data-solar-calculator]');
roots.forEach((root) => initSolarCalculator(root));

function initSolarCalculator(root) {
  const fields = getFields(root);
  const state = {
    modelSeries: [],
    nasaSeries: [],
    nasaLoadedYear: null,
  };

  fields.year.value = String(new Date().getFullYear() - 1);

  root.addEventListener('input', (event) => {
    if (event.target.matches('[data-field]')) render(root, fields, state);
  });
  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-field]')) render(root, fields, state);
  });
  root.querySelector('[data-action="fetch-nasa"]').addEventListener('click', async () => {
    await loadNasa(root, fields, state);
    render(root, fields, state);
  });

  render(root, fields, state);
}

function getFields(root) {
  return Object.fromEntries(Array.from(root.querySelectorAll('[data-field]')).map((el) => [el.dataset.field, el]));
}

function readOptions(fields) {
  return {
    latitude: Number(fields.latitude.value),
    longitude: Number(fields.longitude.value),
    year: Number(fields.year.value),
    panelCount: Number(fields.panelCount.value),
    panelArea: Number(fields.panelArea.value),
    panelEfficiency: Number(fields.panelEfficiency.value),
    performanceRatio: Number(fields.performanceRatio.value),
    electricityPrice: Number(fields.electricityPrice.value),
    period: fields.period.value,
    outputMode: fields.outputMode.value,
    seriesSource: fields.seriesSource.value,
  };
}

function render(root, fields, state) {
  const options = readOptions(fields);
  root.querySelector('[data-output="panelCount"]').textContent = String(options.panelCount);

  state.modelSeries = dailySolarModel(options);
  const activeSeries = options.seriesSource === 'model' || state.nasaSeries.length === 0 ? state.modelSeries : state.nasaSeries;
  const summary = summarizeEnergy(activeSeries, options);

  drawSolarSystem(root.querySelector('[data-solar-system]'), options);
  drawIrradiationChart(root.querySelector('[data-chart="irradiation"]'), state.modelSeries, state.nasaSeries);
  drawEnergyChart(root.querySelector('[data-chart="energy"]'), aggregateSeries(summary.daily, options.period), options.outputMode);
  drawPanelArray(root.querySelector('[data-panel-array]'), options);
  renderSummary(root.querySelector('[data-summary]'), summary, activeSeries, options, state);
}

async function loadNasa(root, fields, state) {
  const status = root.querySelector('[data-status]');
  const options = readOptions(fields);
  status.className = 'solar-status';
  status.textContent = 'Loading NASA POWER daily irradiation…';
  try {
    state.nasaSeries = await fetchNasaDailySeries(options);
    state.nasaLoadedYear = options.year;
    status.className = 'solar-status is-ok';
    status.textContent = `Loaded ${state.nasaSeries.length} NASA POWER daily values.`;
  } catch (error) {
    state.nasaSeries = [];
    status.className = 'solar-status is-error';
    status.textContent = `NASA POWER data could not be loaded: ${error.message}`;
  }
}

function renderSummary(el, summary, activeSeries, options, state) {
  const annualIrradiation = activeSeries.reduce((sum, d) => sum + d.irradiation, 0);
  const source = activeSeries === state.nasaSeries ? 'NASA POWER daily data' : 'solar geometry model';
  const rows = [
    ['Irradiation source', source],
    ['Panel count', options.panelCount.toLocaleString()],
    ['Panel area', `${summary.systemArea.toFixed(1)} m² total`],
    ['Approx. DC size', `${summary.dcSizeKw.toFixed(2)} kW`],
    ['Annual irradiation', `${annualIrradiation.toFixed(0)} kWh/m²/year`],
    ['Yearly generation', `${summary.yearly.kwh.toFixed(0)} kWh`],
    ['Yearly value', `$${summary.yearly.value.toFixed(0)}`],
  ];
  el.innerHTML = rows.map(([dt, dd]) => `<dt>${dt}</dt><dd>${dd}</dd>`).join('');
}

function drawSolarSystem(el, options) {
  if (!el || el.dataset.cesiumReady === '1') {
    updateSolarSystemLatitude(el, options);
    return;
  }
  if (!window.Cesium) {
    el.innerHTML = '<div class="solar-system-fallback">Loading CesiumJS solar-system model…</div>';
    window.setTimeout(() => drawSolarSystem(el, options), 120);
    return;
  }
  if (!hasWebGL()) {
    el.innerHTML = '<div class="solar-system-fallback">CesiumJS solar-system model requires WebGL. Open this page in a WebGL-enabled browser to see the interactive Earth, Moon, and Sun scene.</div>';
    return;
  }

  const Cesium = window.Cesium;
  el.dataset.cesiumReady = '1';
  let viewer;
  let baseLayer;
  try {
    baseLayer = Cesium.ImageryLayer.fromProviderAsync(
      Cesium.TileMapServiceImageryProvider.fromUrl(Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII'))
    );
    viewer = new Cesium.Viewer(el, {
      animation: false,
      timeline: false,
      baseLayer,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      shouldAnimate: true,
      requestRenderMode: true,
    });
  } catch (error) {
    el.dataset.cesiumReady = '';
    el.innerHTML = '<div class="solar-system-fallback">CesiumJS solar-system model could not start in this browser. Open this page in a WebGL-enabled browser to see the interactive Earth, Moon, and Sun scene.</div>';
    return;
  }

  const scene = viewer.scene;
  scene.skyBox.show = false;
  scene.skyAtmosphere.show = true;
  scene.sun.show = true;
  scene.moon.show = true;
  scene.globe.enableLighting = true;
  scene.globe.showGroundAtmosphere = true;
  scene.backgroundColor = Cesium.Color.fromCssColorString('#071523');
  scene.screenSpaceCameraController.minimumZoomDistance = 8000000;
  scene.screenSpaceCameraController.maximumZoomDistance = 36000000;

  viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-64, 12, 21000000),
    orientation: { heading: 0, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0 },
  });

  addSolarBodyMarkers(viewer);
  const geometryEntities = addSolarGeometryEntities(viewer, options);

  const latitudeLine = viewer.entities.add({
    name: 'Selected latitude line',
    polyline: {
      positions: latitudeCirclePositions(options.latitude),
      width: 2,
      material: Cesium.Color.fromCssColorString('#ffebe6').withAlpha(0.85),
      arcType: Cesium.ArcType.NONE,
      clampToGround: false,
    },
  });
  const latitudePoint = viewer.entities.add({
    name: 'Selected latitude marker',
    position: Cesium.Cartesian3.fromDegrees(Number(options.longitude) || -97.553, Number(options.latitude) || 0, 250000),
    point: { pixelSize: 10, color: Cesium.Color.RED, outlineColor: Cesium.Color.WHITE, outlineWidth: 2 },
    label: {
      text: 'Selected latitude',
      font: '14px system-ui, sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -22),
    },
  });

  el._solarViewer = viewer;
  el._solarLatitudeLine = latitudeLine;
  el._solarLatitudePoint = latitudePoint;
  el._solarGeometryEntities = geometryEntities;
  updateSolarSystemLatitude(el, options);
}

function updateSolarSystemLatitude(el, options) {
  if (!el || !el._solarViewer) return;
  const Cesium = window.Cesium;
  const latitude = Number(options.latitude) || 0;
  const longitude = Number(options.longitude) || -97.553;
  const metrics = modelMetrics(options);
  el._solarLatitudeLine.polyline.positions = latitudeCirclePositions(latitude);
  el._solarLatitudePoint.position = Cesium.Cartesian3.fromDegrees(longitude, latitude, 250000);
  el._solarLatitudePoint.label.text = `φ latitude ${formatSignedDegrees(latitude)}`;
  updateSolarGeometryEntities(el, metrics);
  renderSolarSystemOverlay(el, metrics, options);
  el._solarViewer.scene.requestRender();
}

function addSolarBodyMarkers(viewer) {
  const Cesium = window.Cesium;
  const labelStyle = {
    font: '16px system-ui, sans-serif',
    fillColor: Cesium.Color.WHITE,
    outlineColor: Cesium.Color.BLACK,
    outlineWidth: 4,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -18),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  };

  viewer.entities.add({
    name: 'Visible Sun reference marker',
    position: Cesium.Cartesian3.fromDegrees(-150, 28, 6200000),
    point: {
      pixelSize: 34,
      color: Cesium.Color.fromCssColorString('#ffd166'),
      outlineColor: Cesium.Color.fromCssColorString('#fff4b8'),
      outlineWidth: 5,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: { ...labelStyle, text: 'Sun' },
  });

  viewer.entities.add({
    name: 'Visible Moon reference marker',
    position: Cesium.Cartesian3.fromDegrees(24, -23, 4300000),
    point: {
      pixelSize: 24,
      color: Cesium.Color.fromCssColorString('#d8dee9'),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 3,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: { ...labelStyle, text: 'Moon' },
  });
}


function addSolarGeometryEntities(viewer, options) {
  const Cesium = window.Cesium;
  const metrics = modelMetrics(options);
  const longitude = Number(metrics.longitude) || -97.553;
  const latitude = Number(metrics.latitude) || 0;
  const labelStyle = {
    font: '14px system-ui, sans-serif',
    fillColor: Cesium.Color.WHITE,
    outlineColor: Cesium.Color.BLACK,
    outlineWidth: 4,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  };
  return {
    axis: viewer.entities.add({
      name: "Earth's tilted axis",
      position: Cesium.Cartesian3.fromDegrees(90, 67, 5400000),
      polyline: {
        positions: tiltedAxisPositions(),
        width: 4,
        material: Cesium.Color.fromCssColorString('#8ecae6'),
        arcType: Cesium.ArcType.NONE,
        clampToGround: false,
      },
      label: {
        ...labelStyle,
        text: `Earth axis tilt ε = ${EARTH_TILT_DEGREES.toFixed(2)}°`,
      },
    }),
    equator: viewer.entities.add({
      name: 'Equator reference line',
      position: Cesium.Cartesian3.fromDegrees(-35, 0, 600000),
      polyline: {
        positions: latitudeCirclePositions(0, 130000),
        width: 2,
        material: Cesium.Color.fromCssColorString('#9ca3af').withAlpha(0.78),
        arcType: Cesium.ArcType.NONE,
        clampToGround: false,
      },
      label: {
        ...labelStyle,
        text: 'Equator 0°',
      },
    }),
    declination: viewer.entities.add({
      name: 'Solar declination line',
      position: Cesium.Cartesian3.fromDegrees(130, metrics.declinationDegrees, 900000),
      polyline: {
        positions: latitudeCirclePositions(metrics.declinationDegrees, 230000),
        width: 3,
        material: Cesium.Color.fromCssColorString('#ffd166').withAlpha(0.95),
        arcType: Cesium.ArcType.NONE,
        clampToGround: false,
      },
      label: {
        ...labelStyle,
        text: `δ solar declination ${formatSignedDegrees(metrics.declinationDegrees)}`,
      },
    }),
    noonRay: viewer.entities.add({
      name: 'Noon sun ray to selected site',
      position: Cesium.Cartesian3.fromDegrees(longitude, latitude, 1700000),
      polyline: {
        positions: noonRayPositions(metrics),
        width: 3,
        material: Cesium.Color.fromCssColorString('#ffb703').withAlpha(0.92),
        arcType: Cesium.ArcType.NONE,
        clampToGround: false,
      },
      label: {
        ...labelStyle,
        text: `θz noon zenith ${metrics.noonZenithDegrees.toFixed(1)}°`,
      },
    }),
  };
}

function updateSolarGeometryEntities(el, metrics) {
  const Cesium = window.Cesium;
  const entities = el._solarGeometryEntities;
  if (!entities) return;
  const longitude = Number(metrics.longitude) || -97.553;
  const latitude = Number(metrics.latitude) || 0;
  entities.declination.polyline.positions = latitudeCirclePositions(metrics.declinationDegrees, 230000);
  entities.declination.label.text = `δ solar declination ${formatSignedDegrees(metrics.declinationDegrees)}`;
  entities.declination.position = Cesium.Cartesian3.fromDegrees(130, metrics.declinationDegrees, 900000);
  entities.noonRay.polyline.positions = noonRayPositions(metrics);
  entities.noonRay.label.text = `θz noon zenith ${metrics.noonZenithDegrees.toFixed(1)}°`;
  entities.noonRay.position = Cesium.Cartesian3.fromDegrees(longitude, latitude, 1800000);
}

function noonRayPositions(metrics) {
  const Cesium = window.Cesium;
  const longitude = Number(metrics.longitude) || -97.553;
  const latitude = Number(metrics.latitude) || 0;
  return [
    Cesium.Cartesian3.fromDegrees(longitude, latitude, 5100000),
    Cesium.Cartesian3.fromDegrees(longitude, latitude, 260000),
  ];
}

function renderSolarSystemOverlay(el, metrics, options) {
  let overlay = el.querySelector('[data-solar-system-overlay]');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'solar-system-overlay';
    overlay.dataset.solarSystemOverlay = '1';
    el.appendChild(overlay);
  }
  overlay.innerHTML = `
    <strong>Model values shown</strong>
    <dl>
      <dt>N</dt><dd>${metrics.dayOfYear} (${metrics.dateLabel})</dd>
      <dt>φ</dt><dd>${formatSignedDegrees(metrics.latitude)}</dd>
      <dt>ε</dt><dd>${EARTH_TILT_DEGREES.toFixed(2)}° Earth tilt</dd>
      <dt>δ</dt><dd>${formatSignedDegrees(metrics.declinationDegrees)} solar declination</dd>
      <dt>ω</dt><dd>0° at solar noon</dd>
      <dt>θz</dt><dd>${metrics.noonZenithDegrees.toFixed(1)}° noon zenith</dd>
      <dt>dᵣ</dt><dd>${metrics.inverseDistance.toFixed(3)}</dd>
      <dt>ωs</dt><dd>${metrics.sunsetAngleDegrees.toFixed(1)}° sunset hour angle</dd>
      <dt>H₀</dt><dd>${metrics.extraterrestrial.toFixed(2)} kWh/m²/day</dd>
      <dt>Hᵈ</dt><dd>${metrics.irradiation.toFixed(2)} kWh/m²/day</dd>
      <dt>A</dt><dd>${metrics.systemArea.toFixed(1)} m² (${options.panelCount} panels)</dd>
      <dt>η</dt><dd>${(options.panelEfficiency * 100).toFixed(1)}%</dd>
      <dt>PR</dt><dd>${Number(options.performanceRatio).toFixed(2)}</dd>
      <dt>Eᵈ</dt><dd>${metrics.dailyEnergy.toFixed(1)} kWh/day</dd>
    </dl>`;
}

function modelMetrics(options) {
  const year = Number(options.year) || new Date().getFullYear();
  const dayOfYear = representativeDayOfYear(year);
  const latitude = Number(options.latitude) || 0;
  const longitude = Number(options.longitude) || 0;
  const declinationRad = solarDeclination(dayOfYear);
  const declinationDegrees = declinationRad * RAD_TO_DEG;
  const phi = latitude * DEG_TO_RAD;
  const noonZenithDegrees = Math.abs(latitude - declinationDegrees);
  const inverseDistance = inverseEarthSunDistance(dayOfYear);
  const sunsetAngleDegrees = sunsetHourAngle(phi, declinationRad) * RAD_TO_DEG;
  const extraterrestrial = extraterrestrialDailyIrradiation({ latitude, dayOfYear });
  const count = isLeapYearLocal(year) ? 366 : 365;
  const seasonalCloudFactor = 1 + 0.08 * Math.sin((2 * Math.PI * (dayOfYear - 110)) / count);
  const clearnessIndex = 0.56;
  const irradiation = Math.max(0, extraterrestrial * clearnessIndex * seasonalCloudFactor);
  const systemArea = Number(options.panelCount) * Number(options.panelArea);
  const dailyEnergy = irradiation * systemArea * Number(options.panelEfficiency) * Number(options.performanceRatio);
  return {
    year,
    dayOfYear,
    dateLabel: dayOfYearToShortLabel(year, dayOfYear),
    latitude,
    longitude,
    declinationDegrees,
    noonZenithDegrees,
    inverseDistance,
    sunsetAngleDegrees,
    extraterrestrial,
    irradiation,
    systemArea,
    dailyEnergy,
  };
}

function representativeDayOfYear(year) {
  const now = new Date();
  const date = new Date(Date.UTC(year, now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(Date.UTC(year, 0, 1));
  return Math.floor((date - start) / 86400000) + 1;
}

function dayOfYearToShortLabel(year, dayOfYear) {
  const date = new Date(Date.UTC(year, 0, dayOfYear));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function tiltedAxisPositions() {
  const Cesium = window.Cesium;
  const northLat = 90 - EARTH_TILT_DEGREES;
  return [
    Cesium.Cartesian3.fromDegrees(270, -northLat, 5200000),
    Cesium.Cartesian3.fromDegrees(90, northLat, 5200000),
  ];
}

function latitudeCirclePositions(latitude, height = 180000) {
  const Cesium = window.Cesium;
  const lat = Math.max(-89, Math.min(89, Number(latitude) || 0));
  return Array.from({ length: 181 }, (_, index) => {
    const longitude = -180 + index * 2;
    return Cesium.Cartesian3.fromDegrees(longitude, lat, height);
  });
}

function formatSignedDegrees(value) {
  const number = Number(value) || 0;
  return `${number >= 0 ? '+' : '−'}${Math.abs(number).toFixed(2)}°`;
}

function isLeapYearLocal(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function hasWebGL() {
  const canvas = document.createElement('canvas');
  try {
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (error) {
    return false;
  }
}

function drawIrradiationChart(canvas, model, nasa) {
  drawDailyOverlayBarChart(canvas, {
    model: model.map((d) => ({ x: d.dayOfYear, y: d.irradiation })),
    nasa: nasa.map((d) => ({ x: d.dayOfYear, y: d.irradiation })),
    yLabel: 'kWh/m²/day',
  });
}

function drawDailyOverlayBarChart(canvas, data) {
  const { ctx, width, height, pad } = setupCanvas(canvas);
  clearChart(ctx, width, height, pad, data.yLabel);
  const maxY = Math.max(1, ...data.model.map((v) => v.y), ...data.nasa.map((v) => v.y)) * 1.12;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const barW = Math.max(1, plotW / 365);
  const yScale = (y) => height - pad.bottom - (y / maxY) * plotH;

  ctx.fillStyle = 'rgba(31, 119, 180, 0.58)';
  data.model.forEach((point) => {
    const x = pad.left + (point.x - 1) / 365 * plotW;
    const y = yScale(point.y);
    ctx.fillRect(x, y, Math.max(1, barW * 0.92), height - pad.bottom - y);
  });

  ctx.fillStyle = 'rgba(242, 142, 43, 0.72)';
  data.nasa.forEach((point) => {
    const x = pad.left + (point.x - 1) / 365 * plotW + Math.max(0, barW * 0.18);
    const y = yScale(point.y);
    ctx.fillRect(x, y, Math.max(1, barW * 0.56), height - pad.bottom - y);
  });
}

function drawEnergyChart(canvas, series, outputMode) {
  drawBarChart(canvas, series.map((d, index) => ({ x: index + 1, label: d.label, y: d[outputMode] })), {
    color: outputMode === 'value' ? '#327a45' : '#1f77b4',
    yLabel: outputMode === 'value' ? '$' : 'kWh',
  });
}

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, rect.width || canvas.width);
  const height = Math.max(220, width * 0.36);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height, pad: { left: 54, right: 18, top: 20, bottom: 42 } };
}

function drawLineChart(canvas, seriesList, opts) {
  const { ctx, width, height, pad } = setupCanvas(canvas);
  clearChart(ctx, width, height, pad, opts.yLabel);
  const maxY = Math.max(1, ...seriesList.flatMap((s) => s.values.map((v) => v.y))) * 1.12;
  const xScale = (x) => pad.left + ((x - 1) / 365) * (width - pad.left - pad.right);
  const yScale = (y) => height - pad.bottom - (y / maxY) * (height - pad.top - pad.bottom);
  for (const s of seriesList) {
    if (!s.values.length) continue;
    ctx.beginPath();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2.5;
    s.values.forEach((p, i) => i ? ctx.lineTo(xScale(p.x), yScale(p.y)) : ctx.moveTo(xScale(p.x), yScale(p.y)));
    ctx.stroke();
  }
}

function drawBarChart(canvas, values, opts) {
  const { ctx, width, height, pad } = setupCanvas(canvas);
  clearChart(ctx, width, height, pad, opts.yLabel);
  const maxY = Math.max(1, ...values.map((v) => v.y)) * 1.12;
  const plotW = width - pad.left - pad.right;
  const barW = Math.max(2, plotW / values.length * 0.72);
  values.forEach((point, index) => {
    const x = pad.left + (index / values.length) * plotW + (plotW / values.length - barW) / 2;
    const y = height - pad.bottom - (point.y / maxY) * (height - pad.top - pad.bottom);
    ctx.fillStyle = opts.color;
    ctx.fillRect(x, y, barW, height - pad.bottom - y);
  });
}

function clearChart(ctx, width, height, pad, yLabel) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#d0d7de';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, height - pad.bottom);
  ctx.lineTo(width - pad.right, height - pad.bottom);
  ctx.stroke();
  ctx.fillStyle = '#667085';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(yLabel, 10, 18);
  ctx.fillText('Jan', pad.left, height - 14);
  ctx.fillText('Apr', pad.left + (width - pad.left - pad.right) * .25, height - 14);
  ctx.fillText('Jul', pad.left + (width - pad.left - pad.right) * .50, height - 14);
  ctx.fillText('Oct', pad.left + (width - pad.left - pad.right) * .75, height - 14);
}

function drawPanelArray(svg, options) {
  const panels = buildPanelArray({ panelCount: options.panelCount, columns: 8, panelWidth: 1.1, panelHeight: 1.8, gap: 0.28 });
  const scale = 50;
  const maxX = Math.max(8, ...panels.map((p) => p.x + p.width));
  const maxY = Math.max(4, ...panels.map((p) => p.y + p.height));
  const width = Math.max(780, maxX * scale + 110);
  const height = Math.max(320, maxY * scale + 140);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const posts = panels
    .filter((_, index) => index % 2 === 0)
    .map((p) => {
      const x = p.x * scale + p.width * scale / 2;
      const y = p.y * scale + p.height * scale + 12;
      return `<g>
        <rect x="${x - 5}" y="${y - 18}" width="10" height="58" rx="3" fill="#8b5a2b"/>
        <rect x="${x - 11}" y="${y + 36}" width="22" height="8" rx="3" fill="#6f4518"/>
      </g>`;
    }).join('');

  svg.innerHTML = `<rect x="0" y="0" width="100%" height="100%" fill="#ecfdf3"/>
    <path d="M0 ${height - 55} C ${width * .25} ${height - 80}, ${width * .55} ${height - 30}, ${width} ${height - 65} L ${width} ${height} L 0 ${height} Z" fill="#c7e7c8"/>
    <text x="28" y="36" fill="#14532d" font-size="22" font-weight="700">Ground-mount layout: ${options.panelCount} panels</text>
    <g transform="translate(34 76) skewX(-10)">
      ${posts}
      <line x1="-8" y1="${maxY * scale + 12}" x2="${maxX * scale + 14}" y2="${maxY * scale + 12}" stroke="#6f4518" stroke-width="8" stroke-linecap="round"/>
      ${panels.map((p) => `<g>
        <rect x="${p.x * scale}" y="${p.y * scale}" width="${p.width * scale}" height="${p.height * scale}" rx="4" fill="#1d4ed8" stroke="#dbeafe" stroke-width="3"/>
        <line x1="${p.x * scale + p.width * scale / 2}" y1="${p.y * scale}" x2="${p.x * scale + p.width * scale / 2}" y2="${p.y * scale + p.height * scale}" stroke="#93c5fd"/>
        <line x1="${p.x * scale}" y1="${p.y * scale + p.height * scale / 2}" x2="${p.x * scale + p.width * scale}" y2="${p.y * scale + p.height * scale / 2}" stroke="#93c5fd"/>
      </g>`).join('')}
    </g>`;
}
