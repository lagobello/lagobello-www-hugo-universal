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
  const latitudeY = Math.max(-74, Math.min(74, -options.latitude * 1.05));
  el.innerHTML = `
    <svg viewBox="0 0 560 380" role="img">
      <defs>
        <radialGradient id="earthOcean" cx="36%" cy="30%">
          <stop offset="0" stop-color="#b7e4ff"/>
          <stop offset="0.52" stop-color="#2b83c6"/>
          <stop offset="1" stop-color="#102a56"/>
        </radialGradient>
        <radialGradient id="sunGlow" cx="50%" cy="50%">
          <stop offset="0" stop-color="#fff4b8"/>
          <stop offset="0.55" stop-color="#f6b73c"/>
          <stop offset="1" stop-color="#f97316"/>
        </radialGradient>
        <linearGradient id="ray" x1="0" x2="1">
          <stop offset="0" stop-color="#ffe082" stop-opacity="0.95"/>
          <stop offset="1" stop-color="#ffe082" stop-opacity="0.12"/>
        </linearGradient>
        <clipPath id="earthClip"><circle cx="0" cy="0" r="105"/></clipPath>
      </defs>
      <rect width="560" height="380" rx="18" fill="#071523"/>
      <circle cx="78" cy="96" r="42" fill="url(#sunGlow)"/>
      <g stroke="url(#ray)" stroke-width="9" stroke-linecap="round">
        <line x1="125" y1="74" x2="303" y2="112"/>
        <line x1="125" y1="112" x2="314" y2="165"/>
        <line x1="125" y1="150" x2="304" y2="222"/>
      </g>
      <g transform="translate(382 193) rotate(-23.44)">
        <line x1="0" y1="-148" x2="0" y2="148" stroke="#f8fafc" stroke-width="3" stroke-dasharray="8 6"/>
        <circle cx="0" cy="0" r="105" fill="url(#earthOcean)"/>
        <g clip-path="url(#earthClip)">
          <ellipse cx="0" cy="0" rx="105" ry="25" fill="none" stroke="#dbeafe" stroke-width="2" opacity="0.8"/>
          <ellipse cx="0" cy="${latitudeY}" rx="${Math.max(18, 102 * Math.cos(Math.abs(options.latitude) * Math.PI / 180))}" ry="7" fill="none" stroke="#ffebe6" stroke-width="2" opacity="0.85"/>
          <path d="M -78 -60 C -52 -88,-18 -80,-8 -55 C 5 -34,-18 -28,-12 -8 C -5 15,-32 28,-48 8 C -66 -14,-98 -20,-86 -42 Z" fill="#56b870"/>
          <path d="M -42 30 C -18 18,8 26,16 50 C 2 76,-32 70,-46 52 C -58 38,-55 32,-42 30 Z" fill="#56b870"/>
          <path d="M 12 -70 C 38 -80,72 -60,78 -32 C 55 -22,48 -3,70 13 C 42 22,38 55,5 62 C -3 37,20 22,0 2 C -18 -15,-8 -48,12 -70 Z" fill="#62c076"/>
          <path d="M 67 -6 C 95 1,104 28,84 48 C 70 37,58 23,67 -6 Z" fill="#62c076"/>
        </g>
        <circle cx="0" cy="0" r="105" fill="none" stroke="#c7d2fe" stroke-width="2"/>
        <circle cx="0" cy="${latitudeY}" r="5.5" fill="#ff4d4f" stroke="#fff" stroke-width="2"/>
      </g>
      <text x="22" y="184" fill="#ffec99" font-size="15">Sun rays</text>
      <text x="300" y="342" fill="#e2e8f0" font-size="14">Earth axis tilted 23.44°</text>
      <text x="260" y="38" fill="#e2e8f0" font-size="14">Seasonal declination today: ${declination.toFixed(1)}°</text>
      <text x="294" y="286" fill="#e2e8f0" font-size="14">Selected latitude: ${options.latitude.toFixed(2)}°</text>
    </svg>`;
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
