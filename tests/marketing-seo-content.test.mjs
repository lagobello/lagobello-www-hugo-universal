import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('solar page targets Texas/Brownsville solar queries and drives lot-sale leads', () => {
  const solar = read('content/tools/solar.md');

  assert.match(solar, /title = "Texas Solar Calculator for Brownsville Homes and Lots"/);
  assert.match(solar, /Google Solar Calculator alternative/i);
  assert.match(solar, /Solar energy calculator for Texas homes/i);
  assert.match(solar, /solar-ready home in Brownsville/i);
  assert.match(solar, /planning a solar-ready home in Brownsville/i);
  assert.match(solar, /https:\/\/wa\.me\/19563055246/);
  assert.match(solar, /data-cta-location="solar_page_cta"/);
  assert.match(solar, /\/lots-for-sale-brownsville-tx\//);
});

test('lots and builders pages link visitors into the solar and Brownsville lot funnels', () => {
  const lotsLayout = read('layouts/lots/list.html');
  const builders = read('content/builders.md');
  const home = read('layouts/index.html');

  assert.match(lotsLayout, /solar-ready homesite/i);
  assert.match(lotsLayout, /href="{{ "\/tools\/solar\/" \| relURL }}"/);
  assert.match(lotsLayout, /href="{{ "\/lots-for-sale-brownsville-tx\/" \| relURL }}"/);
  assert.match(builders, /solar-ready lot planning/i);
  assert.match(builders, /\/lots-for-sale-brownsville-tx\//);
  assert.match(home, /Texas solar calculator/i);
  assert.match(home, /\/tools\/solar\//);
});

test('dedicated Brownsville lots landing page exists with local SEO, CTA, and available-lot context', () => {
  assert.equal(existsSync(new URL('../content/lots-for-sale-brownsville-tx.md', import.meta.url)), true);
  const page = read('content/lots-for-sale-brownsville-tx.md');

  assert.match(page, /title = "Residential Lots for Sale in Brownsville, TX"/);
  assert.match(page, /url = "\/lots-for-sale-brownsville-tx\/"/);
  assert.match(page, /land for sale Brownsville TX/i);
  assert.match(page, /buildable lots Brownsville/i);
  assert.match(page, /Olmito TX/i);
  assert.match(page, /current Lago Bello availability/i);
  assert.match(page, /https:\/\/wa\.me\/19563055246/);
  assert.match(page, /data-cta-location="brownsville_lots_landing"/);
  assert.match(page, /\/lots\//);
});
