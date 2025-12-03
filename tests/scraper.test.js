const fs = require('fs');
const path = require('path');
const { scrapeEvents, extractEventFromCard } = require('../src/scraper');

// Load mock HTML fixture
const mockHTML = fs.readFileSync(
  path.join(__dirname, '../fixtures/mockEventsList.html'),
  'utf8'
);

describe('scrapeEvents', () => {
  beforeEach(() => {
    document.body.innerHTML = mockHTML;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('returns an array of events', () => {
    const events = scrapeEvents();
    expect(Array.isArray(events)).toBe(true);
  });

  test('finds all 4 events in the mock DOM', () => {
    const events = scrapeEvents();
    expect(events).toHaveLength(4);
  });

  test('extracts event title correctly', () => {
    const events = scrapeEvents();
    expect(events[0].title).toBe('Agentic Coding Office Hours');
    expect(events[1].title).toBe('Community Workshop - Adding Slack to Our Remote AI Coding System');
    expect(events[2].title).toBe('Community Hangout');
  });

  test('decodes HTML entities in title', () => {
    const events = scrapeEvents();
    // "Office Hours/ Q&amp;A" should become "Office Hours/ Q&A"
    expect(events[3].title).toBe('Office Hours/ Q&A');
  });

  test('extracts event URL correctly', () => {
    const events = scrapeEvents();
    expect(events[0].url).toBe('/c/live-events/agentic-coding-office-hours-62a689');
    expect(events[2].url).toBe('/c/live-events/community-hangout-a59990');
  });

  test('extracts event slug from URL', () => {
    const events = scrapeEvents();
    expect(events[0].slug).toBe('agentic-coding-office-hours-62a689');
    expect(events[1].slug).toBe('community-workshop-1d6d6f');
  });

  test('extracts datetime string correctly', () => {
    const events = scrapeEvents();
    expect(events[0].dateTimeStr).toBe('Thursday, Dec 4, 10:00 – 11:00 AM EST');
    expect(events[1].dateTimeStr).toBe('Friday, Dec 5, 12:00 – 1:30 PM EST');
    expect(events[2].dateTimeStr).toBe('Monday, Dec 8, 1:00 – 2:00 PM EST');
  });

  test('extracts location correctly', () => {
    const events = scrapeEvents();
    expect(events[0].location).toBe('Virtual');
    expect(events[2].location).toBe('TBD');
  });

  test('detects RSVP status - not RSVP\'d', () => {
    const events = scrapeEvents();
    expect(events[0].rsvpStatus).toBe('none');
    expect(events[1].rsvpStatus).toBe('none');
  });

  test('detects RSVP status - going', () => {
    const events = scrapeEvents();
    expect(events[2].rsvpStatus).toBe('going');
    expect(events[3].rsvpStatus).toBe('going');
  });

  test('returns empty array when no events found', () => {
    document.body.innerHTML = '<div>No events here</div>';
    const events = scrapeEvents();
    expect(events).toEqual([]);
  });

  test('extracts thumbnail URL when available', () => {
    const events = scrapeEvents();
    expect(events[0].thumbnailUrl).toBe('https://example.com/thumbnail1.png');
  });
});

describe('extractEventFromCard', () => {
  beforeEach(() => {
    document.body.innerHTML = mockHTML;
  });

  test('returns null for invalid card element', () => {
    const result = extractEventFromCard(null);
    expect(result).toBeNull();
  });

  test('returns null for card without event data', () => {
    document.body.innerHTML = '<div class="border-primary border-b p-6"><span>Not an event</span></div>';
    const card = document.querySelector('.border-primary.border-b.p-6');
    const result = extractEventFromCard(card);
    expect(result).toBeNull();
  });

  test('extracts all event properties from a valid card', () => {
    const cards = document.querySelectorAll('.border-primary.border-b.p-6');
    const event = extractEventFromCard(cards[0]);

    expect(event).toMatchObject({
      title: 'Agentic Coding Office Hours',
      url: '/c/live-events/agentic-coding-office-hours-62a689',
      slug: 'agentic-coding-office-hours-62a689',
      dateTimeStr: 'Thursday, Dec 4, 10:00 – 11:00 AM EST',
      location: 'Virtual',
      rsvpStatus: 'none'
    });
  });
});

describe('scrapeEvents with reference year', () => {
  beforeEach(() => {
    document.body.innerHTML = mockHTML;
  });

  test('accepts optional reference year parameter', () => {
    const events = scrapeEvents(2025);
    expect(events).toHaveLength(4);
  });

  test('uses current year if reference year not provided', () => {
    const events = scrapeEvents();
    expect(events).toHaveLength(4);
    // Events should still be extracted even without explicit year
  });
});

describe('scrapeEvents edge cases', () => {
  test('handles card without thumbnail image', () => {
    document.body.innerHTML = `
      <div class="border-primary border-b p-6">
        <div class="flex w-full justify-between" data-testid="event-main-content">
          <div class="flex flex-col justify-start">
            <a class="text-base font-semibold" href="/c/live-events/test-event-123">Test Event</a>
            <div class="flex flex-col items-start gap-2">
              <div class="flex items-center gap-x-2">
                <span class="text-xs">Monday, Dec 8, 1:00 – 2:00 PM EST</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    const events = scrapeEvents();
    expect(events).toHaveLength(1);
    expect(events[0].thumbnailUrl).toBeNull();
  });

  test('handles alternative datetime format in span.text-xs', () => {
    document.body.innerHTML = `
      <div class="border-primary border-b p-6">
        <div class="flex w-full justify-between" data-testid="event-main-content">
          <div class="flex flex-col justify-start">
            <a class="text-base font-semibold" href="/c/live-events/alt-event-456">Alt Format Event</a>
            <div class="other-container">
              <span class="text-xs">Tuesday, Jan 7, 3:00 – 4:00 PM PST</span>
              <span class="text-xs">Conference Room A</span>
            </div>
          </div>
        </div>
      </div>
    `;
    const events = scrapeEvents();
    expect(events).toHaveLength(1);
    expect(events[0].dateTimeStr).toBe('Tuesday, Jan 7, 3:00 – 4:00 PM PST');
  });

  test('returns null when card has no title link', () => {
    document.body.innerHTML = `
      <div class="border-primary border-b p-6">
        <div class="flex w-full justify-between" data-testid="event-main-content">
          <div class="flex flex-col justify-start">
            <span class="text-base font-semibold">Not a link</span>
            <div class="flex items-center gap-x-2">
              <span class="text-xs">Monday, Dec 8, 1:00 – 2:00 PM EST</span>
            </div>
          </div>
        </div>
      </div>
    `;
    const events = scrapeEvents();
    expect(events).toHaveLength(0);
  });

  test('returns null when datetime spans are empty', () => {
    document.body.innerHTML = `
      <div class="border-primary border-b p-6">
        <div class="flex w-full justify-between" data-testid="event-main-content">
          <div class="flex flex-col justify-start">
            <a class="text-base font-semibold" href="/c/live-events/no-date-event">No Date Event</a>
          </div>
        </div>
      </div>
    `;
    const events = scrapeEvents();
    expect(events).toHaveLength(0);
  });

  test('handles rsvp-radio without Going text', () => {
    document.body.innerHTML = `
      <div class="border-primary border-b p-6">
        <div class="flex w-full justify-between" data-testid="event-main-content">
          <div class="flex flex-col justify-start">
            <a class="text-base font-semibold" href="/c/live-events/maybe-event">Maybe Event</a>
            <div class="flex items-center gap-x-2">
              <span class="text-xs">Wednesday, Dec 11, 2:00 – 3:00 PM EST</span>
            </div>
          </div>
          <div class="rsvp-radio">
            <button class="rsvp-radio__button">
              <span class="button-text">Maybe</span>
            </button>
          </div>
        </div>
      </div>
    `;
    const events = scrapeEvents();
    expect(events).toHaveLength(1);
    expect(events[0].rsvpStatus).toBe('none');
  });

  test('uses fallback datetime when first span does not match time pattern', () => {
    document.body.innerHTML = `
      <div class="border-primary border-b p-6">
        <div class="flex w-full justify-between" data-testid="event-main-content">
          <div class="flex flex-col justify-start">
            <a class="text-base font-semibold" href="/c/live-events/fallback-event">Fallback Event</a>
            <div class="flex flex-col items-start gap-2">
              <div class="flex items-center gap-x-2">
                <span class="text-xs">Thursday, Dec 12, 9:00 – 10:00 AM EST</span>
              </div>
              <div class="flex items-center gap-x-2">
                <span class="text-xs">Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    const events = scrapeEvents();
    expect(events).toHaveLength(1);
    expect(events[0].dateTimeStr).toBe('Thursday, Dec 12, 9:00 – 10:00 AM EST');
    expect(events[0].location).toBe('Online');
  });

  test('defaults location to TBD when not found', () => {
    document.body.innerHTML = `
      <div class="border-primary border-b p-6">
        <div class="flex w-full justify-between" data-testid="event-main-content">
          <div class="flex flex-col justify-start">
            <a class="text-base font-semibold" href="/c/live-events/no-location">No Location Event</a>
            <div class="flex items-center gap-x-2">
              <span class="text-xs">Friday, Dec 13, 11:00 – 12:00 PM EST</span>
            </div>
          </div>
        </div>
      </div>
    `;
    const events = scrapeEvents();
    expect(events).toHaveLength(1);
    expect(events[0].location).toBe('TBD');
  });

  test('uses first span as fallback datetime when no time pattern match (index 0)', () => {
    // This tests line 79: first span doesn't match time pattern but is used as datetime fallback
    document.body.innerHTML = `
      <div class="border-primary border-b p-6">
        <div class="flex w-full justify-between" data-testid="event-main-content">
          <div class="flex flex-col justify-start">
            <a class="text-base font-semibold" href="/c/live-events/fallback-test">Fallback Test</a>
            <div class="flex items-center gap-x-2">
              <span class="text-xs">Saturday, Dec 14</span>
            </div>
          </div>
        </div>
      </div>
    `;
    const events = scrapeEvents();
    // The first span "Saturday, Dec 14" doesn't match the time pattern,
    // but it's at index 0 so it gets used as fallback datetime
    // However, the alternative selector also won't match, so it will use "Saturday, Dec 14"
    expect(events).toHaveLength(1);
    expect(events[0].dateTimeStr).toBe('Saturday, Dec 14');
  });

  test('skips duplicate text spans (text === dateTimeStr branch)', () => {
    // Tests line 80: when text equals dateTimeStr, it should be skipped
    document.body.innerHTML = `
      <div class="border-primary border-b p-6">
        <div class="flex w-full justify-between" data-testid="event-main-content">
          <div class="flex flex-col justify-start">
            <a class="text-base font-semibold" href="/c/live-events/dup-test">Duplicate Text Test</a>
            <div class="flex items-center gap-x-2">
              <span class="text-xs">Monday, Dec 15, 2:00 – 3:00 PM EST</span>
            </div>
            <div class="flex items-center gap-x-2">
              <span class="text-xs">Monday, Dec 15, 2:00 – 3:00 PM EST</span>
            </div>
            <div class="flex items-center gap-x-2">
              <span class="text-xs">Virtual</span>
            </div>
          </div>
        </div>
      </div>
    `;
    const events = scrapeEvents();
    expect(events).toHaveLength(1);
    expect(events[0].dateTimeStr).toBe('Monday, Dec 15, 2:00 – 3:00 PM EST');
    expect(events[0].location).toBe('Virtual');
  });

  test('alternative selector iterates through non-matching spans before finding match', () => {
    // Tests line 91: alternative selector loop where some spans don't match
    document.body.innerHTML = `
      <div class="border-primary border-b p-6">
        <div class="flex w-full justify-between" data-testid="event-main-content">
          <div class="flex flex-col justify-start">
            <a class="text-base font-semibold" href="/c/live-events/multi-span">Multi Span Test</a>
            <div class="custom-container">
              <span class="text-xs">Some Label</span>
              <span class="text-xs">Another Label</span>
              <span class="text-xs">Tuesday, Dec 16, 4:00 – 5:00 PM EST</span>
            </div>
          </div>
        </div>
      </div>
    `;
    const events = scrapeEvents();
    expect(events).toHaveLength(1);
    expect(events[0].dateTimeStr).toBe('Tuesday, Dec 16, 4:00 – 5:00 PM EST');
  });

  test('skips empty text spans in forEach loop', () => {
    // Tests line 80: when text is empty (falsy), it should be skipped
    document.body.innerHTML = `
      <div class="border-primary border-b p-6">
        <div class="flex w-full justify-between" data-testid="event-main-content">
          <div class="flex flex-col justify-start">
            <a class="text-base font-semibold" href="/c/live-events/empty-span">Empty Span Test</a>
            <div class="flex items-center gap-x-2">
              <span class="text-xs">Wednesday, Dec 17, 10:00 – 11:00 AM EST</span>
            </div>
            <div class="flex items-center gap-x-2">
              <span class="text-xs">   </span>
            </div>
            <div class="flex items-center gap-x-2">
              <span class="text-xs"></span>
            </div>
            <div class="flex items-center gap-x-2">
              <span class="text-xs">Online</span>
            </div>
          </div>
        </div>
      </div>
    `;
    const events = scrapeEvents();
    expect(events).toHaveLength(1);
    expect(events[0].dateTimeStr).toBe('Wednesday, Dec 17, 10:00 – 11:00 AM EST');
    expect(events[0].location).toBe('Online');
  });

  test('uses alternative selector for datetime when primary selector fails', () => {
    // This tests line 91: alternative selector finds datetime in span.text-xs outside .flex.items-center.gap-x-2
    document.body.innerHTML = `
      <div class="border-primary border-b p-6">
        <div class="flex w-full justify-between" data-testid="event-main-content">
          <div class="flex flex-col justify-start">
            <a class="text-base font-semibold" href="/c/live-events/alt-selector">Alt Selector Event</a>
            <div class="some-other-container">
              <span class="text-xs">Sunday, Dec 15, 3:00 – 4:00 PM EST</span>
            </div>
          </div>
        </div>
      </div>
    `;
    const events = scrapeEvents();
    expect(events).toHaveLength(1);
    expect(events[0].dateTimeStr).toBe('Sunday, Dec 15, 3:00 – 4:00 PM EST');
  });

  test('handles error during extraction gracefully', () => {
    // Create a mock card that will cause an error when querySelector is called
    const mockCard = {
      querySelector: jest.fn().mockImplementation((selector) => {
        if (selector === '[data-testid="event-main-content"]') {
          return {
            querySelector: jest.fn().mockImplementation(() => {
              throw new Error('Simulated DOM error');
            }),
            querySelectorAll: jest.fn().mockReturnValue([])
          };
        }
        return null;
      })
    };

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = extractEventFromCard(mockCard);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error extracting event from card:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
