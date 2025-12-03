const { parseTime, parseDateTime, formatISODate, parseEventDateTime } = require('../src/utils/dateParser');

// TDD Cycle 1.1: Parse standard time formats
describe('parseTime', () => {
  test('parses "1:00PM" to { hours: 13, minutes: 0 }', () => {
    expect(parseTime('1:00PM')).toEqual({ hours: 13, minutes: 0 });
  });

  test('parses "10:00AM" to { hours: 10, minutes: 0 }', () => {
    expect(parseTime('10:00AM')).toEqual({ hours: 10, minutes: 0 });
  });

  test('parses "12:00PM" (noon) to { hours: 12, minutes: 0 }', () => {
    expect(parseTime('12:00PM')).toEqual({ hours: 12, minutes: 0 });
  });

  test('parses "12:00AM" (midnight) to { hours: 0, minutes: 0 }', () => {
    expect(parseTime('12:00AM')).toEqual({ hours: 0, minutes: 0 });
  });

  test('handles space before AM/PM: "1:00 PM"', () => {
    expect(parseTime('1:00 PM')).toEqual({ hours: 13, minutes: 0 });
  });

  test('handles lowercase: "1:00pm"', () => {
    expect(parseTime('1:00pm')).toEqual({ hours: 13, minutes: 0 });
  });

  test('returns null for invalid input', () => {
    expect(parseTime('invalid')).toBeNull();
    expect(parseTime('')).toBeNull();
    expect(parseTime('25:00PM')).toBeNull();
  });
});

// TDD Cycle 1.2: Combine date object with time
describe('parseDateTime', () => {
  test('creates Date from { day: 15, month: 12, year: 2025 } and "1:00PM"', () => {
    const result = parseDateTime({ day: 15, month: 12, year: 2025 }, '1:00PM');
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(11); // 0-indexed
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(13);
    expect(result.getMinutes()).toBe(0);
  });

  test('handles month boundary (Dec 31)', () => {
    const result = parseDateTime({ day: 31, month: 12, year: 2025 }, '11:59PM');
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(11);
    expect(result.getDate()).toBe(31);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
  });

  test('returns null for invalid time', () => {
    const result = parseDateTime({ day: 15, month: 12, year: 2025 }, 'invalid');
    expect(result).toBeNull();
  });
});

// TDD Cycle 1.3: Format dates for calendar URLs
describe('formatISODate', () => {
  test('formats Date to "20251215T130000" style', () => {
    const date = new Date(2025, 11, 15, 13, 0, 0); // Dec 15, 2025 1:00 PM
    expect(formatISODate(date)).toBe('20251215T130000');
  });

  test('pads single-digit values correctly', () => {
    const date = new Date(2025, 0, 5, 9, 5, 0); // Jan 5, 2025 9:05 AM
    expect(formatISODate(date)).toBe('20250105T090500');
  });

  test('handles midnight correctly', () => {
    const date = new Date(2025, 11, 31, 0, 0, 0); // Dec 31, 2025 12:00 AM
    expect(formatISODate(date)).toBe('20251231T000000');
  });

  test('handles end of day correctly', () => {
    const date = new Date(2025, 11, 31, 23, 59, 59); // Dec 31, 2025 11:59:59 PM
    expect(formatISODate(date)).toBe('20251231T235959');
  });
});

// TDD Cycle 1b: Parse list view event datetime format
describe('parseEventDateTime', () => {
  // Note: Tests use a fixed reference year of 2025 for consistency
  const referenceYear = 2025;

  test('parses standard format "Thursday, Dec 4, 10:00 – 11:00 AM EST"', () => {
    const result = parseEventDateTime('Thursday, Dec 4, 10:00 – 11:00 AM EST', referenceYear);
    expect(result).not.toBeNull();
    expect(result.startDate.getMonth()).toBe(11); // December (0-indexed)
    expect(result.startDate.getDate()).toBe(4);
    expect(result.startDate.getHours()).toBe(10);
    expect(result.startDate.getMinutes()).toBe(0);
    expect(result.endDate.getHours()).toBe(11);
    expect(result.endDate.getMinutes()).toBe(0);
    expect(result.timezone).toBe('EST');
  });

  test('parses format with different duration "Friday, Dec 5, 12:00 – 1:30 PM EST"', () => {
    const result = parseEventDateTime('Friday, Dec 5, 12:00 – 1:30 PM EST', referenceYear);
    expect(result).not.toBeNull();
    expect(result.startDate.getDate()).toBe(5);
    expect(result.startDate.getHours()).toBe(12);
    expect(result.startDate.getMinutes()).toBe(0);
    expect(result.endDate.getHours()).toBe(13);
    expect(result.endDate.getMinutes()).toBe(30);
  });

  test('parses PM to PM time range "Wednesday, Dec 10, 5:00 – 6:00 PM EST"', () => {
    const result = parseEventDateTime('Wednesday, Dec 10, 5:00 – 6:00 PM EST', referenceYear);
    expect(result).not.toBeNull();
    expect(result.startDate.getHours()).toBe(17);
    expect(result.endDate.getHours()).toBe(18);
  });

  test('parses AM to AM time range "Tuesday, Dec 9, 10:00 – 11:00 AM EST"', () => {
    const result = parseEventDateTime('Tuesday, Dec 9, 10:00 – 11:00 AM EST', referenceYear);
    expect(result).not.toBeNull();
    expect(result.startDate.getHours()).toBe(10);
    expect(result.endDate.getHours()).toBe(11);
  });

  test('handles January dates with year rollover', () => {
    // If current month is December 2025 and we see "Jan 2", it should be 2026
    const result = parseEventDateTime('Thursday, Jan 2, 10:00 – 11:00 AM EST', referenceYear);
    expect(result).not.toBeNull();
    expect(result.startDate.getMonth()).toBe(0); // January
    expect(result.startDate.getFullYear()).toBe(2026); // Next year
  });

  test('extracts timezone correctly', () => {
    const estResult = parseEventDateTime('Monday, Dec 8, 1:00 – 2:00 PM EST', referenceYear);
    expect(estResult.timezone).toBe('EST');

    const pstResult = parseEventDateTime('Monday, Dec 8, 1:00 – 2:00 PM PST', referenceYear);
    expect(pstResult.timezone).toBe('PST');
  });

  test('returns null for invalid format', () => {
    expect(parseEventDateTime('Invalid string', referenceYear)).toBeNull();
    expect(parseEventDateTime('', referenceYear)).toBeNull();
  });

  test('returns null for invalid month name', () => {
    expect(parseEventDateTime('Monday, Xyz 8, 1:00 – 2:00 PM EST', referenceYear)).toBeNull();
  });

  test('handles en-dash (–) and regular hyphen (-) separators', () => {
    const enDash = parseEventDateTime('Monday, Dec 8, 1:00 – 2:00 PM EST', referenceYear);
    const hyphen = parseEventDateTime('Monday, Dec 8, 1:00 - 2:00 PM EST', referenceYear);

    expect(enDash).not.toBeNull();
    expect(hyphen).not.toBeNull();
    expect(enDash.startDate.getHours()).toBe(hyphen.startDate.getHours());
  });

  test('handles midnight end time (12:00 AM)', () => {
    // Event ending at midnight: "11:00 – 12:00 AM"
    const result = parseEventDateTime('Friday, Dec 5, 11:00 – 12:00 AM EST', referenceYear);
    expect(result).not.toBeNull();
    expect(result.startDate.getHours()).toBe(11); // 11 AM
    expect(result.endDate.getHours()).toBe(0);    // 12:00 AM = midnight = 0
  });

  test('handles midnight start time (12:00 AM)', () => {
    // Event starting at midnight: "12:00 – 1:00 AM"
    const result = parseEventDateTime('Saturday, Dec 6, 12:00 – 1:00 AM EST', referenceYear);
    expect(result).not.toBeNull();
    expect(result.startDate.getHours()).toBe(0);  // 12:00 AM = midnight = 0
    expect(result.endDate.getHours()).toBe(1);    // 1 AM
  });
});
