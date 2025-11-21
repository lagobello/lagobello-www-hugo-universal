// lots-table.js - Handles the lots table functionality

// Global store for current filters and sort state
var tableDisplayState = {
  filters: {
    location: '', // "Close-to"
    status: ''     // "Lot Status" - this will be ANDed with the default "Available/Listed"
  },
  sort: { column: 'List Price', order: 'asc' }
};

// Helper sort function
function sortLotsData(lotsArray, columnKey, order) {
  return lotsArray.sort(function (a, b) {
    var valA = a[columnKey];
    var valB = b[columnKey];

    // Handle numeric sort for price and size
    if (columnKey === 'List Price' || columnKey === 'Size [sqft]') {
      valA = parseFloat(valA);
      valB = parseFloat(valB);
      if (isNaN(valA)) valA = (order === 'asc' ? Infinity : -Infinity); // Push NaNs to end/start
      if (isNaN(valB)) valB = (order === 'asc' ? Infinity : -Infinity);
    } else { // Handle string sort for Name
      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
    }

    if (valA < valB) {
      return order === 'asc' ? -1 : 1;
    }
    if (valA > valB) {
      return order === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

// Function to apply filters and sort, then render table
function applyFiltersAndSortAndRender() {
  if (!lotsData) return;
  if (!Array.isArray(lotsData)) {
    console.error('lotsData is not an array:', lotsData);
    return;
  }

  // 1. Apply base filter (Available or Listed lots)
  var currentLots = lotsData.filter(function (lot) {
    return lot["Lot Status"] === "Available" || lot["Lot Status"] === "Listed";
  });

  // 2. Apply "Close-to" (Location) filter from header dropdown
  var locationFilterValue = $('#header-filter-location').val();
  if (locationFilterValue) {
    currentLots = currentLots.filter(function (lot) {
      return lot["Close-to"] && lot["Close-to"].toLowerCase() === locationFilterValue.toLowerCase();
    });
  }



  // 4. Apply sorting from tableDisplayState
  currentLots = sortLotsData(currentLots, tableDisplayState.sort.column, tableDisplayState.sort.order);

  // 5. Render
  renderTableBody(currentLots);


  // Update sort indicators in table headers
  $('#lot-table thead th').each(function () {
    var $this = $(this);
    // Normalize header text by removing existing indicators and extra spaces for reliable matching
    var headerText = $this.clone().children('.sort-arrow').remove().end().text().trim();
    var indicatorSpan = $this.find('span.sort-arrow');
    if (indicatorSpan.length === 0 && ['Address', 'Size (sqft)', 'Price'].includes(headerText)) {
      // Ensure span exists for sortable columns if not already there
      $this.append(' <span class="sort-arrow"></span>');
      indicatorSpan = $this.find('span.sort-arrow'); // Re-find it
    }

    var indicatorChar = ''; // Default to no indicator
    var columnKeyMappings = { 'Address': 'Name', 'Size (sqft)': 'Size [sqft]', 'Price': 'List Price' };
    var currentHeaderKey = columnKeyMappings[headerText];

    if (currentHeaderKey) { // If it's a sortable column
      $this.css('cursor', 'pointer');
      if (currentHeaderKey === tableDisplayState.sort.column) {
        indicatorChar = tableDisplayState.sort.order === 'asc' ? '▲' : '▼';
      }
      if (indicatorSpan.length) {
        indicatorSpan.text(indicatorChar); // Set text of existing span
      } else if (indicatorChar) {
        // This case should be less common if span is added above, but as a fallback
        $this.append(' <span class="sort-arrow">' + indicatorChar + '</span>');
      }
    } else {
      $this.css('cursor', 'default');
      if (indicatorSpan.length) indicatorSpan.text(''); // Clear indicator for non-sortable if any somehow existed
    }
  });
}

// Helper function to render the table body based on provided lots data
function renderTableBody(lotsToRender) {
  var tableBodyItems = [];
  $.each(lotsToRender, function (key, val) {
    var listPrice = val["List Price"] ? `$${parseFloat(val["List Price"]).toLocaleString()}` : 'N/A';
    var sizeSqft = val["Size [sqft]"] ? `${parseFloat(val["Size [sqft]"]).toLocaleString()} sqft` : 'N/A';

    var listingLinkHtml = 'N/A';
    if (val["Listing Link"]) {
      var rawLink = val["Listing Link"];
      // Attempt to extract URL if it's embedded, e.g. "Zillow Link - https://..."
      var urlMatch = rawLink.match(/https?:\/\/[^\s]+/i);
      var actualUrl = urlMatch && urlMatch[0] ? urlMatch[0] : (rawLink.toLowerCase().startsWith('http') ? rawLink : null);

      if (actualUrl) {
        var linkText = "View Listing"; // Default text
        try {
          var domain = new URL(actualUrl).hostname;
          linkText = domain.replace(/^www\./, ''); // Show domain as link text
        } catch (e) { /* use default linkText */ }
        // Apply truncation via CSS class if needed, e.g., class="truncated-link"
        listingLinkHtml = `<a href="${actualUrl}" target="_blank" rel="noopener noreferrer" class="listing-link-cell" title="${actualUrl}">${linkText}</a>`;
      } else {
        // If no valid URL, display the text but not as a link
        // If no valid URL, display the text but not as a link
        listingLinkHtml = `<span title="${rawLink}">${rawLink.substring(0, 30)}${rawLink.length > 30 ? '...' : ''}</span>`;
      }
    }

    var agentPhoneStr = val["Listing Agent Phone Number"] ? String(val["Listing Agent Phone Number"]).replace(/\D/g, '') : '';
    var callNowButton = agentPhoneStr ? `<button class="btn btn-sm btn-success call-now-btn" data-phone="${agentPhoneStr}">Call</button>` : '';
    var agentPhoneDisplay = val["Listing Agent Phone Number"] ? String(val["Listing Agent Phone Number"]) : 'N/A';

    tableBodyItems.push(
      `<tr data-lot-name="${val.Name}" style="cursor:pointer;">
        <td>${val.Name || 'N/A'}</td>
        <td>${val["Lot Status"] || 'N/A'}</td>
        <td>${val["Block Number"] || 'N/A'}</td>
        <td>${val["Lot Number"] || 'N/A'}</td>
        <td>${listPrice}</td>
        <td>${sizeSqft}</td>
        <td>${val["Listing Agent"] || 'N/A'}</td>
        <td>${agentPhoneDisplay} ${callNowButton}</td>
        <td>${listingLinkHtml}</td>
        <td>${val.Location || 'N/A'}</td>
        <td>${val["Close-to"] || 'N/A'}</td>
      </tr>`
    );
  });
  $('#lot-table tbody').html(tableBodyItems.join(''));

  // Re-attach row click listeners
  $('#lot-table tbody tr').on('click', function (e) { // Added event 'e'
    var $target = $(e.target); // Get the actual clicked element

    // Prevent row click if the click was on a button or a link inside the row
    if ($target.is('a, button') || $target.closest('a, button').length) {
      // If it's a link or button, or inside one, let its default action proceed.
      // No need to e.stopPropagation() unless other row-level behaviors are unintentionally triggered by link/button.
      return;
    }

    var lotName = $(this).data('lot-name');
    if (!lotName) return;
    $('#lot-table tbody tr').removeClass('table-info');
    $(this).addClass('table-info');
    var lotDataEntry = lotsData.find(ld => ld.Name === lotName);
    if (lotDataEntry && lotDataEntry.Location) {
      const targetFeature = findFeatureByLotName(lotName);
      if (targetFeature) {
        var featureCenter = ol.extent.getCenter(targetFeature.getGeometry().getExtent());
        olMap.getView().animate({ center: featureCenter, zoom: 19, duration: 500 });
        var pseudoEvt = { pixel: olMap.getPixelFromCoordinate(featureCenter), coordinate: featureCenter };

        // Use the new global function to show the card
        if (window.showMapCard) {
          window.showMapCard(targetFeature, pseudoEvt);
        } else {
          console.error("showMapCard function not found");
        }
      }
    }
  });
}

function makeListingsTable(url) {
  $.getJSON(url, function (data) {
    lotsData = data; // Store fetched data globally for reuse

    // Remove old global filter container if it exists from previous versions of the script
    $('#table-filters-container').remove();

    // Generate options for "Close To" filter (fixed for Section 2)
    var closeToOptionsHtml = `
        <option value="">All Locations</option>
        <option value="Lake">Lake</option>
        <option value="School">School</option>
    `;

    // Generate options for "Status" filter (fixed for now, could also be dynamic)
    var statusOptionsHtml = `
        <option value="">All Statuses</option>
        <option value="Available">Available</option>
        <option value="Listed">Listed</option>
    `;
    // The base filter in applyFiltersAndSortAndRender already limits to Available/Listed.
    // This dropdown will further refine *within* that set if a specific status is chosen.

    var items = []; // Initialize items array

    var tableHeadersHtml = `
      <thead>
        <tr>
          <th>Address</th>
          <th>Status</th>
          <th>Block</th>
          <th>Lot</th>
          <th>Price</th>
          <th>Size (sqft)</th>
          <th>Agent</th>
          <th>Agent Phone</th>
          <th>Listing</th>
          <th>Location</th>
          <th>Close To <br><select id="header-filter-location" class="header-filter form-control form-control-sm" style="width: 90%; margin-top: 4px; padding: 0.15rem 0.5rem; font-size: 0.85em; height: auto; color: #495057; background-color: #fff;">${closeToOptionsHtml}</select></th>
        </tr>
      </thead>`;

    items.push(tableHeadersHtml); // Push headers to items
    items.push('<tbody></tbody>'); // Empty tbody, populated by applyFiltersAndSortAndRender

    var tableElement = $('<table/>', {
      class: 'lot-table table table-striped table-hover',
      html: items.join('')
    });

    // Clear existing table content and append new table structure
    $('#lot-table').empty().append(tableElement);

    // Set initial values for dropdowns if they exist in tableDisplayState (e.g. from previous interaction before a full reload)
    if (tableDisplayState.filters.location) {
      $('#header-filter-location').val(tableDisplayState.filters.location);
    }

    applyFiltersAndSortAndRender(); // Initial render which also sets up sort indicators

    // Event listeners (use .off().on() to prevent multiple bindings if makeListingsTable is ever recalled)
    $('#lot-table').off('click', '.call-now-btn').on('click', '.call-now-btn', function (e) {
      e.stopPropagation();
      var phone = $(this).data('phone');
      if (phone) {
        window.location.href = 'tel:' + phone;
      }
    });

    $('#lot-table thead th').off('click').on('click', function (e) {
      if ($(e.target).is('select.header-filter')) {
        e.stopPropagation(); // Prevent sorting when clicking on the select dropdown itself
        return;
      }
      // Use clone to get text without children like select or span.sort-arrow
      var columnText = $(this).clone().children().remove().end().text().trim();
      var columnKey;
      switch (columnText) {
        case 'Address': columnKey = 'Name'; break;
        case 'Size (sqft)': columnKey = 'Size [sqft]'; break;
        case 'Price': columnKey = 'List Price'; break;
        // Status and Close To are handled by their select, not direct th click for sorting
        default: return;
      }

      if (tableDisplayState.sort.column === columnKey) {
        tableDisplayState.sort.order = tableDisplayState.sort.order === 'asc' ? 'desc' : 'asc';
      } else {
        tableDisplayState.sort.column = columnKey;
        tableDisplayState.sort.order = 'asc'; // Default to asc on new column
      }
      applyFiltersAndSortAndRender();
    });

    // Filter dropdown listeners
    $('#header-filter-status, #header-filter-location').off('change').on('change', function (e) {
      e.stopPropagation(); // Prevent th click event if selects are inside th
      tableDisplayState.filters.status = $('#header-filter-status').val();
      tableDisplayState.filters.location = $('#header-filter-location').val();
      applyFiltersAndSortAndRender();
    });

  });
  return true;
}

// Helper function to find a feature by its 'Name' property from lots.json
// This might be slow if there are many features.
// Consider adding 'Name' property directly to GeoJSON features during conversion if possible.
function findFeatureByLotName(lotName) {
  let foundFeature = null;
  const layersToSearch = [layerVectorLotsPlatS1, layerVectorLotsPlatS2, layerVectorLotsPlatS3];

  for (const layer of layersToSearch) {
    if (foundFeature) break;
    const source = layer.getSource();
    if (source && source.getFeatures) {
      const features = source.getFeatures();
      for (const feature of features) {
        // This is the tricky part: GeoJSON features might not have a direct 'Name' property
        // that matches lots.json. We rely on spatial matching for popups.
        // For reverse (map to table), we need a reliable link.
        // This placeholder shows the need for such a link.
        // If features are guaranteed to have a unique ID that maps to lotName:
        // if (feature.get('id_property_that_matches_lotName') === lotName) {
        //    foundFeature = feature;
        //    break;
        // }

        // Fallback: if lotsData is available, try to match by location, then check if this feature contains that location
        const lotJsonEntry = lotsData.find(l => l.Name === lotName);
        if (lotJsonEntry && lotJsonEntry.Location) {
          const parts = lotJsonEntry.Location.split(',');
          if (parts.length === 2) {
            const lat = parseFloat(parts[0].trim());
            const lon = parseFloat(parts[1].trim());
            if (!isNaN(lat) && !isNaN(lon)) {
              const lotPointWGS84 = [lon, lat];
              const lotPointInFeatureProj = ol.proj.transform(lotPointWGS84, 'EPSG:4326', 'EPSG:3857');
              if (feature.getGeometry().intersectsCoordinate(lotPointInFeatureProj)) {
                foundFeature = feature;
                break;
              }
            }
          }
        }
      }
    }
  }
  return foundFeature;
}
