import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMetaEvent,
  jsonResponse,
  normalizeIncomingEvent,
  onRequest,
} from '../functions/api/track.js';

test('normalizes website contact click events for server-side forwarding', () => {
  const normalized = normalizeIncomingEvent({
    event: 'phone_click',
    event_id: 'lb_phone_click_abc123',
    event_time: 1781548000,
    event_source_url: 'https://www.lagobello.com/contact/',
    page_path: '/contact/',
    phone_number: '+19563055246',
    phone_destination_type: 'lago_bello',
    cta_location: 'topbar_text',
    link_url: 'tel:+19563055246',
  });

  assert.equal(normalized.event, 'phone_click');
  assert.equal(normalized.metaEventName, 'Contact');
  assert.equal(normalized.event_id, 'lb_phone_click_abc123');
  assert.equal(normalized.event_time, 1781548000);
  assert.equal(normalized.event_source_url, 'https://www.lagobello.com/contact/');
  assert.equal(normalized.action_source, 'website');
  assert.deepEqual(normalized.custom_data, {
    page_path: '/contact/',
    phone_number: '+19563055246',
    phone_destination_type: 'lago_bello',
    cta_location: 'topbar_text',
    link_url: 'tel:+19563055246',
  });
});

test('builds a Meta CAPI event with deduplication event_id and safe custom data', () => {
  const metaEvent = buildMetaEvent({
    event: 'whatsapp_click',
    event_id: 'lb_whatsapp_click_xyz789',
    event_time: 1781548123,
    event_source_url: 'https://www.lagobello.com/lots/1304-giuseppe-verdi-ave/',
    page_path: '/lots/1304-giuseppe-verdi-ave/',
    phone_number: '+19563055246',
    phone_destination_type: 'lago_bello',
    lot_slug: '1304-giuseppe-verdi-ave',
    fbp: 'fb.1.123.456',
    fbc: 'fb.1.123.abcdef',
  }, '203.0.113.10', 'Test User Agent');

  assert.equal(metaEvent.event_name, 'Contact');
  assert.equal(metaEvent.event_id, 'lb_whatsapp_click_xyz789');
  assert.equal(metaEvent.event_time, 1781548123);
  assert.equal(metaEvent.event_source_url, 'https://www.lagobello.com/lots/1304-giuseppe-verdi-ave/');
  assert.equal(metaEvent.action_source, 'website');
  assert.equal(metaEvent.user_data.client_ip_address, '203.0.113.10');
  assert.equal(metaEvent.user_data.client_user_agent, 'Test User Agent');
  assert.equal(metaEvent.user_data.fbp, 'fb.1.123.456');
  assert.equal(metaEvent.user_data.fbc, 'fb.1.123.abcdef');
  assert.equal(metaEvent.custom_data.phone_number, undefined);
  assert.equal(metaEvent.custom_data.lot_slug, '1304-giuseppe-verdi-ave');
  assert.equal(metaEvent.custom_data.phone_destination_type, 'lago_bello');
});

test('returns CORS JSON responses for browser beacon callers', async () => {
  const response = jsonResponse({ ok: true }, 202, 'https://www.lagobello.com');

  assert.equal(response.status, 202);
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://www.lagobello.com');
  assert.deepEqual(await response.json(), { ok: true });
});

test('handles CORS preflight without a 204 response body', async () => {
  const response = await onRequest({
    request: new Request('https://www.lagobello.com/api/track', {
      method: 'OPTIONS',
      headers: { origin: 'https://www.lagobello.com' },
    }),
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://www.lagobello.com');
  assert.deepEqual(await response.json(), { ok: true });
});
