const { generateICS } = require('../src/utils/icsGenerator');

describe('generateICS', () => {
  const baseEvent = {
    title: 'Community Hangout',
    startDate: new Date(2025, 11, 15, 13, 0, 0), // Dec 15, 2025 1:00 PM
    endDate: new Date(2025, 11, 15, 14, 0, 0),   // Dec 15, 2025 2:00 PM
    location: 'Virtual',
    url: 'https://community.dynamous.ai/c/live-events/community-hangout-123'
  };

  describe('ICS structure validation', () => {
    test('contains BEGIN:VCALENDAR header', () => {
      const ics = generateICS(baseEvent);
      expect(ics).toContain('BEGIN:VCALENDAR');
    });

    test('contains VERSION:2.0', () => {
      const ics = generateICS(baseEvent);
      expect(ics).toContain('VERSION:2.0');
    });

    test('contains PRODID', () => {
      const ics = generateICS(baseEvent);
      expect(ics).toMatch(/PRODID:.+/);
    });

    test('contains BEGIN:VEVENT / END:VEVENT block', () => {
      const ics = generateICS(baseEvent);
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('END:VEVENT');
    });

    test('contains DTSTART with correct format', () => {
      const ics = generateICS(baseEvent);
      expect(ics).toContain('DTSTART:20251215T130000');
    });

    test('contains DTEND with correct format', () => {
      const ics = generateICS(baseEvent);
      expect(ics).toContain('DTEND:20251215T140000');
    });

    test('contains SUMMARY with event title', () => {
      const ics = generateICS(baseEvent);
      expect(ics).toContain('SUMMARY:Community Hangout');
    });

    test('contains LOCATION when provided', () => {
      const ics = generateICS(baseEvent);
      expect(ics).toContain('LOCATION:Virtual');
    });

    test('contains URL when provided', () => {
      const ics = generateICS(baseEvent);
      expect(ics).toContain('URL:https://community.dynamous.ai/c/live-events/community-hangout-123');
    });

    test('contains UID for unique identification', () => {
      const ics = generateICS(baseEvent);
      expect(ics).toMatch(/UID:.+/);
    });

    test('contains DTSTAMP', () => {
      const ics = generateICS(baseEvent);
      expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
    });

    test('ends with END:VCALENDAR', () => {
      const ics = generateICS(baseEvent);
      expect(ics.trim()).toMatch(/END:VCALENDAR$/);
    });
  });

  describe('ICS content handling', () => {
    test('escapes special characters in SUMMARY', () => {
      const event = {
        ...baseEvent,
        title: 'Office Hours/ Q&A: Test, Event; More'
      };
      const ics = generateICS(event);
      // ICS escapes commas, semicolons, and backslashes
      expect(ics).toContain('SUMMARY:Office Hours/ Q&A: Test\\, Event\\; More');
    });

    test('includes DESCRIPTION when provided', () => {
      const event = {
        ...baseEvent,
        description: 'Join us for a community hangout session!'
      };
      const ics = generateICS(event);
      expect(ics).toContain('DESCRIPTION:Join us for a community hangout session!');
    });

    test('escapes special characters in DESCRIPTION', () => {
      const event = {
        ...baseEvent,
        description: 'Topics: AI, ML; More info\nNew line here'
      };
      const ics = generateICS(event);
      expect(ics).toContain('DESCRIPTION:Topics: AI\\, ML\\; More info\\nNew line here');
    });

    test('omits LOCATION when not provided', () => {
      const event = {
        title: 'Simple Event',
        startDate: new Date(2025, 11, 15, 13, 0, 0),
        endDate: new Date(2025, 11, 15, 14, 0, 0)
      };
      const ics = generateICS(event);
      expect(ics).not.toContain('LOCATION:');
    });

    test('omits URL when not provided', () => {
      const event = {
        title: 'Simple Event',
        startDate: new Date(2025, 11, 15, 13, 0, 0),
        endDate: new Date(2025, 11, 15, 14, 0, 0)
      };
      const ics = generateICS(event);
      expect(ics).not.toMatch(/^URL:/m);
    });

    test('omits DESCRIPTION when not provided', () => {
      const ics = generateICS(baseEvent);
      expect(ics).not.toContain('DESCRIPTION:');
    });
  });

  describe('ICS file format requirements', () => {
    test('line endings are CRLF (\\r\\n)', () => {
      const ics = generateICS(baseEvent);
      // Should contain CRLF line endings
      expect(ics).toContain('\r\n');
      // Should not have bare LF without CR
      const lines = ics.split('\r\n');
      lines.forEach(line => {
        expect(line).not.toContain('\n');
      });
    });

    test('lines do not exceed 75 characters (folded if needed)', () => {
      const event = {
        ...baseEvent,
        description: 'This is a very long description that should be folded according to RFC 5545 requirements for line length limits in ICS files.'
      };
      const ics = generateICS(event);
      const lines = ics.split('\r\n');
      lines.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(75);
      });
    });
  });

  describe('generateICSFile helper', () => {
    test('generates unique UIDs for different events', () => {
      const event1 = { ...baseEvent, title: 'Event 1' };
      const event2 = { ...baseEvent, title: 'Event 2' };

      const ics1 = generateICS(event1);
      const ics2 = generateICS(event2);

      const uid1 = ics1.match(/UID:(.+)/)[1];
      const uid2 = ics2.match(/UID:(.+)/)[1];

      expect(uid1).not.toBe(uid2);
    });
  });
});
