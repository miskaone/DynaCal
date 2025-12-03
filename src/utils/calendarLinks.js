const { formatISODate } = require('./dateParser');

/**
 * Generates a Google Calendar deep link for an event
 *
 * @param {Object} event - Event object
 * @param {string} event.title - Event title
 * @param {Date} event.startDate - Start date/time
 * @param {Date} event.endDate - End date/time
 * @param {string} [event.location] - Event location
 * @param {string} [event.url] - Event URL
 * @param {string} [event.description] - Event description
 * @returns {string} Google Calendar URL
 */
function generateGoogleCalendarLink(event) {
  const baseUrl = 'https://www.google.com/calendar/render';
  const params = new URLSearchParams();

  params.set('action', 'TEMPLATE');
  params.set('text', event.title);

  // Format: YYYYMMDDTHHmmSS/YYYYMMDDTHHmmSS
  const startFormatted = formatISODate(event.startDate);
  const endFormatted = formatISODate(event.endDate);
  params.set('dates', `${startFormatted}/${endFormatted}`);

  if (event.location) {
    params.set('location', event.location);
  }

  // Add description (URL is already included in the description from popup.js)
  if (event.description) {
    params.set('details', event.description);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generates an Outlook Web deep link for an event
 *
 * @param {Object} event - Event object
 * @param {string} event.title - Event title
 * @param {Date} event.startDate - Start date/time
 * @param {Date} event.endDate - End date/time
 * @param {string} [event.location] - Event location
 * @param {string} [event.url] - Event URL
 * @param {string} [event.description] - Event description
 * @returns {string} Outlook Web Calendar URL
 */
function generateOutlookLink(event) {
  const baseUrl = 'https://outlook.office.com/calendar/0/deeplink/compose';
  const params = new URLSearchParams();

  params.set('path', '/calendar/action/compose');
  params.set('rru', 'addevent');
  params.set('subject', event.title);

  // Outlook uses ISO 8601 format
  params.set('startdt', event.startDate.toISOString());
  params.set('enddt', event.endDate.toISOString());

  if (event.location) {
    params.set('location', event.location);
  }

  // Add description (URL is already included in the description from popup.js)
  // Outlook requires HTML line breaks instead of \n
  if (event.description) {
    const htmlBody = event.description.replace(/\n/g, '<br>');
    params.set('body', htmlBody);
  }

  return `${baseUrl}?${params.toString()}`;
}

module.exports = { generateGoogleCalendarLink, generateOutlookLink };
