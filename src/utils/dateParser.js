/**
 * Parses a time string like "1:00PM" into hours and minutes
 * @param {string} timeStr - Time string in format "H:MMAM/PM"
 * @returns {{ hours: number, minutes: number } | null}
 */
function parseTime(timeStr) {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  // Validate hours (1-12 for 12-hour format)
  if (hours < 1 || hours > 12) return null;

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

/**
 * Creates a Date object from date components and a time string
 * @param {{ day: number, month: number, year: number }} dateObj - Date with 1-indexed month
 * @param {string} timeStr - Time string in format "H:MMAM/PM"
 * @returns {Date | null}
 */
function parseDateTime(dateObj, timeStr) {
  const time = parseTime(timeStr);
  if (!time) return null;

  // month is 1-indexed in input, but Date constructor expects 0-indexed
  return new Date(dateObj.year, dateObj.month - 1, dateObj.day, time.hours, time.minutes);
}

/**
 * Formats a Date object to ISO format for calendar URLs: YYYYMMDDTHHmmSS
 * @param {Date} date - Date object to format
 * @returns {string}
 */
function formatISODate(date) {
  const pad = (n) => n.toString().padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Month name to 0-indexed month number mapping
 */
const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

/**
 * Parses Circle.so list view datetime format
 * Input: "Thursday, Dec 4, 10:00 – 11:00 AM EST"
 * Output: { startDate: Date, endDate: Date, timezone: string }
 *
 * @param {string} dateTimeStr - The datetime string from Circle.so
 * @param {number} referenceYear - The reference year (usually current year from page context)
 * @returns {{ startDate: Date, endDate: Date, timezone: string } | null}
 */
function parseEventDateTime(dateTimeStr, referenceYear) {
  if (!dateTimeStr || typeof dateTimeStr !== 'string') return null;

  // Pattern: "DayOfWeek, Mon D, H:MM – H:MM AM/PM TZ"
  // Supports both en-dash (–) and regular hyphen (-)
  const pattern = /^(?:\w+),\s+(\w+)\s+(\d{1,2}),\s+(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s+(\w+)$/i;

  const match = dateTimeStr.match(pattern);
  if (!match) return null;

  const [, monthStr, dayStr, startHourStr, startMinStr, endHourStr, endMinStr, period, timezone] = match;

  // Parse month
  const monthKey = monthStr.toLowerCase().substring(0, 3);
  const month = MONTHS[monthKey];
  if (month === undefined) return null;

  const day = parseInt(dayStr, 10);
  let startHour = parseInt(startHourStr, 10);
  const startMin = parseInt(startMinStr, 10);
  let endHour = parseInt(endHourStr, 10);
  const endMin = parseInt(endMinStr, 10);

  // Convert to 24-hour format
  // The AM/PM applies to the end time, and we infer the start time period
  const isPM = period.toUpperCase() === 'PM';

  // Convert end time
  if (isPM && endHour !== 12) {
    endHour += 12;
  } else if (!isPM && endHour === 12) {
    endHour = 0;
  }

  // Convert start time - assume same period unless start > end (would indicate AM to PM)
  // For "10:00 – 11:00 AM" both are AM
  // For "12:00 – 1:30 PM" both are PM (12 PM and 1:30 PM)
  // For "5:00 – 6:00 PM" both are PM
  if (isPM && startHour !== 12) {
    // Check if start time makes sense in PM
    // If startHour <= endHour (in 12-hr format), both are PM
    // e.g., 5:00 - 6:00 PM means 17:00-18:00
    // e.g., 12:00 - 1:30 PM means 12:00-13:30
    startHour += 12;
  } else if (!isPM && startHour === 12) {
    startHour = 0;
  }

  // Determine year - if month is before reference month (Dec), it's next year
  // Reference month is December (11), so Jan (0) would be next year
  let year = referenceYear;
  if (month < 11) { // If month is before December
    // Check if it's likely next year (Jan, Feb, etc. when viewing December)
    // Simple heuristic: if month is Jan-Nov and we're in Dec context, assume next year
    year = referenceYear + 1;
  }

  const startDate = new Date(year, month, day, startHour, startMin);
  const endDate = new Date(year, month, day, endHour, endMin);

  return {
    startDate,
    endDate,
    timezone: timezone.toUpperCase()
  };
}

module.exports = { parseTime, parseDateTime, formatISODate, parseEventDateTime };
