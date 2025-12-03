const { formatISODate } = require('./dateParser');

/**
 * Escapes special characters for ICS format according to RFC 5545
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeICSText(text) {
  return text
    .replace(/\\/g, '\\\\')   // Backslash first
    .replace(/;/g, '\\;')     // Semicolon
    .replace(/,/g, '\\,')     // Comma
    .replace(/\n/g, '\\n');   // Newline
}

/**
 * Folds long lines according to RFC 5545 (max 75 characters)
 * @param {string} line - Line to fold
 * @returns {string} Folded line(s)
 */
function foldLine(line) {
  if (line.length <= 75) {
    return line;
  }

  const result = [];
  let remaining = line;

  // First line can be 75 chars
  result.push(remaining.substring(0, 75));
  remaining = remaining.substring(75);

  // Continuation lines start with space and can have 74 more chars
  while (remaining.length > 0) {
    result.push(' ' + remaining.substring(0, 74));
    remaining = remaining.substring(74);
  }

  return result.join('\r\n');
}

/**
 * Generates a unique ID for an event
 * @param {Object} event - Event object
 * @returns {string} Unique ID
 */
function generateUID(event) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  const titleHash = event.title.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0).toString(36);
  return `${timestamp}-${random}-${titleHash}@dynamous.ai`;
}

/**
 * Generates an ICS (iCalendar) file content for an event
 *
 * @param {Object} event - Event object
 * @param {string} event.title - Event title
 * @param {Date} event.startDate - Start date/time
 * @param {Date} event.endDate - End date/time
 * @param {string} [event.location] - Event location
 * @param {string} [event.url] - Event URL
 * @param {string} [event.description] - Event description
 * @returns {string} ICS file content
 */
function generateICS(event) {
  const lines = [];

  // Calendar header
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Circle Calendar Exporter//Dynamous AI//EN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');

  // Event block
  lines.push('BEGIN:VEVENT');

  // Required fields
  lines.push(`UID:${generateUID(event)}`);
  lines.push(`DTSTAMP:${formatISODate(new Date())}Z`);
  lines.push(`DTSTART:${formatISODate(event.startDate)}`);
  lines.push(`DTEND:${formatISODate(event.endDate)}`);
  lines.push(`SUMMARY:${escapeICSText(event.title)}`);

  // Optional fields
  if (event.location) {
    lines.push(`LOCATION:${escapeICSText(event.location)}`);
  }

  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
  }

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  // Fold long lines and join with CRLF
  return lines.map(foldLine).join('\r\n');
}

module.exports = { generateICS };
