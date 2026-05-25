import {
  aggregateSeries,
  buildPanelArray,
  dailySolarModel,
  fetchNasaDailySeries,
  summarizeEnergy,
} from './solar-calculator-model.mjs';

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

  drawEarthDiagram(root.querySelector('[data-earth-diagram]'), options);
  drawIrradiationChart(root.querySelector('[data-chart="irradiation"]'), state.modelSeries, state.nasaSeries);
  drawEnergyChart(root.querySelector('[data-chart="energy"]'), aggregateSeries(summary.daily, options.period), options.outputMode);
  drawPanelArray(root.querySelector('[data-panel-array]'), options);
  renderSummary(root.querySelector('[data-summary]'), summary, activeSeries, options, state);
}

async function loadNasa(root, fields, state) {
  const status = root.querySelector('[data-status]');
  const options = readOptions(fields);
  status.className = 'solar-status';
  status.textContent = `Loading NASA POWER daily irradiation for ${options.year}…`;
  try {
    state.nasaSeries = await fetchNasaDailySeries(options);
    state.nasaLoadedYear = options.year;
    status.className = 'solar-status is-ok';
    status.textContent = `Loaded ${state.nasaSeries.length} NASA POWER daily values for ${options.year}.`;
  } catch (error) {
    state.nasaSeries = [];
    status.className = 'solar-status is-error';
    status.textContent = `NASA POWER data could not be loaded: ${error.message}`;
  }
}

function renderSummary(el, summary, activeSeries, options, state) {
  const annualIrradiation = activeSeries.reduce((sum, d) => sum + d.irradiation, 0);
  const source = activeSeries === state.nasaSeries ? `NASA POWER ${state.nasaLoadedYear}` : 'solar geometry model';
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

function drawEarthDiagram(el, options) {
  const day = Math.max(1, Math.min(365, Math.floor((Date.now() / 86400000) % 365) + 1));
  const declination = 23.44 * Math.sin((2 * Math.PI * (day - 80)) / 365);
  el.innerHTML = `
    <svg viewBox="0 0 520 360" role="img">
      <defs>
        <radialGradient id="earthShade" cx="35%" cy="30%">
          <stop offset="0" stop-color="#87cefa"/>
          <stop offset="0.55" stop-color="#2878b8"/>
          <stop offset="1" stop-color="#0b2e59"/>
        </radialGradient>
        <linearGradient id="sunRay" x1="0" x2="1">
          <stop offset="0" stop-color="#ffd166" stop-opacity="0.95"/>
          <stop offset="1" stop-color="#ffd166" stop-opacity="0.08"/>
        </linearGradient>
      </defs>
      <rect width="520" height="360" rx="18" fill="#071523"/>
      <circle cx="72" cy="92" r="38" fill="#ffb703"/>
      <g stroke="url(#sunRay)" stroke-width="10" stroke-linecap="round">
        <line x1="112" y1="82" x2="292" y2="120"/>
        <line x1="112" y1="116" x2="300" y2="170"/>
        <line x1="112" y1="150" x2="292" y2="220"/>
      </g>
      <g transform="translate(350 185) rotate(-23.44)">
        <line x1="0" y1="-132" x2="0" y2="132" stroke="#f8fafc" stroke-width="3" stroke-dasharray="8 6"/>
        <circle cx="0" cy="0" r="92" fill="url(#earthShade)"/>
        <ellipse cx="0" cy="0" rx="92" ry="23" fill="none" stroke="#dbeafe" stroke-width="2" opacity="0.8"/>
        <path d="M -50 -40 C -20 -70, 25 -55, 45 -20 C 12 -10, -8 8, -60 0 Z" fill="#54b56a" opacity="0.85"/>
        <path d="M 10 30 C 35 12, 58 22, 62 50 C 30 70, -15 65, -25 42 Z" fill="#54b56a" opacity="0.78"/>
        <circle cx="${Math.max(-80, Math.min(80, options.longitude / 2))}" cy="${-options.latitude * 1.2}" r="5" fill="#ff4d4f" stroke="#fff" stroke-width="2"/>
      </g>
      <path d="M 260 58 C 325 20, 410 28, 468 82" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="5 7"/>
      <text x="22" y="175" fill="#ffec99" font-size="15">Sun rays</text>
      <text x="300" y="326" fill="#e2e8f0" font-size="14">Earth axis tilted 23.44°</text>
      <text x="260" y="35" fill="#e2e8f0" font-size="14">Seasonal declination today: ${declination.toFixed(1)}°</text>
      <text x="290" y="282" fill="#e2e8f0" font-size="14">Red dot: selected latitude</text>
    </svg>`;
}

function drawIrradiationChart(canvas, model, nasa) {
  drawLineChart(canvas, [
    { label: 'Model', color: '#1f77b4', values: model.map((d) => ({ x: d.dayOfYear, y: d.irradiation })) },
    { label: 'NASA', color: '#f28e2b', values: nasa.map((d) => ({ x: d.dayOfYear, y: d.irradiation })) },
  ], { yLabel: 'kWh/m²/day' });
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
  const panels = buildPanelArray({ panelCount: options.panelCount, columns: 8, panelWidth: 1.1, panelHeight: 1.8, gap: 0.25 });
  const scale = 58;
  const maxX = Math.max(8, ...panels.map((p) => p.x + p.width));
  const maxY = Math.max(4, ...panels.map((p) => p.y + p.height));
  svg.setAttribute('viewBox', `0 0 ${Math.max(900, maxX * scale + 80)} ${Math.max(360, maxY * scale + 100)}`);
  svg.innerHTML = `<rect x="0" y="0" width="100%" height="100%" fill="#ecfdf3"/>
    <text x="32" y="38" fill="#14532d" font-size="22" font-weight="700">Ground array sketch: ${options.panelCount} panels</text>
    <g transform="translate(34 70) skewX(-10)">
      ${panels.map((p) => `<g><rect x="${p.x * scale}" y="${p.y * scale}" width="${p.width * scale}" height="${p.height * scale}" rx="5" fill="#1d4ed8" stroke="#dbeafe" stroke-width="3"/><line x1="${p.x * scale + p.width * scale / 2}" y1="${p.y * scale}" x2="${p.x * scale + p.width * scale / 2}" y2="${p.y * scale + p.height * scale}" stroke="#93c5fd"/><line x1="${p.x * scale}" y1="${p.y * scale + p.height * scale / 2}" x2="${p.x * scale + p.width * scale}" y2="${p.y * scale + p.height * scale / 2}" stroke="#93c5fd"/></g>`).join('')}
    </g>`;
}
