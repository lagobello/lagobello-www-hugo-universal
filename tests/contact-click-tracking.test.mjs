import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

function runTrackingScript({ cookie = '_ga=GA1.1.111222333.444555666' } = {}) {
  const fetchCalls = [];
  const beaconCalls = [];
  const dataLayer = [];
  const fbqCalls = [];
  const listeners = {};

  const script = fs.readFileSync(path.resolve('static/js/contact-click-tracking.js'), 'utf8');
  const window = {
    location: {
      href: 'https://www.lagobello.com/contact/',
      pathname: '/contact/',
    },
    dataLayer,
    fetch(url, options) {
      fetchCalls.push({ url, options });
      return Promise.resolve({ ok: true });
    },
    fbq(...args) {
      fbqCalls.push(args);
    },
  };
  const document = {
    title: 'Contact Lago Bello',
    cookie,
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
  };
  const navigator = {
    sendBeacon(url, body) {
      beaconCalls.push({ url, body });
      return true;
    },
  };

  vm.runInNewContext(script, { window, document, navigator, console });

  return { window, document, navigator, listeners, fetchCalls, beaconCalls, dataLayer, fbqCalls };
}

function fakeLink() {
  return {
    tagName: 'A',
    href: 'tel:+19563055246',
    textContent: 'Call Lago Bello',
    dataset: {
      ctaLocation: 'topbar_text',
      phoneNumber: '+19563055246',
      phoneDestinationType: 'lago_bello',
    },
    getAttribute(name) {
      return name === 'href' ? 'tel:+19563055246' : '';
    },
  };
}

test('contact tracking adds a stable event_id and event_time before dispatch', () => {
  const harness = runTrackingScript();
  const link = fakeLink();

  harness.listeners.click({ target: { closest: () => link } });

  assert.equal(harness.dataLayer.length, 1);
  assert.match(harness.dataLayer[0].event_id, /^lb_phone_click_\d+_[a-z0-9]+$/);
  assert.equal(typeof harness.dataLayer[0].event_time, 'number');
  assert.equal(harness.dataLayer[0].event_source_url, 'https://www.lagobello.com/contact/');
  assert.equal(harness.fbqCalls[0][3].eventID, harness.dataLayer[0].event_id);
});

test('contact tracking posts conversion events to the Cloudflare server endpoint', () => {
  const harness = runTrackingScript();
  const link = fakeLink();

  harness.listeners.click({ target: { closest: () => link } });

  const serverCall = harness.fetchCalls.find((call) => call.url === '/api/track');
  assert.ok(serverCall);
  assert.equal(serverCall.options.method, 'POST');
  assert.equal(serverCall.options.keepalive, true);
  assert.equal(serverCall.options.headers['content-type'], 'application/json');
  const body = JSON.parse(serverCall.options.body);
  assert.equal(body.event, 'phone_click');
  assert.equal(body.event_id, harness.dataLayer[0].event_id);
  assert.equal(body.phone_number, '+19563055246');
  assert.equal(body.phone_destination_type, 'lago_bello');
  assert.equal(body.event_source_url, 'https://www.lagobello.com/contact/');
});

test('contact tracking suppresses duplicate clicks from the same CTA window', () => {
  const harness = runTrackingScript();
  const link = fakeLink();

  harness.listeners.click({ target: { closest: () => link } });
  harness.listeners.click({ target: { closest: () => link } });

  assert.equal(harness.dataLayer.length, 1);
  assert.equal(harness.fetchCalls.filter((call) => call.url === '/api/track').length, 1);
  assert.equal(harness.fbqCalls.length, 1);
});

test('direct GA4 dispatch only sends legacy key-event aliases', () => {
  const harness = runTrackingScript();
  const link = fakeLink();

  harness.listeners.click({ target: { closest: () => link } });

  assert.equal(harness.beaconCalls.length, 1);
  const beaconUrl = new URL(harness.beaconCalls[0].url);
  assert.equal(beaconUrl.searchParams.get('en'), 'call_main_phone');
});
