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

  function gaClientId() {
    var match = document.cookie.match(/(?:^|; )_ga=GA\d+\.\d+\.([^;]+)/);
    return match ? match[1] : '';
  }

  function sendGa4ContactEvent(eventName, payload) {
    if (eventName !== 'phone_click' && eventName !== 'whatsapp_click') return;
    var params = {
      v: '2',
      tid: 'G-4QJX5C6RZR',
      cid: gaClientId(),
      en: eventName,
      dl: window.location.href,
      dt: document.title,
      dp: window.location.pathname
    };
    if (!params.cid) return;

    [
      'phone_number',
      'phone_destination_type',
      'page_path',
      'cta_location',
      'lot_address',
      'lot_slug',
      'lot_block',
      'lot_number',
      'listing_agent',
      'listing_firm'
    ].forEach(function (key) {
      if (payload[key]) params['ep.' + key] = payload[key];
    });

    var body = Object.keys(params).map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
    }).join('&');
    var url = 'https://www.google-analytics.com/g/collect?' + body;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, '');
    } else if (window.fetch) {
      window.fetch(url, { method: 'POST', keepalive: true, mode: 'no-cors' });
    }
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
    sendGa4ContactEvent(eventName, payload);

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
