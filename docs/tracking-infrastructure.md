# Lago Bello tracking infrastructure

This document is the implementation map for Lago Bello website tracking. Jira should track the work items and acceptance criteria; this file should track the code-level contract so future changes do not break reporting.

## Current client-side implementation

- Production site: `https://www.lagobello.com/`
- GTM container: `GTM-5QTTZD85`
- GA4 measurement ID: `G-4QJX5C6RZR`
- Meta Pixel / dataset: `1175586507649646`
- Google Ads tag observed live: `17750216203`
- Site click tracking code: `static/js/contact-click-tracking.js`
- Hugo tracking config: `config.toml` under `[params]`
- Tracking partials:
  - `themes/hugo-universal-theme/layouts/partials/gtm-head.html`
  - `themes/hugo-universal-theme/layouts/partials/meta-pixel-head.html`
  - `themes/hugo-universal-theme/layouts/partials/facebook-verification.html`

## Current tracked website events

### `phone_click`

Triggered by Lago Bello and listing/realtor `tel:` links.

Expected parameters:

- `phone_number`
- `phone_destination_type` (`lago_bello`, `realtor`, or `unknown`)
- `page_path`
- `cta_location`
- `link_url`
- `link_text`
- lot metadata when available:
  - `lot_address`
  - `lot_slug`
  - `lot_block`
  - `lot_number`
- listing metadata when available:
  - `listing_agent`
  - `listing_firm`

Current destinations:

- `window.dataLayer`
- direct GA4 `/g/collect`
- Meta Pixel as standard `Contact`

### `whatsapp_click`

Triggered by WhatsApp links.

Expected Lago Bello public number:

- `+19563055246`

Expected parameters are the same as `phone_click` where applicable.

Current destinations:

- `window.dataLayer`
- direct GA4 `/g/collect`
- Meta Pixel as standard `Contact`

### `email_click`

Triggered by `mailto:` links.

Current destinations:

- `window.dataLayer`
- direct GA4 `/g/collect`
- Meta Pixel as standard `Contact`

## Reporting contract

GA4 should treat at least these as lead/key events after verification:

- `phone_click`
- `whatsapp_click`
- verified contact form submit / HubSpot submit event

Legacy/alias events that may exist for Google Ads or GA4 reporting continuity:

- `call_main_phone`
- `call_realtor`
- `email_info_lagobello`

Do not remove aliases until GA4/Google Ads reporting confirms they are no longer needed.

## Server-side tracking implementation

Chosen path: **Cloudflare Pages Function** at `functions/api/track.js`, exposed as `/api/track` when deployed by Cloudflare Pages.

Current behavior:

1. `static/js/contact-click-tracking.js` adds `event_id`, `event_time`, and `event_source_url` before dispatching tracked contact clicks.
2. Meta Pixel receives the same `event_id` as the fourth `fbq` argument (`{ eventID: ... }`) so browser Pixel and server CAPI events can deduplicate.
3. The browser posts the sanitized event payload to `/api/track` using `fetch(..., { keepalive: true })`.
4. The Pages Function forwards supported events to Meta CAPI without exposing access tokens client-side.
5. The Pages Function reads these Cloudflare/server environment variables:
   - `META_WEB_PAGE_VISITS_CAPI_ACCESS_TOKEN` (preferred)
   - `META_CAPI_ACCESS_TOKEN` (fallback)
   - `META_WEB_PAGE_VISITS_PIXEL_ID` (optional; defaults to `1175586507649646`)
   - `META_TEST_EVENT_CODE` (optional for Events Manager test mode)
6. GA4 remains browser-side for now via direct `/g/collect` contact events and legacy alias events. Add GA4 Measurement Protocol later only if DebugView/key-event/Ads import checks show browser-side reporting is insufficient.

Still to verify after deployment:

1. Cloudflare Pages deploy includes `functions/api/track.js` and `/api/track` accepts POSTs.
2. Meta Events Manager/Test Events receives server-side `Contact` events.
3. Meta deduplicates Pixel/CAPI events using `event_id`.
4. GA4 DebugView/key-event reporting remains clean for `phone_click`, `whatsapp_click`, and verified form submit events.
5. Google Ads conversion action/import status is documented.

## Privacy and public-number rules

- Public Lago Bello WhatsApp/phone CTA number: `+19563055246`.
- Do not reintroduce the retired/sensitive Lago Bello WhatsApp/Tello number in public website source, content, or docs.
- Do not expose Meta CAPI tokens, GA4 API secrets, or other server-side credentials in client JavaScript.

## Verification checklist for tracking changes

Before deployment:

1. Build the Hugo site locally.
2. Verify `window.dataLayer` receives the expected event and parameters.
3. Inspect outgoing GA4 `/g/collect` requests and confirm `ep.*` parameters are real values, not `false` placeholders.
4. Inspect Meta Pixel requests or `fbq` calls.
5. Confirm no sensitive retired public WhatsApp/Tello number appears in public source.

After deployment:

1. Test on production `www.lagobello.com`, not only preview.
2. Confirm GA4 DebugView receives events.
3. Confirm Meta Events Manager/Test Events receives events.
4. Confirm GA4 key-event/conversion reporting is usable.
5. If server-side CAPI exists, confirm browser/server deduplication works.
