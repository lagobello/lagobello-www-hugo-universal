const META_PIXEL_ID = '1175586507649646';
const DEFAULT_ORIGIN = 'https://www.lagobello.com';
const ALLOWED_ORIGINS = new Set([
  'https://www.lagobello.com',
  'https://lagobello.com',
  'https://lb-hermes.pve1.figvic.com',
]);

const META_EVENT_NAMES = {
  page_view: 'PageView',
  PageView: 'PageView',
  phone_click: 'Contact',
  whatsapp_click: 'Contact',
  email_click: 'Contact',
  contact_submit: 'Lead',
  form_submit: 'Lead',
  view_lot: 'ViewContent',
};

const CUSTOM_DATA_FIELDS = [
  'page_path',
  'phone_number',
  'phone_destination_type',
  'cta_location',
  'link_url',
  'link_text',
  'lot_address',
  'lot_slug',
  'lot_block',
  'lot_number',
  'listing_agent',
  'listing_firm',
];

const SAFE_META_CUSTOM_DATA_FIELDS = CUSTOM_DATA_FIELDS.filter((field) => field !== 'phone_number');

function cleanString(value, maxLength = 300) {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, maxLength);
}

function currentEventTime() {
  return Math.floor(Date.now() / 1000);
}

function allowedOrigin(origin) {
  return ALLOWED_ORIGINS.has(origin) ? origin : DEFAULT_ORIGIN;
}

function pickCustomData(event, fields) {
  const customData = {};
  fields.forEach((field) => {
    const value = cleanString(event[field]);
    if (value) customData[field] = value;
  });
  return customData;
}

export function normalizeIncomingEvent(rawEvent = {}) {
  const event = cleanString(rawEvent.event || rawEvent.event_name, 80);
  const metaEventName = META_EVENT_NAMES[event] || '';
  if (!event || !metaEventName) {
    throw new Error('unsupported_event');
  }

  const eventId = cleanString(rawEvent.event_id, 120);
  if (!eventId) {
    throw new Error('missing_event_id');
  }

  const eventTime = Number(rawEvent.event_time) || currentEventTime();
  const eventSourceUrl = cleanString(rawEvent.event_source_url || rawEvent.source_url, 500);

  return {
    event,
    metaEventName,
    event_id: eventId,
    event_time: eventTime,
    event_source_url: eventSourceUrl,
    action_source: 'website',
    custom_data: pickCustomData(rawEvent, CUSTOM_DATA_FIELDS),
    raw: rawEvent,
  };
}

export function buildMetaEvent(rawEvent = {}, clientIp = '', userAgent = '') {
  const normalized = normalizeIncomingEvent(rawEvent);
  const userData = {};
  const fbp = cleanString(rawEvent.fbp, 200);
  const fbc = cleanString(rawEvent.fbc, 200);
  if (clientIp) userData.client_ip_address = cleanString(clientIp, 120);
  if (userAgent) userData.client_user_agent = cleanString(userAgent, 500);
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  return {
    event_name: normalized.metaEventName,
    event_time: normalized.event_time,
    event_id: normalized.event_id,
    event_source_url: normalized.event_source_url,
    action_source: normalized.action_source,
    user_data: userData,
    custom_data: pickCustomData(rawEvent, SAFE_META_CUSTOM_DATA_FIELDS),
  };
}

export function jsonResponse(body, status = 200, origin = DEFAULT_ORIGIN) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': allowedOrigin(origin),
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'cache-control': 'no-store',
    },
  });
}

async function readJson(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('expected_json');
  }
  return request.json();
}

function clientIpFromRequest(request) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '';
}

async function forwardToMeta(env, event) {
  const accessToken = env.META_WEB_PAGE_VISITS_CAPI_ACCESS_TOKEN || env.META_CAPI_ACCESS_TOKEN;
  const pixelId = env.META_WEB_PAGE_VISITS_PIXEL_ID || META_PIXEL_ID;
  if (!accessToken) {
    return { skipped: true, reason: 'missing_meta_access_token' };
  }

  const endpoint = `https://graph.facebook.com/v20.0/${encodeURIComponent(pixelId)}/events`;
  const body = {
    data: [event],
  };
  if (env.META_TEST_EVENT_CODE) {
    body.test_event_code = env.META_TEST_EVENT_CODE;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const responseBody = await response.text();
  if (!response.ok) {
    return { ok: false, status: response.status, body: responseBody.slice(0, 500) };
  }

  return { ok: true, status: response.status };
}

export async function onRequest(context) {
  const { request, env = {} } = context;
  const origin = request.headers.get('origin') || DEFAULT_ORIGIN;

  if (request.method === 'OPTIONS') {
    return jsonResponse({ ok: true }, 204, origin);
  }

  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405, origin);
  }

  try {
    const payload = await readJson(request);
    const event = buildMetaEvent(payload, clientIpFromRequest(request), request.headers.get('user-agent') || '');
    const meta = await forwardToMeta(env, event);
    const accepted = meta.ok || meta.skipped;
    return jsonResponse({ ok: accepted, forwarded: Boolean(meta.ok), meta }, accepted ? 202 : 502, origin);
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || 'track_failed' }, 400, origin);
  }
}
