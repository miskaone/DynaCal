# CLAUDE.md — Circle.so Calendar Exporter

## Project Overview

**Goal:** Build a Chrome Extension (Manifest V3) that scrapes calendar events from Circle.so community pages and exports them to Google Calendar, Outlook, or ICS files.

**Methodology:** Test-Driven Development (TDD) — Red → Green → Refactor

---

## Reference Documents

| Document | Purpose |
|----------|---------|
| `Product_Requirements_Document__PRD_.md` | Business requirements, user stories, acceptance criteria |
| `Project_Details.md` | Technical architecture, implementation reference |

---

## Development Principles

### TDD Cycle (Strict Adherence)

1. **RED:** Write a failing test that defines expected behavior
2. **GREEN:** Write minimal code to make the test pass
3. **REFACTOR:** Clean up code while keeping tests green

### Key Constraints

- **No production code without a failing test first**
- **One test at a time** — complete the cycle before adding complexity
- **Tests are documentation** — they describe what the system does

---

## Project Structure

```
circle-calendar-exporter/
├── CLAUDE.md                    # This file (orchestration)
├── manifest.json                # Chrome extension config
├── src/
│   ├── content.js               # DOM scraping logic
│   ├── popup.html               # Extension UI
│   ├── popup.js                 # UI logic & export generation
│   └── utils/
│       ├── dateParser.js        # Date/time parsing utilities
│       ├── calendarLinks.js     # Google/Outlook URL generators
│       └── icsGenerator.js      # ICS file generation
├── tests/
│   ├── setup.js                 # Test environment setup
│   ├── dateParser.test.js       # Date parsing unit tests
│   ├── calendarLinks.test.js    # Link generation tests
│   ├── icsGenerator.test.js     # ICS format tests
│   ├── scraper.test.js          # DOM scraping tests
│   └── integration.test.js      # End-to-end flow tests
├── fixtures/
│   └── mockDom.html             # Sample Circle.so DOM structure
├── package.json                 # Dependencies (Jest)
└── jest.config.js               # Test configuration
```

---

## Implementation Phases

### Phase 1: Foundation & Date Parsing

**Objective:** Build bulletproof date/time parsing from scraped strings.

#### Test Cases (dateParser.test.js)

```javascript
// TDD Cycle 1.1: Parse standard time formats
describe('parseTime', () => {
  test('parses "1:00PM" to { hours: 13, minutes: 0 }', () => {});
  test('parses "10:00AM" to { hours: 10, minutes: 0 }', () => {});
  test('parses "12:00PM" (noon) to { hours: 12, minutes: 0 }', () => {});
  test('parses "12:00AM" (midnight) to { hours: 0, minutes: 0 }', () => {});
  test('handles space before AM/PM: "1:00 PM"', () => {});
  test('handles lowercase: "1:00pm"', () => {});
  test('returns null for invalid input', () => {});
});

// TDD Cycle 1.2: Combine date object with time
describe('parseDateTime', () => {
  test('creates Date from { day: 15, month: 11, year: 2025 } and "1:00PM"', () => {});
  test('handles month boundary (Dec 31 → Jan 1)', () => {});
  test('handles year boundary correctly', () => {});
});

// TDD Cycle 1.3: Format dates for calendar URLs
describe('formatISODate', () => {
  test('formats Date to "20251215T130000Z" style', () => {});
  test('pads single-digit values correctly', () => {});
});
```

#### Acceptance Criteria (from PRD FR-3.1)
- Dates converted to ISO format: `YYYYMMDDTHHmmSS`
- Local timezone preserved from browser

---

### Phase 2: Calendar Link Generation

**Objective:** Generate valid deep links for Google Calendar and Outlook.

#### Test Cases (calendarLinks.test.js)

```javascript
// TDD Cycle 2.1: Google Calendar URL
describe('generateGCalLink', () => {
  test('generates valid Google Calendar URL structure', () => {});
  test('encodes special characters in title', () => {});
  test('includes start and end dates in dates parameter', () => {});
  test('default duration is 1 hour (FR-3.2)', () => {});
});

// TDD Cycle 2.2: Outlook Web URL
describe('generateOutlookLink', () => {
  test('generates valid Outlook deeplink structure', () => {});
  test('uses ISO format for startdt/enddt parameters', () => {});
  test('encodes subject correctly', () => {});
});
```

#### Expected URL Formats (from PRD FR-3.3, FR-3.4)

**Google:**
```
https://www.google.com/calendar/render?action=TEMPLATE&text={title}&dates={start}/{end}
```

**Outlook:**
```
https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&startdt={iso}&enddt={iso}&subject={title}
```

---

### Phase 3: ICS File Generation

**Objective:** Generate valid VCALENDAR 2.0 format files.

#### Test Cases (icsGenerator.test.js)

```javascript
// TDD Cycle 3.1: ICS structure validation
describe('generateICS', () => {
  test('contains BEGIN:VCALENDAR header', () => {});
  test('contains VERSION:2.0', () => {});
  test('contains BEGIN:VEVENT / END:VEVENT block', () => {});
  test('contains DTSTART with correct format', () => {});
  test('contains DTEND with correct format', () => {});
  test('contains SUMMARY with event title', () => {});
  test('escapes special characters in SUMMARY', () => {});
  test('ends with END:VCALENDAR', () => {});
});

// TDD Cycle 3.2: ICS content integrity
describe('ICS file validity', () => {
  test('line endings are CRLF (\\r\\n)', () => {});
  test('lines do not exceed 75 characters', () => {});
});
```

#### Expected ICS Format (from PRD FR-3.5)

```
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20251215T130000
DTEND:20251215T140000
SUMMARY:Community Hangout
END:VEVENT
END:VCALENDAR
```

---

### Phase 4: DOM Scraping Logic

**Objective:** Extract events from Circle.so calendar grid reliably.

#### Test Cases (scraper.test.js)

```javascript
// TDD Cycle 4.1: Month/Year detection (FR-1.1)
describe('extractMonthYear', () => {
  test('finds "December 2025" in header element', () => {});
  test('returns null when no header found', () => {});
  test('handles different header tag types (h2, h3, div)', () => {});
});

// TDD Cycle 4.2: Date mapping (FR-1.2)
describe('mapGridCells', () => {
  test('identifies current month days', () => {});
  test('identifies previous month trailing days', () => {});
  test('identifies next month leading days', () => {});
  test('handles month with 31 days', () => {});
  test('handles February (28/29 days)', () => {});
});

// TDD Cycle 4.3: Event extraction (FR-1.3)
describe('extractEventsFromCell', () => {
  test('extracts time from "1:00PM Community Hangout"', () => {});
  test('extracts title after removing time', () => {});
  test('handles multiple events in one cell', () => {});
  test('strips whitespace and newlines from title', () => {});
  test('returns empty array for cells with no events', () => {});
});

// TDD Cycle 4.4: Full scrape integration
describe('scrapeCalendar', () => {
  test('returns array of event objects with title, date, time', () => {});
  test('returns empty array when not on calendar view (US-5)', () => {});
});
```

#### Mock DOM Structure (fixtures/mockDom.html)

```html
<!-- Simplified Circle.so calendar structure for testing -->
<div class="calendar">
  <h2>December 2025</h2>
  <div class="grid">
    <div class="cell">
      <span>1</span>
      <div class="event">1:00PM Community Hangout</div>
    </div>
    <!-- More cells... -->
  </div>
</div>
```

---

### Phase 5: Chrome Extension Integration

**Objective:** Wire components into working extension.

#### Test Cases (integration.test.js)

```javascript
// TDD Cycle 5.1: Message passing
describe('Chrome messaging', () => {
  test('content script responds to "scanEvents" action', () => {});
  test('popup receives event data from content script', () => {});
});

// TDD Cycle 5.2: UI rendering
describe('Popup UI', () => {
  test('displays "No events found" when array is empty (US-5)', () => {});
  test('renders event card for each event', () => {});
  test('event card contains Google, Outlook, ICS buttons', () => {});
});

// TDD Cycle 5.3: Export actions
describe('Export buttons', () => {
  test('Google button opens new tab with calendar URL (US-2)', () => {});
  test('Outlook button opens new tab with outlook URL (US-3)', () => {});
  test('ICS button triggers file download (US-4)', () => {});
});
```

---

## Test Environment Setup

### package.json

```json
{
  "name": "circle-calendar-exporter",
  "version": "1.0.0",
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0"
  }
}
```

### jest.config.js

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleFileExtensions: ['js'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### tests/setup.js

```javascript
// Mock Chrome APIs for testing
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn()
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn()
  }
};
```

---

## TDD Workflow Commands

```bash
# Initial setup
npm install

# Start TDD cycle (watch mode)
npm run test:watch

# Run full test suite
npm test

# Generate coverage report
npm run test:coverage
```

---

## Definition of Done

### Per Feature
- [ ] All tests pass (green)
- [ ] Code coverage ≥ 80%
- [ ] No console errors in browser testing
- [ ] Manual verification on live Circle.so page

### Project Complete
- [ ] All User Stories (US-1 through US-5) have passing tests
- [ ] All Functional Requirements verified
- [ ] Extension loads in Chrome without errors
- [ ] Successfully exports to Google, Outlook, and ICS

---

## Non-Functional Verification

| Requirement | Test Method |
|-------------|-------------|
| **NFR-1 Privacy:** No external data transmission | Code review: no fetch/XMLHttpRequest calls |
| **NFR-2 Performance:** Scan < 500ms | Performance.now() measurement in tests |
| **NFR-3 Compatibility:** Chromium browsers | Manual test in Chrome, Edge, Brave |
| **NFR-4 Robustness:** Fuzzy selectors | Tests use varied DOM structures |

---

## Troubleshooting Guide

### Common Issues

**"No events found" on valid calendar page**
- Check: Is the month/year header regex matching?
- Check: Are grid cell selectors finding elements?
- Debug: Add console.log in scrapeCalendar()

**Calendar links open but dates are wrong**
- Check: Is timezone being handled correctly?
- Check: Is month 0-indexed vs 1-indexed correctly?
- Debug: Log startDate.toISOString() before URL generation

**ICS file won't import**
- Check: Are line endings CRLF?
- Check: Is DTSTART/DTEND format correct?
- Validate: Use online ICS validator

---

## Git Workflow

```bash
# Feature branch naming
git checkout -b feature/phase-{N}-{description}

# Commit message format (TDD)
git commit -m "RED: Add test for parseTime with PM format"
git commit -m "GREEN: Implement parseTime function"
git commit -m "REFACTOR: Extract time regex to constant"
```

---

## Quick Reference: User Stories → Tests

| User Story | Test File | Key Test Cases |
|------------|-----------|----------------|
| US-1: Scan page for events | scraper.test.js | `scrapeCalendar()` returns events |
| US-2: Add to Google Calendar | calendarLinks.test.js | `generateGCalLink()` valid URL |
| US-3: Add to Outlook Web | calendarLinks.test.js | `generateOutlookLink()` valid URL |
| US-4: Download ICS | icsGenerator.test.js | `generateICS()` valid format |
| US-5: No events message | integration.test.js | Empty state displays message |

---

## Next Steps

1. Run `npm init -y && npm install jest jest-environment-jsdom --save-dev`
2. Create first test file: `tests/dateParser.test.js`
3. Write first failing test for `parseTime('1:00PM')`
4. Begin TDD cycle: RED → GREEN → REFACTOR
