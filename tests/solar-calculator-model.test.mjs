import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aggregateSeries,
  buildPanelArray,
  dailySolarModel,
  nasaDailyToSeries,
  summarizeEnergy,
} from '../static/js/tools/solar-calculator-model.mjs';

test('dailySolarModel returns 365 daily values with stronger South Texas summer sun than winter', () => {
  const series = dailySolarModel({ latitude: 26.053, longitude: -97.553, year: 2025 });

  assert.equal(series.length, 365);
  assert.equal(series[0].date, '2025-01-01');
  assert.equal(series.at(-1).date, '2025-12-31');

  const jan = series.find((d) => d.date === '2025-01-15').irradiation;
  const jun = series.find((d) => d.date === '2025-06-15').irradiation;

  assert.ok(jan > 2.0 && jan < 5.5, `January model should be plausible, got ${jan}`);
  assert.ok(jun > jan, `June irradiation ${jun} should exceed January ${jan} at 26°N`);
  assert.ok(jun < 9.0, `June model should remain plausible, got ${jun}`);
});

test('dailySolarModel returns leap-year 366 values', () => {
  const series = dailySolarModel({ latitude: 26.053, longitude: -97.553, year: 2024 });
  assert.equal(series.length, 366);
  assert.equal(series.at(-1).date, '2024-12-31');
});

test('nasaDailyToSeries maps NASA POWER daily JSON to sorted daily irradiation values', () => {
  const json = {
    properties: {
      parameter: {
        ALLSKY_SFC_SW_DWN: {
          20250103: 4.2,
          20250101: 3.1,
          20250102: -999,
        },
      },
    },
  };

  assert.deepEqual(nasaDailyToSeries(json), [
    { date: '2025-01-01', dayOfYear: 1, irradiation: 3.1, source: 'nasa' },
    { date: '2025-01-03', dayOfYear: 3, irradiation: 4.2, source: 'nasa' },
  ]);
});

test('summarizeEnergy calculates daily, monthly, and yearly kWh and value from daily values', () => {
  const series = [
    { date: '2025-01-01', irradiation: 5 },
    { date: '2025-01-02', irradiation: 4 },
    { date: '2025-02-01', irradiation: 6 },
  ];

  const summary = summarizeEnergy(series, {
    panelCount: 10,
    panelArea: 2,
    panelEfficiency: 0.2,
    electricityPrice: 0.12,
    performanceRatio: 0.85,
  });

  assert.equal(summary.daily.length, 3);
  assert.equal(summary.daily[0].kwh.toFixed(2), '17.00');
  assert.equal(summary.monthly.find((m) => m.month === '2025-01').kwh.toFixed(2), '30.60');
  assert.equal(summary.yearly.kwh.toFixed(2), '51.00');
  assert.equal(summary.yearly.value.toFixed(2), '6.12');
});

test('aggregateSeries can output daily, monthly, and yearly values', () => {
  const daily = [
    { date: '2025-01-01', kwh: 1, value: 0.1 },
    { date: '2025-01-02', kwh: 2, value: 0.2 },
    { date: '2025-02-01', kwh: 3, value: 0.3 },
  ];

  assert.equal(aggregateSeries(daily, 'daily').length, 3);
  assert.deepEqual(aggregateSeries(daily, 'monthly').map((d) => [d.label, d.kwh]), [['Jan 2025', 3], ['Feb 2025', 3]]);
  assert.deepEqual(aggregateSeries(daily, 'yearly').map((d) => [d.label, d.kwh]), [['2025', 6]]);
});

test('buildPanelArray creates simple ground-array panel rectangles in rows', () => {
  const panels = buildPanelArray({ panelCount: 7, columns: 4, panelWidth: 1.1, panelHeight: 1.8, gap: 0.25 });

  assert.equal(panels.length, 7);
  assert.deepEqual(panels[0], { x: 0, y: 0, width: 1.1, height: 1.8, index: 1 });
  assert.equal(panels[4].y, 2.05);
});
