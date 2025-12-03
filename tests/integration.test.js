/**
 * Integration tests for Chrome Extension
 * Phase 5: Wire components into working extension
 */

const fs = require('fs');
const path = require('path');

// Mock Chrome APIs before requiring modules that use them
const mockChrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn()
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    create: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

global.chrome = mockChrome;

// TDD Cycle 5.1: Message passing
describe('Chrome messaging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('content script registers message listener on load', () => {
    // Load content script (this should register the listener)
    jest.isolateModules(() => {
      require('../src/content');
    });

    expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    expect(typeof mockChrome.runtime.onMessage.addListener.mock.calls[0][0]).toBe('function');
  });

  test('content script responds to "scanEvents" action', () => {
    let messageHandler;
    mockChrome.runtime.onMessage.addListener.mockImplementation((handler) => {
      messageHandler = handler;
    });

    // Load content script
    jest.isolateModules(() => {
      require('../src/content');
    });

    // Mock the DOM with our fixture
    const mockHTML = fs.readFileSync(
      path.join(__dirname, '../fixtures/mockEventsList.html'),
      'utf8'
    );
    document.body.innerHTML = mockHTML;

    // Call the message handler
    const sendResponse = jest.fn();
    messageHandler({ action: 'scanEvents' }, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      events: expect.any(Array)
    }));
    expect(sendResponse.mock.calls[0][0].events.length).toBe(4);
  });

  test('content script handles unknown action gracefully', () => {
    let messageHandler;
    mockChrome.runtime.onMessage.addListener.mockImplementation((handler) => {
      messageHandler = handler;
    });

    jest.isolateModules(() => {
      require('../src/content');
    });

    const sendResponse = jest.fn();
    messageHandler({ action: 'unknownAction' }, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: 'Unknown action: unknownAction'
    });
  });

  test('popup sends message to content script and receives events', async () => {
    // Mock tabs.query to return active tab
    mockChrome.tabs.query.mockImplementation((query, callback) => {
      callback([{ id: 123 }]);
    });

    // Mock tabs.sendMessage to return events
    const mockEvents = [
      { title: 'Test Event', dateTimeStr: 'Thursday, Dec 4, 10:00 – 11:00 AM EST' }
    ];
    mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
      callback({ success: true, events: mockEvents });
    });

    // Load popup module
    const { scanPageForEvents } = require('../src/popup');
    const result = await scanPageForEvents();

    expect(mockChrome.tabs.query).toHaveBeenCalledWith(
      { active: true, currentWindow: true },
      expect.any(Function)
    );
    expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
      123,
      { action: 'scanEvents' },
      expect.any(Function)
    );
    expect(result).toEqual(mockEvents);
  });
});

// TDD Cycle 5.2: UI rendering
describe('Popup UI', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  test('displays "No events found" when array is empty (US-5)', () => {
    const { renderEvents } = require('../src/popup');

    document.body.innerHTML = '<div id="event-list"></div>';
    renderEvents([]);

    const container = document.getElementById('event-list');
    expect(container.textContent).toContain('No events found');
  });

  test('renders event card for each event', () => {
    const { renderEvents } = require('../src/popup');

    document.body.innerHTML = '<div id="event-list"></div>';

    const events = [
      {
        title: 'Community Hangout',
        dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
        location: 'Virtual',
        url: '/c/live-events/community-hangout-123',
        rsvpStatus: 'going'
      },
      {
        title: 'Office Hours',
        dateTimeStr: 'Tuesday, Dec 9, 2:00 – 3:00 PM EST',
        location: 'TBD',
        url: '/c/live-events/office-hours-456',
        rsvpStatus: 'none'
      }
    ];

    renderEvents(events);

    const container = document.getElementById('event-list');
    const cards = container.querySelectorAll('.event-card');
    expect(cards.length).toBe(2);

    // Check first card content
    expect(cards[0].textContent).toContain('Community Hangout');
    expect(cards[0].textContent).toContain('Monday, Dec 8, 1:00 – 2:00 PM EST');
  });

  test('event card contains Google, Outlook, ICS buttons', () => {
    const { renderEvents } = require('../src/popup');

    document.body.innerHTML = '<div id="event-list"></div>';

    const events = [{
      title: 'Test Event',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      location: 'Virtual',
      url: '/c/live-events/test-event-123',
      rsvpStatus: 'going'
    }];

    renderEvents(events);

    const card = document.querySelector('.event-card');
    const googleBtn = card.querySelector('[data-export="google"]');
    const outlookBtn = card.querySelector('[data-export="outlook"]');
    const icsBtn = card.querySelector('[data-export="ics"]');

    expect(googleBtn).not.toBeNull();
    expect(outlookBtn).not.toBeNull();
    expect(icsBtn).not.toBeNull();
  });

  test('shows RSVP status badge for going events', () => {
    const { renderEvents } = require('../src/popup');

    document.body.innerHTML = '<div id="event-list"></div>';

    const events = [{
      title: 'Going Event',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      location: 'Virtual',
      url: '/c/live-events/going-event',
      rsvpStatus: 'going'
    }];

    renderEvents(events);

    const card = document.querySelector('.event-card');
    const rsvpBadge = card.querySelector('.rsvp-badge');
    expect(rsvpBadge).not.toBeNull();
    expect(rsvpBadge.textContent).toContain('Going');
  });

  test('shows RSVP nudge for non-RSVP\'d events', () => {
    const { renderEvents } = require('../src/popup');

    document.body.innerHTML = '<div id="event-list"></div>';

    const events = [{
      title: 'Not RSVP\'d Event',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      location: 'Virtual',
      url: '/c/live-events/not-rsvpd-event',
      rsvpStatus: 'none'
    }];

    renderEvents(events);

    const card = document.querySelector('.event-card');
    const nudge = card.querySelector('.rsvp-nudge');
    expect(nudge).not.toBeNull();
    expect(nudge.textContent).toContain('RSVP');
  });
});

// TDD Cycle 5.3: Export actions
describe('Export buttons', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();

    // Mock window.open for calendar links
    global.open = jest.fn();

    // Mock chrome.storage for export tracking
    mockChrome.storage.local.get.mockImplementation((key, callback) => {
      callback({ exportedEvents: [] });
    });
    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
    });
  });

  test('Google button opens new tab with calendar URL (US-2)', async () => {
    const { handleExport } = require('../src/popup');

    const event = {
      title: 'Test Event',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      location: 'Virtual',
      url: '/c/live-events/test-event-123',
      rsvpStatus: 'going'
    };

    await handleExport('google', event);

    expect(global.open).toHaveBeenCalledTimes(1);
    const calledUrl = global.open.mock.calls[0][0];
    expect(calledUrl).toContain('google.com/calendar/render');
    expect(calledUrl).toContain('Test+Event');
  });

  test('Outlook button opens new tab with outlook URL (US-3)', async () => {
    const { handleExport } = require('../src/popup');

    const event = {
      title: 'Test Event',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      location: 'Virtual',
      url: '/c/live-events/test-event-123',
      rsvpStatus: 'going'
    };

    await handleExport('outlook', event);

    expect(global.open).toHaveBeenCalledTimes(1);
    const calledUrl = global.open.mock.calls[0][0];
    expect(calledUrl).toContain('outlook.office.com/calendar');
    // URLSearchParams encodes spaces as '+' so check for either encoding
    expect(calledUrl).toMatch(/subject=Test[\+%20]Event/);
  });

  test('ICS button triggers file download (US-4)', async () => {
    const { handleExport } = require('../src/popup');

    // Mock createElement for anchor element
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn(),
      style: {}
    };
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return mockAnchor;
      return originalCreateElement(tag);
    });

    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:test-url');
    global.URL.revokeObjectURL = jest.fn();

    const event = {
      title: 'Test Event',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      location: 'Virtual',
      url: '/c/live-events/test-event-123',
      rsvpStatus: 'going'
    };

    await handleExport('ics', event);

    expect(mockAnchor.download).toBe('test-event.ics');
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalled();

    document.createElement.mockRestore();
  });

  test('handleExport tracks export and prevents duplicate exports', async () => {
    const { handleExport } = require('../src/popup');

    const event = {
      title: 'Test Event',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      location: 'Virtual',
      url: '/c/live-events/test-event-123',
      rsvpStatus: 'going'
    };

    // First export should succeed
    await handleExport('google', event);
    expect(global.open).toHaveBeenCalledTimes(1);

    // Now mock storage to return this event as already exported
    mockChrome.storage.local.get.mockImplementation((key, callback) => {
      callback({ exportedEvents: [{ slug: 'test-event', exportType: 'google' }] });
    });

    // Second export should be blocked
    await handleExport('google', event);
    expect(global.open).toHaveBeenCalledTimes(1); // Still 1, not called again
  });
});

// TDD Cycle 5.4: RSVP nudge count banner
describe('RSVP Count Banner', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  test('displays count of non-RSVP\'d events', () => {
    const { renderEvents } = require('../src/popup');

    document.body.innerHTML = `
      <div id="rsvp-banner"></div>
      <div id="event-list"></div>
    `;

    const events = [
      { title: 'Event 1', dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST', location: 'Virtual', url: '/e/1', rsvpStatus: 'none' },
      { title: 'Event 2', dateTimeStr: 'Tuesday, Dec 9, 2:00 – 3:00 PM EST', location: 'Virtual', url: '/e/2', rsvpStatus: 'going' },
      { title: 'Event 3', dateTimeStr: 'Wednesday, Dec 10, 3:00 – 4:00 PM EST', location: 'Virtual', url: '/e/3', rsvpStatus: 'none' }
    ];

    renderEvents(events);

    const banner = document.getElementById('rsvp-banner');
    expect(banner.textContent).toContain('2');
    expect(banner.textContent).toMatch(/events? without RSVP/i);
  });

  test('hides banner when all events are RSVP\'d', () => {
    const { renderEvents } = require('../src/popup');

    document.body.innerHTML = `
      <div id="rsvp-banner"></div>
      <div id="event-list"></div>
    `;

    const events = [
      { title: 'Event 1', dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST', location: 'Virtual', url: '/e/1', rsvpStatus: 'going' },
      { title: 'Event 2', dateTimeStr: 'Tuesday, Dec 9, 2:00 – 3:00 PM EST', location: 'Virtual', url: '/e/2', rsvpStatus: 'going' }
    ];

    renderEvents(events);

    const banner = document.getElementById('rsvp-banner');
    expect(banner.classList.contains('hidden') || banner.style.display === 'none').toBe(true);
  });

  test('shows urgency styling for events happening soon', () => {
    const { renderEvents } = require('../src/popup');

    document.body.innerHTML = '<div id="event-list"></div>';

    // Create an event happening "tomorrow" - we'll mock the date check
    const events = [{
      title: 'Urgent Event',
      dateTimeStr: 'Thursday, Dec 4, 10:00 – 11:00 AM EST',
      location: 'Virtual',
      url: '/c/live-events/urgent-event',
      rsvpStatus: 'none',
      isUrgent: true  // Flag set by date proximity check
    }];

    renderEvents(events);

    const card = document.querySelector('.event-card');
    expect(card.classList.contains('urgent') || card.querySelector('.urgent-badge')).toBeTruthy();
  });
});

// TDD Cycle 5.5: URL validation
describe('URL Validation', () => {
  test('validates correct live events URL', () => {
    const { isValidLiveEventsPage } = require('../src/popup');

    expect(isValidLiveEventsPage('https://community.dynamous.ai/c/live-events')).toBe(true);
    expect(isValidLiveEventsPage('https://community.dynamous.ai/c/live-events/')).toBe(true);
    expect(isValidLiveEventsPage('https://community.dynamous.ai/c/live-events?tab=upcoming')).toBe(true);
  });

  test('rejects other Circle.so pages', () => {
    const { isValidLiveEventsPage } = require('../src/popup');

    expect(isValidLiveEventsPage('https://community.dynamous.ai/c/general')).toBe(false);
    expect(isValidLiveEventsPage('https://community.dynamous.ai/')).toBe(false);
    expect(isValidLiveEventsPage('https://community.dynamous.ai/c/live-events/specific-event')).toBe(false);
  });

  test('rejects non-Dynamous URLs', () => {
    const { isValidLiveEventsPage } = require('../src/popup');

    expect(isValidLiveEventsPage('https://other-community.circle.so/c/live-events')).toBe(false);
    expect(isValidLiveEventsPage('https://google.com')).toBe(false);
  });

  test('shows redirect message for wrong page', () => {
    const { renderWrongPageMessage } = require('../src/popup');

    document.body.innerHTML = '<div id="event-list"></div>';

    renderWrongPageMessage();

    const container = document.getElementById('event-list');
    expect(container.textContent).toContain('community.dynamous.ai/c/live-events');
    expect(container.querySelector('a')).not.toBeNull();
  });
});

// Additional edge case tests for coverage
describe('Error handling edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('content script handles scrapeEvents error', () => {
    // Mock scrapeEvents to throw an error
    jest.resetModules();

    // Create a mock that throws
    jest.doMock('../src/scraper', () => ({
      scrapeEvents: jest.fn().mockImplementation(() => {
        throw new Error('DOM parsing failed');
      })
    }));

    const mockChromeWithError = {
      runtime: {
        onMessage: {
          addListener: jest.fn()
        }
      }
    };
    global.chrome = mockChromeWithError;

    let messageHandler;
    mockChromeWithError.runtime.onMessage.addListener.mockImplementation((handler) => {
      messageHandler = handler;
    });

    // Load content script with mocked scraper
    jest.isolateModules(() => {
      require('../src/content');
    });

    const sendResponse = jest.fn();
    messageHandler({ action: 'scanEvents' }, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: 'DOM parsing failed'
    });

    // Restore original chrome mock
    global.chrome = mockChrome;
  });

  test('isValidLiveEventsPage handles invalid URL', () => {
    const { isValidLiveEventsPage } = require('../src/popup');

    // Pass something that will throw in URL constructor
    expect(isValidLiveEventsPage('not-a-valid-url')).toBe(false);
    expect(isValidLiveEventsPage('')).toBe(false);
    expect(isValidLiveEventsPage(null)).toBe(false);
    expect(isValidLiveEventsPage(undefined)).toBe(false);
  });

  test('scanPageForEvents rejects when no active tab', async () => {
    mockChrome.tabs.query.mockImplementation((query, callback) => {
      callback([]); // Empty array - no tabs
    });

    const { scanPageForEvents } = require('../src/popup');

    await expect(scanPageForEvents()).rejects.toThrow('No active tab found');
  });

  test('scanPageForEvents rejects on chrome runtime error', async () => {
    mockChrome.tabs.query.mockImplementation((query, callback) => {
      callback([{ id: 123 }]);
    });

    mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
      // Simulate chrome.runtime.lastError
      mockChrome.runtime.lastError = { message: 'Could not establish connection' };
      callback(undefined);
      mockChrome.runtime.lastError = undefined; // Clean up
    });

    const { scanPageForEvents } = require('../src/popup');

    await expect(scanPageForEvents()).rejects.toThrow('Could not establish connection');
  });

  test('scanPageForEvents rejects on failed response', async () => {
    mockChrome.tabs.query.mockImplementation((query, callback) => {
      callback([{ id: 123 }]);
    });

    mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
      callback({ success: false, error: 'Scan failed' });
    });

    const { scanPageForEvents } = require('../src/popup');

    await expect(scanPageForEvents()).rejects.toThrow('Scan failed');
  });

  test('scanPageForEvents rejects with default message when response has no error', async () => {
    mockChrome.tabs.query.mockImplementation((query, callback) => {
      callback([{ id: 123 }]);
    });

    mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
      callback({ success: false }); // No error message
    });

    const { scanPageForEvents } = require('../src/popup');

    await expect(scanPageForEvents()).rejects.toThrow('Failed to scan events');
  });

  test('RSVP nudge onclick opens event URL', () => {
    const { renderEvents, setExportedEvents } = require('../src/popup');

    document.body.innerHTML = '<div id="event-list"></div>';
    setExportedEvents([]);

    global.open = jest.fn();

    const events = [{
      title: 'Non-RSVP Event',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      location: 'Virtual',
      url: '/c/live-events/non-rsvp-event',
      rsvpStatus: 'none'
    }];

    renderEvents(events);

    const nudge = document.querySelector('.rsvp-nudge');
    nudge.click();

    expect(global.open).toHaveBeenCalledWith(
      'https://community.dynamous.ai/c/live-events/non-rsvp-event',
      '_blank'
    );
  });

  test('RSVP nudge handles absolute URL', () => {
    const { renderEvents, setExportedEvents } = require('../src/popup');

    document.body.innerHTML = '<div id="event-list"></div>';
    setExportedEvents([]);

    global.open = jest.fn();

    const events = [{
      title: 'External Event',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      location: 'Virtual',
      url: 'https://example.com/event',
      rsvpStatus: 'none'
    }];

    renderEvents(events);

    const nudge = document.querySelector('.rsvp-nudge');
    nudge.click();

    expect(global.open).toHaveBeenCalledWith('https://example.com/event', '_blank');
  });

  test('disables Outlook button for already exported Outlook events', () => {
    const { renderEvents, setExportedEvents } = require('../src/popup');

    document.body.innerHTML = '<div id="event-list"></div>';

    setExportedEvents([
      { slug: 'event-1', exportType: 'outlook', timestamp: Date.now() }
    ]);

    const events = [{
      title: 'Already Exported to Outlook',
      slug: 'event-1',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      location: 'Virtual',
      url: '/c/live-events/event-1',
      rsvpStatus: 'going'
    }];

    renderEvents(events);

    const outlookBtn = document.querySelector('[data-export="outlook"]');
    expect(outlookBtn.disabled).toBe(true);
    expect(outlookBtn.classList.contains('disabled')).toBe(true);
  });

  test('disables ICS button for already exported ICS events', () => {
    const { renderEvents, setExportedEvents } = require('../src/popup');

    document.body.innerHTML = '<div id="event-list"></div>';

    setExportedEvents([
      { slug: 'event-1', exportType: 'ics', timestamp: Date.now() }
    ]);

    const events = [{
      title: 'Already Exported to ICS',
      slug: 'event-1',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      location: 'Virtual',
      url: '/c/live-events/event-1',
      rsvpStatus: 'going'
    }];

    renderEvents(events);

    const icsBtn = document.querySelector('[data-export="ics"]');
    expect(icsBtn.disabled).toBe(true);
    expect(icsBtn.classList.contains('disabled')).toBe(true);
  });

  test('renders event without location', () => {
    const { renderEvents, setExportedEvents } = require('../src/popup');

    document.body.innerHTML = '<div id="event-list"></div>';
    setExportedEvents([]);

    const events = [{
      title: 'No Location Event',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      location: '', // Empty location
      url: '/c/live-events/no-location',
      rsvpStatus: 'going'
    }];

    renderEvents(events);

    const card = document.querySelector('.event-card');
    const locationEl = card.querySelector('.event-location');
    expect(locationEl).toBeNull();
  });

  test('RSVP banner shows singular text for 1 event', () => {
    const { renderEvents, setExportedEvents } = require('../src/popup');

    document.body.innerHTML = `
      <div id="rsvp-banner"></div>
      <div id="event-list"></div>
    `;
    setExportedEvents([]);

    const events = [{
      title: 'Single Non-RSVP Event',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      location: 'Virtual',
      url: '/c/live-events/single-event',
      rsvpStatus: 'none'
    }];

    renderEvents(events);

    const banner = document.getElementById('rsvp-banner');
    expect(banner.textContent).toBe('1 event without RSVP');
  });

  test('setExportedEvents handles null/undefined', () => {
    const { setExportedEvents, renderEvents } = require('../src/popup');

    document.body.innerHTML = '<div id="event-list"></div>';

    // Should not throw
    setExportedEvents(null);
    setExportedEvents(undefined);

    // Verify cache was reset to empty array by checking button behavior
    const events = [{
      title: 'Test Event',
      slug: 'test-slug',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      location: 'Virtual',
      url: '/c/live-events/test',
      rsvpStatus: 'going'
    }];

    renderEvents(events);

    // All buttons should be enabled since cache is empty
    const googleBtn = document.querySelector('[data-export="google"]');
    expect(googleBtn.disabled).toBe(false);
  });

  test('renderEvents handles missing container gracefully', () => {
    const { renderEvents, setExportedEvents } = require('../src/popup');

    document.body.innerHTML = ''; // No event-list container
    setExportedEvents([]);

    // Should not throw
    expect(() => renderEvents([{ title: 'Test' }])).not.toThrow();
  });

  test('renderWrongPageMessage handles missing container gracefully', () => {
    const { renderWrongPageMessage } = require('../src/popup');

    document.body.innerHTML = ''; // No event-list container

    // Should not throw
    expect(() => renderWrongPageMessage()).not.toThrow();
  });

  test('updateRsvpBanner handles missing banner gracefully', () => {
    const { renderEvents, setExportedEvents } = require('../src/popup');

    document.body.innerHTML = '<div id="event-list"></div>'; // No rsvp-banner
    setExportedEvents([]);

    // Should not throw
    expect(() => renderEvents([{
      title: 'Test',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      url: '/test',
      rsvpStatus: 'none'
    }])).not.toThrow();
  });

  test('export button handles absolute URL in event', async () => {
    const { handleExport } = require('../src/popup');

    global.open = jest.fn();
    mockChrome.storage.local.get.mockImplementation((key, callback) => {
      callback({ exportedEvents: [] });
    });
    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
    });

    const event = {
      title: 'External Event',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      location: 'Virtual',
      url: 'https://external.example.com/event',
      rsvpStatus: 'going'
    };

    await handleExport('google', event);

    expect(global.open).toHaveBeenCalledTimes(1);
    const calledUrl = global.open.mock.calls[0][0];
    // The event URL should be used as-is since it starts with http
    expect(calledUrl).toContain('external.example.com');
  });

  test('calendar description includes RSVP going status', async () => {
    const { handleExport } = require('../src/popup');

    global.open = jest.fn();
    mockChrome.storage.local.get.mockImplementation((key, callback) => {
      callback({ exportedEvents: [] });
    });
    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
    });

    const event = {
      title: 'RSVP Going Event',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      location: 'Virtual',
      url: '/c/live-events/rsvp-going',
      rsvpStatus: 'going'
    };

    await handleExport('google', event);

    const calledUrl = global.open.mock.calls[0][0];
    expect(calledUrl).toContain('RSVP');
    expect(calledUrl).toContain('Going');
  });

  test('calendar description includes RSVP not confirmed status', async () => {
    const { handleExport } = require('../src/popup');

    global.open = jest.fn();
    mockChrome.storage.local.get.mockImplementation((key, callback) => {
      callback({ exportedEvents: [] });
    });
    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
    });

    const event = {
      title: 'RSVP None Event',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      location: 'Virtual',
      url: '/c/live-events/rsvp-none',
      rsvpStatus: 'none'
    };

    await handleExport('google', event);

    const calledUrl = global.open.mock.calls[0][0];
    expect(calledUrl).toContain('RSVP');
    expect(calledUrl).toContain('Not+yet+confirmed');
  });

  test('calendar description includes host when available', async () => {
    const { handleExport } = require('../src/popup');

    global.open = jest.fn();
    mockChrome.storage.local.get.mockImplementation((key, callback) => {
      callback({ exportedEvents: [] });
    });
    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
    });

    const event = {
      title: 'Hosted Event',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      location: 'Virtual',
      url: '/c/live-events/hosted-event',
      rsvpStatus: 'going'
    };

    await handleExport('google', event);

    const calledUrl = global.open.mock.calls[0][0];
    expect(calledUrl).toContain('Host');
    expect(calledUrl).toContain('Cole+Medin');
  });
});

// TDD Cycle 6: Export tracking with chrome.storage
describe('Export Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('saves exported event slug to chrome.storage', async () => {
    mockChrome.storage.local.get.mockImplementation((key, callback) => {
      callback({ exportedEvents: [] });
    });
    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
    });

    const { trackExport } = require('../src/popup');

    await trackExport('community-hangout-123', 'google');

    expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        exportedEvents: expect.arrayContaining([
          expect.objectContaining({
            slug: 'community-hangout-123',
            exportType: 'google'
          })
        ])
      }),
      expect.any(Function)
    );
  });

  test('retrieves previously exported events', async () => {
    const mockExports = [
      { slug: 'event-1', exportType: 'google', timestamp: Date.now() },
      { slug: 'event-2', exportType: 'ics', timestamp: Date.now() }
    ];

    mockChrome.storage.local.get.mockImplementation((key, callback) => {
      callback({ exportedEvents: mockExports });
    });

    const { getExportedEvents } = require('../src/popup');

    const result = await getExportedEvents();
    expect(result).toEqual(mockExports);
  });

  test('getExportedEvents returns empty array when storage is empty', async () => {
    mockChrome.storage.local.get.mockImplementation((key, callback) => {
      callback({}); // No exportedEvents key
    });

    const { getExportedEvents } = require('../src/popup');

    const result = await getExportedEvents();
    expect(result).toEqual([]);
  });

  test('trackExport handles empty storage', async () => {
    mockChrome.storage.local.get.mockImplementation((key, callback) => {
      callback({}); // No exportedEvents key - tests || [] fallback
    });
    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
    });

    const { trackExport } = require('../src/popup');

    await trackExport('new-event', 'outlook');

    expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        exportedEvents: expect.arrayContaining([
          expect.objectContaining({
            slug: 'new-event',
            exportType: 'outlook'
          })
        ])
      }),
      expect.any(Function)
    );
  });

  test('isEventExported returns false when storage is empty', async () => {
    mockChrome.storage.local.get.mockImplementation((key, callback) => {
      callback({}); // No exportedEvents key - tests || [] fallback
    });

    const { isEventExported } = require('../src/popup');

    expect(await isEventExported('any-event', 'google')).toBe(false);
  });

  test('checks if event was already exported', async () => {
    const mockExports = [
      { slug: 'event-1', exportType: 'google', timestamp: Date.now() }
    ];

    mockChrome.storage.local.get.mockImplementation((key, callback) => {
      callback({ exportedEvents: mockExports });
    });

    const { isEventExported } = require('../src/popup');

    expect(await isEventExported('event-1', 'google')).toBe(true);
    expect(await isEventExported('event-1', 'outlook')).toBe(false);
    expect(await isEventExported('event-2', 'google')).toBe(false);
  });

  test('renders exported badge for previously exported events', () => {
    const { renderEvents, setExportedEvents } = require('../src/popup');

    document.body.innerHTML = '<div id="event-list"></div>';

    // Pre-set exported events
    setExportedEvents([
      { slug: 'event-1', exportType: 'google', timestamp: Date.now() }
    ]);

    const events = [
      {
        title: 'Already Exported',
        slug: 'event-1',
        dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
        location: 'Virtual',
        url: '/c/live-events/event-1',
        rsvpStatus: 'going'
      }
    ];

    renderEvents(events);

    const card = document.querySelector('.event-card');
    const exportedBadge = card.querySelector('.exported-badge');
    expect(exportedBadge).not.toBeNull();
    expect(exportedBadge.textContent).toMatch(/exported/i);
  });

  test('disables export button for already exported type', () => {
    const { renderEvents, setExportedEvents } = require('../src/popup');

    document.body.innerHTML = '<div id="event-list"></div>';

    setExportedEvents([
      { slug: 'event-1', exportType: 'google', timestamp: Date.now() }
    ]);

    const events = [{
      title: 'Already Exported',
      slug: 'event-1',
      dateTimeStr: 'Monday, Dec 8, 1:00 – 2:00 PM EST',
      location: 'Virtual',
      url: '/c/live-events/event-1',
      rsvpStatus: 'going'
    }];

    renderEvents(events);

    const googleBtn = document.querySelector('[data-export="google"]');
    expect(googleBtn.disabled || googleBtn.classList.contains('disabled')).toBe(true);

    const outlookBtn = document.querySelector('[data-export="outlook"]');
    expect(outlookBtn.disabled || outlookBtn.classList.contains('disabled')).toBe(false);
  });
});
