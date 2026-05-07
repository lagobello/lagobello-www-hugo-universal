// lots-table.js — Handles the lots table. Vanilla JS (no jQuery).
// Reads /data/lots.json, sets `window.lotsData`, renders a sortable / filterable
// table into #lot-table, and bridges row clicks to the map via window.focusLotByName.

var tableDisplayState = {
  filters: {
    location: '',
    status: ''
  },
  sort: { column: 'List Price', order: 'asc' }
};

var companyLogos = {
  'coldwell banker': 'coldwell-banker-logo.svg',
  'keller williams': 'keller-williams-logo.svg',
  'liz realty': 'liz-realty-logo.jpg',
  'spi realty': 'spi-realty-logo.png',
  'lago bello': '../lago-logo-500-500.png'
};

function sortLotsData(lotsArray, columnKey, order) {
  return lotsArray.sort(function (a, b) {
    var valA = a[columnKey];
    var valB = b[columnKey];

    if (columnKey === 'List Price' || columnKey === 'Size [sqft]' || columnKey === 'Sale Price') {
      valA = parseFloat(valA);
      valB = parseFloat(valB);
      if (isNaN(valA)) valA = (order === 'asc' ? Infinity : -Infinity);
      if (isNaN(valB)) valB = (order === 'asc' ? Infinity : -Infinity);
    } else {
      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
    }

    if (valA < valB) return order === 'asc' ? -1 : 1;
    if (valA > valB) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

function applyFiltersAndSortAndRender() {
  if (!lotsData) return;
  if (!Array.isArray(lotsData)) {
    console.error('lotsData is not an array:', lotsData);
    return;
  }

  var currentLots = lotsData.filter(function (lot) {
    return lot['Lot Status'] === 'Available' || lot['Lot Status'] === 'Listed';
  });

  var locationSelect = document.getElementById('header-filter-location');
  var locationFilterValue = locationSelect ? locationSelect.value : '';
  if (locationFilterValue) {
    currentLots = currentLots.filter(function (lot) {
      return lot['Close-to'] && lot['Close-to'].toLowerCase() === locationFilterValue.toLowerCase();
    });
  }

  currentLots = sortLotsData(currentLots, tableDisplayState.sort.column, tableDisplayState.sort.order);
  renderTableBody(currentLots);

  // Update sort indicators in headers
  var headers = document.querySelectorAll('#lot-table thead th');
  var columnKeyMappings = { 'Address': 'Name', 'Size (sqft)': 'Size [sqft]', 'Price': 'List Price', 'Listing Firm': 'Listing Firm' };

  headers.forEach(function (th) {
    var clone = th.cloneNode(true);
    var existingArrow = clone.querySelector('.sort-arrow');
    if (existingArrow) existingArrow.remove();
    var headerText = clone.textContent.trim();

    var indicatorSpan = th.querySelector('span.sort-arrow');
    if (!indicatorSpan && ['Address', 'Size (sqft)', 'Price', 'Listing Firm'].indexOf(headerText) >= 0) {
      th.insertAdjacentHTML('beforeend', ' <span class="sort-arrow"></span>');
      indicatorSpan = th.querySelector('span.sort-arrow');
    }

    var indicatorChar = '';
    var srLabel = '';
    var currentHeaderKey = columnKeyMappings[headerText];
    if (currentHeaderKey) {
      th.style.cursor = 'pointer';
      th.setAttribute('role', 'button');
      th.setAttribute('tabindex', '0');
      if (currentHeaderKey === tableDisplayState.sort.column) {
        if (tableDisplayState.sort.order === 'asc') { indicatorChar = '▲'; srLabel = 'sorted ascending'; }
        else { indicatorChar = '▼'; srLabel = 'sorted descending'; }
        th.setAttribute('aria-sort', tableDisplayState.sort.order === 'asc' ? 'ascending' : 'descending');
      } else {
        th.setAttribute('aria-sort', 'none');
      }
      if (indicatorSpan) {
        indicatorSpan.textContent = indicatorChar;
        indicatorSpan.setAttribute('aria-hidden', 'true');
        // Drop any existing sr-only sibling first
        var prevSr = indicatorSpan.previousElementSibling;
        if (prevSr && prevSr.classList && prevSr.classList.contains('sr-only-sort')) prevSr.remove();
        if (srLabel) {
          var srSpan = document.createElement('span');
          srSpan.className = 'sr-only sr-only-sort';
          srSpan.textContent = ' (' + srLabel + ')';
          indicatorSpan.insertAdjacentElement('beforebegin', srSpan);
        }
      }
    } else {
      th.style.cursor = 'default';
      th.removeAttribute('aria-sort');
      if (indicatorSpan) indicatorSpan.textContent = '';
    }
  });
}

function renderTableBody(lotsToRender) {
  var tableBodyItems = [];

  if (window.saleConfig && window.saleConfig.enable && window.saleConfig.location_filter) {
    lotsToRender = lotsToRender.filter(function (lot) {
      return lot['Close-to'] === window.saleConfig.location_filter;
    });
  }

  lotsToRender.forEach(function (val) {
    var listPriceVal = parseFloat(val['List Price']);
    var listPrice = val['List Price'] ? '$' + listPriceVal.toLocaleString() : 'N/A';
    var sizeSqft = val['Size [sqft]'] ? parseFloat(val['Size [sqft]']).toLocaleString() + ' sqft' : 'N/A';

    var listingLinkHtml = 'N/A';
    if (val['Listing Link']) {
      var rawLink = val['Listing Link'];
      var urlMatch = rawLink.match(/https?:\/\/[^\s]+/i);
      var actualUrl = urlMatch && urlMatch[0] ? urlMatch[0] : (rawLink.toLowerCase().startsWith('http') ? rawLink : null);

      if (actualUrl) {
        var linkText = 'View Listing';
        try {
          var domain = new URL(actualUrl).hostname;
          linkText = domain.replace(/^www\./, '');
        } catch (e) { /* keep default */ }
        listingLinkHtml = '<a href="' + actualUrl + '" target="_blank" rel="noopener noreferrer" class="listing-link-cell" title="' + actualUrl + '">' + linkText + '</a>';
      } else {
        listingLinkHtml = '<span title="' + rawLink + '">' + rawLink.substring(0, 30) + (rawLink.length > 30 ? '...' : '') + '</span>';
      }
    }

    var agentPhoneRaw = val['Listing Agent Phone Number'] ? String(val['Listing Agent Phone Number']).split('.')[0] : '';
    var agentPhoneStr = agentPhoneRaw.replace(/\D/g, '');

    var formatPhone = function (str) {
      if (!str) return '';
      if (str.length === 11 && str.startsWith('1')) str = str.substring(1);
      if (str.length === 10) return '(' + str.substring(0, 3) + ') ' + str.substring(3, 6) + '-' + str.substring(6);
      return str;
    };

    var formattedPhone = formatPhone(agentPhoneStr);
    var agentName = val['Listing Agent'] || '';

    var isOwnerSale = (val['Listing Firm'] && val['Listing Firm'].toLowerCase() === 'for sale by owner') ||
      (agentName && agentName.toLowerCase().includes('owner'));
    var agentFirstName = isOwnerSale ? 'Owner' : (agentName.split(' ')[0] || 'Agent');

    var buttonTitle = isOwnerSale ? 'Call Owner' : 'Call ' + agentFirstName;
    var callNowButton = agentPhoneStr ?
      '<a href="tel:' + agentPhoneStr + '" class="btn btn-success call-now-btn" style="white-space: normal; line-height: 1.2; padding: 5px 10px;">' +
      '<div style="font-weight: bold;">' + buttonTitle + '</div>' +
      '<div style="font-size: 0.85em;">' + formattedPhone + '</div>' +
      '</a>' : 'N/A';

    var companyName = val['Listing Firm'] || 'N/A';
    var logoHtml = '';
    if (companyName !== 'N/A') {
      var lowerName = companyName.toLowerCase().trim();
      var logoFile = null;
      for (var key in companyLogos) {
        if (lowerName.includes(key)) { logoFile = companyLogos[key]; break; }
      }
      if (logoFile) {
        logoHtml = '<img src="/img/realtors/' + logoFile + '" alt="' + companyName + '" title="' + companyName + '" style="max-height: 30px; max-width: 80px;">';
      } else {
        logoHtml = '<span title="' + companyName + '">' + companyName + '</span>';
      }
    }

    var globalSaleActive = window.saleConfig && window.saleConfig.enable;

    if (globalSaleActive) {
      var lotQualifies = true;
      if (window.saleConfig.location_filter && val['Close-to'] !== window.saleConfig.location_filter) lotQualifies = false;

      var salePriceDisplay = '-';
      var listPriceDisplay = listPrice;
      var salePriceStyle = '';
      var listPriceStyle = '';

      if (lotQualifies) {
        var salePriceVal = listPriceVal * (1 - window.saleConfig.percentage);
        salePriceDisplay = !isNaN(salePriceVal) ? '$' + salePriceVal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : 'N/A';
        salePriceStyle = 'color: red; font-weight: bold;';
        listPriceStyle = 'text-decoration: line-through;';
        val['Sale Price'] = salePriceVal;
      } else {
        val['Sale Price'] = -1;
      }

      tableBodyItems.push(
        '<tr data-lot-name="' + val.Name + '" style="cursor:pointer;">' +
        '<td>' + (val.Name || 'N/A') + '</td>' +
        '<td style="' + salePriceStyle + '">' + salePriceDisplay + '</td>' +
        '<td style="' + listPriceStyle + '">' + listPriceDisplay + '</td>' +
        '<td>' + sizeSqft + '</td>' +
        '<td>' + (val['Listing Agent'] || 'N/A') + '</td>' +
        '<td>' + callNowButton + '</td>' +
        '<td>' + logoHtml + '</td>' +
        '<td>' + listingLinkHtml + '</td>' +
        '</tr>'
      );
    } else {
      var lotSlug = (val.Name || '').replace(/ /g, '-').toLowerCase();
      var addressLink = val.Name ? '<a href="/lots/' + lotSlug + '/" style="color: inherit; text-decoration: underline;">' + val.Name + '</a>' : 'N/A';

      tableBodyItems.push(
        '<tr data-lot-name="' + val.Name + '" style="cursor:pointer;">' +
        '<td>' + addressLink + '</td>' +
        '<td>' + (val['Lot Status'] || 'N/A') + '</td>' +
        '<td>' + (val['Block Number'] ? String(val['Block Number']).split('.')[0] : 'N/A') + '</td>' +
        '<td>' + (val['Lot Number'] ? String(val['Lot Number']).split('.')[0] : 'N/A') + '</td>' +
        '<td>' + listPrice + '</td>' +
        '<td>' + sizeSqft + '</td>' +
        '<td>' + (val['Listing Agent'] || 'N/A') + '</td>' +
        '<td>' + callNowButton + '</td>' +
        '<td>' + logoHtml + '</td>' +
        '<td>' + listingLinkHtml + '</td>' +
        '<td>' + (val.Location || 'N/A') + '</td>' +
        '<td>' + (val['Close-to'] || 'N/A') + '</td>' +
        '</tr>'
      );
    }
  });

  var tbody = document.querySelector('#lot-table tbody');
  if (!tbody) return;
  tbody.innerHTML = tableBodyItems.join('');

  // Re-attach row click listeners
  tbody.querySelectorAll('tr').forEach(function (tr) {
    tr.addEventListener('click', function (e) {
      if (e.target.closest('a, button')) return;
      var lotName = tr.dataset.lotName;
      if (!lotName) return;
      tbody.querySelectorAll('tr').forEach(function (otherTr) {
        otherTr.classList.remove('table-info');
      });
      tr.classList.add('table-info');
      if (typeof window.focusLotByName === 'function') {
        window.focusLotByName(lotName);
      }
    });
  });
}

function makeListingsTable(url, options) {
  options = options || {};
  fetch(url).then(function (r) {
    if (!r.ok) throw new Error('Failed to load ' + url);
    return r.json();
  }).then(function (data) {
    lotsData = data;
    window.lotsData = data;

    var staleFilters = document.getElementById('table-filters-container');
    if (staleFilters) staleFilters.remove();

    var closeToOptionsHtml =
      '<option value="">All Locations</option>' +
      '<option value="Lake">Lake</option>' +
      '<option value="School">School</option>';

    var saleActive = window.saleConfig && window.saleConfig.enable;
    var tableHeadersHtml = '';

    if (saleActive) {
      tableHeadersHtml = '<thead><tr>' +
        '<th>Address</th><th>Sale Price</th><th>List Price</th><th>Size (sqft)</th>' +
        '<th>Listing Agent</th><th>Agent Phone</th><th>Listing Firm</th><th>Listing</th>' +
        '</tr></thead>';
    } else {
      tableHeadersHtml = '<thead><tr>' +
        '<th>Address</th><th>Status</th><th>Block</th><th>Lot</th><th>Price</th>' +
        '<th>Size (sqft)</th><th>Listing Agent</th><th>Agent Phone</th>' +
        '<th>Listing Firm</th><th>Listing</th><th>Location</th>' +
        '<th><label for="header-filter-location">Close To</label><br><select id="header-filter-location" name="header-filter-location" aria-label="Filter lots by proximity to landmark" class="header-filter form-control form-control-sm" style="width: 90%; margin-top: 4px; padding: 0.15rem 0.5rem; font-size: 0.85em; height: auto; color: #495057; background-color: #fff;">' + closeToOptionsHtml + '</select></th>' +
        '</tr></thead>';
    }

    var container = document.getElementById('lot-table');
    if (!container) return;
    container.replaceChildren();
    var tableEl = document.createElement('table');
    tableEl.className = 'lot-table table table-striped table-hover';
    tableEl.innerHTML = tableHeadersHtml + '<tbody></tbody>';
    container.appendChild(tableEl);

    if (tableDisplayState.filters.location) {
      var loc = document.getElementById('header-filter-location');
      if (loc) loc.value = tableDisplayState.filters.location;
    }

    tableDisplayState.mode = options.mode;

    applyFiltersAndSortAndRender();

    // Header sort + filter listeners
    var headers = tableEl.querySelectorAll('thead th');
    headers.forEach(function (th) {
      th.addEventListener('click', function (e) {
        if (e.target.matches('select.header-filter')) {
          e.stopPropagation();
          return;
        }
        var clone = th.cloneNode(true);
        clone.querySelectorAll('select, span.sort-arrow').forEach(function (el) { el.remove(); });
        var columnText = clone.textContent.trim();
        var columnKey;
        switch (columnText) {
          case 'Address': columnKey = 'Name'; break;
          case 'Size (sqft)': columnKey = 'Size [sqft]'; break;
          case 'Price':
          case 'List Price': columnKey = 'List Price'; break;
          case 'Sale Price': columnKey = 'Sale Price'; break;
          case 'Listing Firm': columnKey = 'Listing Firm'; break;
          default: return;
        }
        if (tableDisplayState.sort.column === columnKey) {
          tableDisplayState.sort.order = tableDisplayState.sort.order === 'asc' ? 'desc' : 'asc';
        } else {
          tableDisplayState.sort.column = columnKey;
          tableDisplayState.sort.order = 'asc';
        }
        applyFiltersAndSortAndRender();
      });
    });

    var locationSelect = tableEl.querySelector('#header-filter-location');
    if (locationSelect) {
      locationSelect.addEventListener('change', function (e) {
        e.preventDefault();
        e.stopPropagation();
        tableDisplayState.filters.location = locationSelect.value;
        applyFiltersAndSortAndRender();
      });
    }

  }).catch(function (err) {
    console.error('Failed to load lots data:', err);
  });
  return true;
}

// Feature lookup is handled by the map module via window.focusLotByName().
