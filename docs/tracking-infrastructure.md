# Lago Bello website tracking

This document is a public-safe implementation map for Lago Bello website tracking. It describes the event contract used by the website code. Jira should remain the place for internal work planning, priorities, vendor/account diagnostics, credentials, and operational notes.

## Current client-side implementation

- Site click tracking code: `static/js/contact-click-tracking.js`
- Hugo tracking config: `config.toml` under `[params]`
- Tracking partials:
  - `themes/hugo-universal-theme/layouts/partials/gtm-head.html`
  - `themes/hugo-universal-theme/layouts/partials/meta-pixel-head.html`
  - `themes/hugo-universal-theme/layouts/partials/facebook-verification.html`

Public measurement/container IDs may appear in source because browser tags require them. They are identifiers, not credentials. Never commit access tokens, API secrets, private test codes, or account screenshots.

## Current tracked website events

### `phone_click`

Triggered by Lago Bello and listing `tel:` links.

Expected parameters:

- `phone_number`
- `phone_destination_type` (`lago_bello`, `listing`, `realtor`, or `unknown`)
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

### `whatsapp_click`

Triggered by WhatsApp links.

Expected parameters are the same as `phone_click` where applicable.

### `email_click`

Triggered by `mailto:` links.

Expected parameters:

- `page_path`
- `cta_location`
- `link_url`
- `link_text`

## Destinations

Tracked events may be sent to one or more of:

- `window.dataLayer` for GTM/debugging
- GA4 browser collection
- Meta Pixel browser events
- server-side forwarding endpoint, when deployed

## Server-side tracking contract

If server-side forwarding is enabled, the endpoint should:

1. Accept only supported website events.
2. Require `event_id` for deduplication.
3. Keep credentials in the server/platform environment only.
4. Forward supported events to conversion platforms without exposing secrets client-side.
5. Return generic success/failure responses to the browser; detailed vendor diagnostics belong in private logs, not public responses.

Supported semantic mappings:

- page view -> page-view conversion event
- phone/WhatsApp/email click -> contact conversion event
- contact form submit -> lead conversion event
- lot page view -> content-view conversion event

## Privacy and public-number rules

- Public CTA phone/WhatsApp numbers may appear in source because users need to click them.
- Do not document or reintroduce retired/private numbers in public source, content, or docs.
- Do not expose server-side conversion tokens, GA4 API secrets, Meta CAPI tokens, private test-event codes, or raw lead PII in client JavaScript or public docs.

## Verification checklist for tracking changes

Before deployment:

1. Build the Hugo site locally.
2. Verify `window.dataLayer` receives the expected event and parameters.
3. Inspect outgoing GA4/browser collection requests and confirm event parameters are real values.
4. Inspect Meta Pixel/browser event calls.
5. Confirm no private/retired contact information appears in public source.

After deployment:

1. Test on production, not only preview.
2. Confirm analytics debug tools receive the expected events.
3. Confirm conversion/key-event reporting is usable.
4. If server-side forwarding exists, confirm browser/server deduplication works.
