(function () {
  'use strict';

  var LAGO_BELLO_PHONE = '19563055246';
  var LAGO_BELLO_WHATSAPP = '19563055246';

  function closestLink(target) {
    if (!target) return null;
    if (target.closest) return target.closest('a[href]');
    while (target && target.tagName !== 'A') target = target.parentNode;
    return target && target.href ? target : null;
  }

  function normalizePhone(value) {
    var digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 10) digits = '1' + digits;
    return digits;
  }

  function e164(value) {
    var digits = normalizePhone(value);
    return digits ? '+' + digits : '';
  }

  function phoneDestinationType(digits, explicitType) {
    if (explicitType) return explicitType;
    if (digits === LAGO_BELLO_PHONE || digits === LAGO_BELLO_WHATSAPP) return 'lago_bello';
    return digits ? 'realtor' : 'unknown';
  }

  function inferEventName(link, href) {
    if (link.dataset.trackEvent) return link.dataset.trackEvent;
    if (href.indexOf('tel:') === 0) return 'phone_click';
    if (href.indexOf('mailto:') === 0) return 'email_click';
    if (/wa\.me|whatsapp\.com/i.test(href)) return 'whatsapp_click';
    return '';
  }

  function payloadFor(link, eventName, href) {
    var rawPhone = link.dataset.phoneNumber || '';
    if (!rawPhone && eventName === 'phone_click') rawPhone = href.replace(/^tel:/i, '');
    if (!rawPhone && eventName === 'whatsapp_click') {
      var waMatch = href.match(/wa\.me\/(\d+)/i) || href.match(/[?&]phone=(\d+)/i);
      rawPhone = waMatch ? waMatch[1] : '';
    }

    var digits = normalizePhone(rawPhone);
    var payload = {
      event: eventName,
      page_path: window.location.pathname,
      link_url: href,
      cta_location: link.dataset.ctaLocation || '',
      link_text: (link.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120)
    };

    if (digits) {
      payload.phone_number = e164(digits);
      payload.phone_destination_type = phoneDestinationType(digits, link.dataset.phoneDestinationType || '');
    }

    [
      'lotAddress',
      'lotSlug',
      'lotBlock',
      'lotNumber',
      'listingAgent',
      'listingFirm'
    ].forEach(function (key) {
      var dataKey = key.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); });
      if (link.dataset[key]) payload[dataKey.replace(/-/g, '_')] = link.dataset[key];
    });

    return payload;
  }

  function metaEventName(eventName) {
    if (eventName === 'phone_click' || eventName === 'whatsapp_click' || eventName === 'email_click') return 'Contact';
    if (eventName === 'contact_submit') return 'Lead';
    if (eventName === 'view_lot') return 'ViewContent';
    return '';
  }

  document.addEventListener('click', function (event) {
    var link = closestLink(event.target);
    if (!link) return;

    var href = link.getAttribute('href') || '';
    var eventName = inferEventName(link, href);
    if (!eventName) return;

    var payload = payloadFor(link, eventName, href);
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);

    if (typeof window.fbq === 'function') {
      var standardEvent = metaEventName(eventName);
      if (standardEvent) {
        window.fbq('track', standardEvent, payload);
      } else {
        window.fbq('trackCustom', eventName, payload);
      }
    }
  });
})();
