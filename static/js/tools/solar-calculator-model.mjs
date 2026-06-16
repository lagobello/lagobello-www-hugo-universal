const SOLAR_CONSTANT_KW_PER_M2 = 1.367;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInYear(year) {
  return isLeapYear(year) ? 366 : 365;
}

export function dayOfYearToDate(year, dayOfYear) {
  const date = new Date(Date.UTC(year, 0, dayOfYear));
  return date.toISOString().slice(0, 10);
}

export function dateToDayOfYear(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.floor((date - start) / 86400000) + 1;
}

export function solarDeclination(dayOfYear) {
  // Cooper-style approximation. Around June solstice this is +23.44°; around
  // December solstice it is -23.44°.
  return 23.44 * DEG_TO_RAD * Math.sin((2 * Math.PI * (dayOfYear - 80)) / 365);
}

export function inverseEarthSunDistance(dayOfYear) {
  return 1 + 0.033 * Math.cos((2 * Math.PI * dayOfYear) / 365);
}

export function sunsetHourAngle(latitudeRad, declinationRad) {
  const argument = -Math.tan(latitudeRad) * Math.tan(declinationRad);
  return Math.acos(Math.max(-1, Math.min(1, argument)));
}

export function extraterrestrialDailyIrradiation({ latitude, dayOfYear }) {
  const phi = latitude * DEG_TO_RAD;
  const delta = solarDeclination(dayOfYear);
  const dr = inverseEarthSunDistance(dayOfYear);
  const omegaS = sunsetHourAngle(phi, delta);
  const geometricTerm =
    omegaS * Math.sin(phi) * Math.sin(delta) +
    Math.cos(phi) * Math.cos(delta) * Math.sin(omegaS);

  // H0 in kWh/m²/day from FAO-56 solar geometry form. This is top-of-atmosphere
  // energy on a horizontal plane, not yet accounting for clouds/aerosols.
  return ((24 * 60) / Math.PI) * 0.0820 * dr * geometricTerm / 3.6;
}

export function dailySolarModel({ latitude, longitude = 0, year, clearnessIndex = 0.56 }) {
  const count = daysInYear(year);
  return Array.from({ length: count }, (_, index) => {
    const dayOfYear = index + 1;
    const extraterrestrial = extraterrestrialDailyIrradiation({ latitude, dayOfYear });
    const seasonalCloudFactor = 1 + 0.08 * Math.sin((2 * Math.PI * (dayOfYear - 110)) / count);
    const irradiation = Math.max(0, extraterrestrial * clearnessIndex * seasonalCloudFactor);
    return {
      date: dayOfYearToDate(year, dayOfYear),
      dayOfYear,
      irradiation: round(irradiation, 3),
      extraterrestrial: round(extraterrestrial, 3),
      declinationDegrees: round(solarDeclination(dayOfYear) * RAD_TO_DEG, 2),
      source: 'model',
      latitude,
      longitude,
    };
  });
}

export function nasaDailyUrl({ latitude, longitude, year }) {
  const start = `${year}0101`;
  const end = `${year}1231`;
  const params = new URLSearchParams({
    start,
    end,
    latitude: String(latitude),
    longitude: String(longitude),
    community: 'ag',
    parameters: 'ALLSKY_SFC_SW_DWN',
    format: 'json',
    header: 'true',
    'time-standard': 'utc',
  });
  return `https://power.larc.nasa.gov/api/temporal/daily/point?${params.toString()}`;
}

export function nasaDailyToSeries(json) {
  const values = json?.properties?.parameter?.ALLSKY_SFC_SW_DWN;
  if (!values || typeof values !== 'object') {
    throw new Error('NASA POWER response did not contain ALLSKY_SFC_SW_DWN daily values');
  }

  return Object.entries(values)
    .filter(([, value]) => Number.isFinite(Number(value)) && Number(value) > -900)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yyyymmdd, value]) => {
      const date = `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
      return {
        date,
        dayOfYear: dateToDayOfYear(date),
        irradiation: round(Number(value), 3),
        source: 'nasa',
      };
    });
}

export async function fetchNasaDailySeries({ latitude, longitude, year, fetchImpl = fetch }) {
  const url = nasaDailyUrl({ latitude, longitude, year });
  const response = await fetchImpl(url, { cache: 'no-store', mode: 'cors', redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`NASA POWER request failed with HTTP ${response.status}`);
  }
  return nasaDailyToSeries(await response.json());
}

export function summarizeEnergy(series, options) {
  const panelCount = Number(options.panelCount);
  const panelArea = Number(options.panelArea);
  const panelEfficiency = Number(options.panelEfficiency);
  const electricityPrice = Number(options.electricityPrice);
  const performanceRatio = Number(options.performanceRatio ?? 0.85);
  const systemArea = panelCount * panelArea;

  const daily = series.map((point) => {
    const kwh = point.irradiation * systemArea * panelEfficiency * performanceRatio;
    return {
      date: point.date,
      label: point.date,
      irradiation: point.irradiation,
      kwh: round(kwh, 4),
      value: round(kwh * electricityPrice, 4),
    };
  });

  const monthly = aggregateSeries(daily, 'monthly');
  const yearlyRows = aggregateSeries(daily, 'yearly');
  return {
    daily,
    monthly,
    yearly: yearlyRows[0] ?? { label: String(options.year ?? ''), kwh: 0, value: 0 },
    systemArea: round(systemArea, 3),
    dcSizeKw: round(systemArea * panelEfficiency, 3),
  };
}

export function aggregateSeries(daily, period) {
  if (period === 'daily') {
    return daily.map((d) => ({ ...d, label: formatDateLabel(d.date) }));
  }

  const groups = new Map();
  for (const point of daily) {
    const key = period === 'yearly' ? point.date.slice(0, 4) : point.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, { key, kwh: 0, value: 0, irradiation: 0, days: 0 });
    const group = groups.get(key);
    group.kwh += point.kwh;
    group.value += point.value;
    group.irradiation += point.irradiation ?? 0;
    group.days += 1;
  }

  return Array.from(groups.values()).map((group) => ({
    label: period === 'yearly' ? group.key : formatMonthLabel(group.key),
    date: group.key,
    month: period === 'monthly' ? group.key : undefined,
    year: period === 'yearly' ? group.key : group.key.slice(0, 4),
    kwh: round(group.kwh, 4),
    value: round(group.value, 4),
    irradiation: round(group.irradiation / Math.max(1, group.days), 4),
  }));
}

export function buildPanelArray({ panelCount, columns = 6, panelWidth = 1.1, panelHeight = 1.8, gap = 0.25 }) {
  const count = Math.max(0, Math.floor(Number(panelCount) || 0));
  const cols = Math.max(1, Math.floor(Number(columns) || 1));
  return Array.from({ length: count }, (_, index) => {
    const column = index % cols;
    const row = Math.floor(index / cols);
    return {
      x: round(column * (panelWidth + gap), 3),
      y: round(row * (panelHeight + gap), 3),
      width: panelWidth,
      height: panelHeight,
      index: index + 1,
    };
  });
}

function formatDateLabel(date) {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatMonthLabel(month) {
  const d = new Date(`${month}-01T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function round(value, digits = 2) {
  const scale = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * scale) / scale;
}
