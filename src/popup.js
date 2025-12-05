/**
 * Popup Script for Circle.so Calendar Exporter
 * Handles UI rendering and export button actions
 */

const { parseEventDateTime } = require('./utils/dateParser');
const { generateGoogleCalendarLink, generateOutlookLink } = require('./utils/calendarLinks');
const { generateICS } = require('./utils/icsGenerator');

const LIVE_EVENTS_URL = 'https://community.dynamous.ai/c/live-events';

// Local cache of exported events for UI rendering
let exportedEventsCache = [];

/**
 * Validates if the current URL is the Dynamous live events page
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid live events page
 */
function isValidLiveEventsPage(url) {
  if (!url) return false;

  try {
    const parsedUrl = new URL(url);

    // Must be Dynamous community
    if (parsedUrl.hostname !== 'community.dynamous.ai') {
      return false;
    }

    // Must be the live-events list view (not a specific event)
    const pathname = parsedUrl.pathname.replace(/\/$/, ''); // Remove trailing slash
    return pathname === '/c/live-events';
  } catch (e) {
    return false;
  }
}

/**
 * Scans the current page for events via content script
 * @returns {Promise<Array>} Array of event objects
 */
function scanPageForEvents() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        reject(new Error('No active tab found'));
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { action: 'scanEvents' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response && response.success) {
          resolve(response.events);
        } else {
          reject(new Error(response?.error || 'Failed to scan events'));
        }
      });
    });
  });
}

/**
 * Converts scraped event data to calendar-ready format
 * @param {Object} event - Scraped event object
 * @returns {Object} Event with parsed dates
 */
function prepareEventForExport(event) {
  const referenceYear = new Date().getFullYear();
  const parsed = parseEventDateTime(event.dateTimeStr, referenceYear);

  const eventUrl = event.url.startsWith('http')
    ? event.url
    : `https://community.dynamous.ai${event.url}`;

  // Build a rich description
  const descriptionParts = [
    `🕐 ${event.dateTimeStr}`,
    `📍 ${event.location || 'TBD'}`,
    '👤 Host: Cole Medin',
  ];

  // Add RSVP status
  if (event.rsvpStatus === 'going') {
    descriptionParts.push('✅ RSVP: Going');
  } else {
    descriptionParts.push('⚠️ RSVP: Not yet confirmed');
  }

  descriptionParts.push(
    '',
    `🔗 ${eventUrl}`,
    '',
    '—',
    'Dynamous Community'
  );

  return {
    title: event.title,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    location: event.location,
    url: eventUrl,
    description: descriptionParts.join('\n')
  };
}

/**
 * Generates filename slug from event title
 * @param {string} title - Event title
 * @returns {string} Slug for filename
 */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Shows a brief toast notification
 * @param {string} message - Message to display
 */
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

/**
 * Handles export button clicks
 * @param {string} type - Export type: 'google', 'outlook', or 'ics'
 * @param {Object} event - Event object
 */
async function handleExport(type, event) {
  const exportEvent = prepareEventForExport(event);
  const slug = event.slug || slugify(event.title);

  // Check if already exported
  const alreadyExported = await isEventExported(slug, type);
  if (alreadyExported) {
    return; // Don't export again
  }

  switch (type) {
    case 'google':
      window.open(generateGoogleCalendarLink(exportEvent), '_blank');
      break;

    case 'outlook':
      window.open(generateOutlookLink(exportEvent), '_blank');
      break;

    case 'ics':
      const icsContent = generateICS(exportEvent);
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${slugify(event.title)}.ics`;
      a.click();

      URL.revokeObjectURL(url);
      break;
  }

  // Track the export and update UI
  await trackExport(slug, type);

  // Disable the button that was just clicked
  const button = document.querySelector(`[data-export="${type}"]`);
  if (button) {
    button.disabled = true;
    button.classList.add('disabled');
  }

  // Add exported badge if not already present
  const card = button?.closest('.event-card');
  if (card && !card.querySelector('.exported-badge')) {
    const exportedBadge = document.createElement('span');
    exportedBadge.className = 'exported-badge';
    exportedBadge.textContent = 'Exported';
    card.appendChild(exportedBadge);
  }

  // Show confirmation toast
  const typeLabel = type === 'ics' ? 'ICS' : type.charAt(0).toUpperCase() + type.slice(1);
  showToast(`Added to ${typeLabel}`);
}

/**
 * Creates an event card DOM element
 * @param {Object} event - Event object
 * @param {number} index - Event index for data attribute
 * @returns {HTMLElement} Event card element
 */
function createEventCard(event, index) {
  const card = document.createElement('div');
  card.className = 'event-card';
  if (event.isUrgent) {
    card.classList.add('urgent');
  }
  card.dataset.index = index;

  // Title
  const title = document.createElement('h3');
  title.className = 'event-title';
  title.textContent = event.title;
  card.appendChild(title);

  // Date/time
  const dateTime = document.createElement('p');
  dateTime.className = 'event-datetime';
  dateTime.textContent = event.dateTimeStr;
  card.appendChild(dateTime);

  // Location
  if (event.location) {
    const location = document.createElement('p');
    location.className = 'event-location';
    location.textContent = event.location;
    card.appendChild(location);
  }

  // RSVP status
  if (event.rsvpStatus === 'going') {
    const badge = document.createElement('span');
    badge.className = 'rsvp-badge';
    badge.textContent = 'Going';
    card.appendChild(badge);
  } else {
    const nudge = document.createElement('span');
    nudge.className = 'rsvp-nudge';
    nudge.textContent = 'RSVP Now';
    nudge.onclick = async () => {
      const slug = event.slug || slugify(event.title);

      // Track RSVP click to disable export buttons
      await trackExport(slug, 'rsvp');

      // Disable all export buttons for this event
      const exportButtons = card.querySelectorAll('.export-buttons button');
      exportButtons.forEach(btn => {
        btn.disabled = true;
        btn.classList.add('disabled');
      });

      // Add RSVP badge
      if (!card.querySelector('.exported-badge')) {
        const rsvpBadge = document.createElement('span');
        rsvpBadge.className = 'exported-badge';
        rsvpBadge.textContent = 'RSVP';
        card.appendChild(rsvpBadge);
      }

      // Show toast
      showToast('Manage calendar via RSVP page');

      // Open RSVP page
      window.open(
        event.url.startsWith('http')
          ? event.url
          : `https://community.dynamous.ai${event.url}`,
        '_blank'
      );
    };
    card.appendChild(nudge);
  }

  // Check if RSVP was clicked (disables all export buttons)
  const slug = event.slug || slugify(event.title);
  const rsvpClicked = isEventExportedSync(slug, 'rsvp');

  // Show exported/RSVP badge if any export exists for this event
  if (hasAnyExport(slug)) {
    const exportedBadge = document.createElement('span');
    exportedBadge.className = 'exported-badge';
    exportedBadge.textContent = rsvpClicked ? 'RSVP' : 'Exported';
    card.appendChild(exportedBadge);
  }

  // Export buttons container
  const buttons = document.createElement('div');
  buttons.className = 'export-buttons';

  // Google Calendar button
  const googleBtn = document.createElement('button');
  googleBtn.textContent = 'Google';
  googleBtn.dataset.export = 'google';
  if (rsvpClicked || isEventExportedSync(slug, 'google')) {
    googleBtn.disabled = true;
    googleBtn.classList.add('disabled');
  }
  googleBtn.onclick = () => handleExport('google', event);
  buttons.appendChild(googleBtn);

  // Outlook button
  const outlookBtn = document.createElement('button');
  outlookBtn.textContent = 'Outlook';
  outlookBtn.dataset.export = 'outlook';
  if (rsvpClicked || isEventExportedSync(slug, 'outlook')) {
    outlookBtn.disabled = true;
    outlookBtn.classList.add('disabled');
  }
  outlookBtn.onclick = () => handleExport('outlook', event);
  buttons.appendChild(outlookBtn);

  // ICS button
  const icsBtn = document.createElement('button');
  icsBtn.textContent = 'ICS';
  icsBtn.dataset.export = 'ics';
  if (rsvpClicked || isEventExportedSync(slug, 'ics')) {
    icsBtn.disabled = true;
    icsBtn.classList.add('disabled');
  }
  icsBtn.onclick = () => handleExport('ics', event);
  buttons.appendChild(icsBtn);

  card.appendChild(buttons);

  return card;
}

/**
 * Updates the RSVP count banner
 * @param {Array} events - Array of events
 */
function updateRsvpBanner(events) {
  const banner = document.getElementById('rsvp-banner');
  if (!banner) return;

  const nonRsvpCount = events.filter(e => e.rsvpStatus !== 'going').length;

  if (nonRsvpCount === 0) {
    banner.classList.add('hidden');
    banner.style.display = 'none';
  } else {
    banner.classList.remove('hidden');
    banner.style.display = '';
    const countText = nonRsvpCount === 1 ? '1 event without RSVP' : `${nonRsvpCount} events without RSVP`;
    banner.textContent = countText;
  }
}

/**
 * Renders the wrong page message with redirect link
 */
function renderWrongPageMessage() {
  const container = document.getElementById('event-list');
  if (!container) return;

  container.innerHTML = `
    <div class="wrong-page-message">
      <p>Please navigate to the live events page:</p>
      <a href="${LIVE_EVENTS_URL}" target="_blank">
        community.dynamous.ai/c/live-events
      </a>
    </div>
  `;
}

/**
 * Renders events in the popup UI
 * @param {Array} events - Array of event objects
 */
function renderEvents(events) {
  const container = document.getElementById('event-list');
  if (!container) return;

  // Clear container
  container.innerHTML = '';

  // Update RSVP banner
  updateRsvpBanner(events);

  // Handle empty state
  if (!events || events.length === 0) {
    container.innerHTML = '<p class="empty-state">No events found on this page.</p>';
    return;
  }

  // Render each event card
  events.forEach((event, index) => {
    const card = createEventCard(event, index);
    container.appendChild(card);
  });
}

/**
 * Sets the exported events cache (for testing)
 * @param {Array} events - Array of exported event records
 */
function setExportedEvents(events) {
  exportedEventsCache = events || [];
}

/**
 * Gets all exported events from chrome.storage
 * @returns {Promise<Array>} Array of exported event records
 */
function getExportedEvents() {
  return new Promise((resolve) => {
    chrome.storage.local.get('exportedEvents', (result) => {
      resolve(result.exportedEvents || []);
    });
  });
}

/**
 * Tracks an export in chrome.storage
 * @param {string} slug - Event slug
 * @param {string} exportType - Export type (google, outlook, ics)
 * @returns {Promise<void>}
 */
function trackExport(slug, exportType) {
  return new Promise((resolve) => {
    chrome.storage.local.get('exportedEvents', (result) => {
      const exports = result.exportedEvents || [];
      exports.push({
        slug,
        exportType,
        timestamp: Date.now()
      });

      chrome.storage.local.set({ exportedEvents: exports }, () => {
        // Update local cache
        exportedEventsCache = exports;
        resolve();
      });
    });
  });
}

/**
 * Checks if an event was already exported with a specific type
 * @param {string} slug - Event slug
 * @param {string} exportType - Export type
 * @returns {Promise<boolean>}
 */
function isEventExported(slug, exportType) {
  return new Promise((resolve) => {
    chrome.storage.local.get('exportedEvents', (result) => {
      const exports = result.exportedEvents || [];
      const found = exports.some(e => e.slug === slug && e.exportType === exportType);
      resolve(found);
    });
  });
}

/**
 * Checks if an event was exported (from cache, for UI rendering)
 * @param {string} slug - Event slug
 * @param {string} exportType - Export type
 * @returns {boolean}
 */
function isEventExportedSync(slug, exportType) {
  return exportedEventsCache.some(e => e.slug === slug && e.exportType === exportType);
}

/**
 * Checks if an event has any exports (from cache)
 * @param {string} slug - Event slug
 * @returns {boolean}
 */
function hasAnyExport(slug) {
  return exportedEventsCache.some(e => e.slug === slug);
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    scanPageForEvents,
    renderEvents,
    handleExport,
    isValidLiveEventsPage,
    renderWrongPageMessage,
    trackExport,
    getExportedEvents,
    isEventExported,
    setExportedEvents
  };
}

/**
 * Initialize popup when DOM is ready
 */
async function initPopup() {
  try {
    // First check if we're on the correct page
    const tabs = await new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });

    if (!tabs || tabs.length === 0) {
      renderWrongPageMessage();
      return;
    }

    const currentUrl = tabs[0].url;

    if (!isValidLiveEventsPage(currentUrl)) {
      renderWrongPageMessage();
      return;
    }

    // Load exported events from storage
    const exportedEvents = await getExportedEvents();
    setExportedEvents(exportedEvents);

    // Scan for events
    const events = await scanPageForEvents();
    renderEvents(events);

  } catch (error) {
    console.error('Error initializing popup:', error);
    const container = document.getElementById('event-list');
    if (container) {
      // Check if this is a connection error (content script not loaded)
      if (error.message.includes('Could not establish connection') ||
          error.message.includes('Receiving end does not exist')) {
        container.innerHTML = `
          <div class="wrong-page-message">
            <p>Please refresh the page to activate the extension.</p>
            <button id="refresh-btn" style="margin-top: 10px; padding: 8px 16px; cursor: pointer;">
              Refresh Page
            </button>
          </div>
        `;
        // Add refresh button handler
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
          refreshBtn.onclick = () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]) {
                chrome.tabs.reload(tabs[0].id);
                window.close();
              }
            });
          };
        }
      } else {
        container.innerHTML = `<p class="empty-state">Error: ${error.message}</p>`;
      }
    }
  }
}

// Run when DOM is ready
document.addEventListener('DOMContentLoaded', initPopup);
