/**
 * Circle.so Live Events List View Scraper
 * Extracts event data from the DOM of community.dynamous.ai/c/live-events
 */

/**
 * Decodes HTML entities in a string
 * @param {string} html - String with HTML entities
 * @returns {string} Decoded string
 */
function decodeHTMLEntities(html) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  return textarea.value;
}

/**
 * Extracts the event slug from a URL path
 * @param {string} url - Event URL path (e.g., "/c/live-events/event-name-123")
 * @returns {string} Event slug
 */
function extractSlug(url) {
  const parts = url.split('/');
  return parts[parts.length - 1];
}

/**
 * Determines RSVP status from an event card element
 * @param {Element} card - Event card DOM element
 * @returns {'none' | 'going'} RSVP status
 */
function getRsvpStatus(card) {
  // Check for "Going" status - look for rsvp-radio with "Going" text
  const rsvpRadio = card.querySelector('.rsvp-radio');
  if (rsvpRadio) {
    const goingText = rsvpRadio.querySelector('.button-text');
    if (goingText && goingText.textContent.trim() === 'Going') {
      return 'going';
    }
  }

  // Default to not RSVP'd
  return 'none';
}

/**
 * Extracts event data from a single event card element
 * @param {Element} card - Event card DOM element
 * @returns {Object|null} Event object or null if extraction fails
 */
function extractEventFromCard(card) {
  if (!card) return null;

  try {
    // Find the event content container
    const contentContainer = card.querySelector('[data-testid="event-main-content"]');
    if (!contentContainer) return null;

    // Extract title and URL from the title link
    const titleLink = contentContainer.querySelector('a.text-base.font-semibold');
    if (!titleLink) return null;

    const title = decodeHTMLEntities(titleLink.textContent.trim());
    const url = titleLink.getAttribute('href');
    const slug = extractSlug(url);

    // Extract datetime string - look for the span near the calendar icon
    const dateTimeSpans = contentContainer.querySelectorAll('.flex.items-center.gap-x-2 span.text-xs');
    let dateTimeStr = '';
    let location = '';

    dateTimeSpans.forEach((span, index) => {
      const text = span.textContent.trim();
      // First matching span is usually the datetime (contains time pattern)
      if (text.match(/\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}/)) {
        dateTimeStr = text;
      } else if (text && !dateTimeStr && index === 0) {
        // Fallback: first span might be datetime
        dateTimeStr = text;
      } else if (text && text !== dateTimeStr) {
        // Other spans are likely location
        location = text;
      }
    });

    // If we still don't have datetime, try alternative selector
    if (!dateTimeStr) {
      const allSpans = contentContainer.querySelectorAll('span.text-xs');
      for (const span of allSpans) {
        const text = span.textContent.trim();
        if (text.match(/\w+day,\s+\w+\s+\d+,\s+\d{1,2}:\d{2}/)) {
          dateTimeStr = text;
          break;
        }
      }
    }

    if (!dateTimeStr) return null;

    // Extract RSVP status
    const rsvpStatus = getRsvpStatus(card);

    // Extract thumbnail URL
    const thumbnailImg = card.querySelector('a#event-thumbnail-image img');
    const thumbnailUrl = thumbnailImg ? thumbnailImg.getAttribute('src') : null;

    return {
      title,
      url,
      slug,
      dateTimeStr,
      location: location || 'TBD',
      rsvpStatus,
      thumbnailUrl
    };
  } catch (error) {
    console.error('Error extracting event from card:', error);
    return null;
  }
}

/**
 * Scrapes all events from the Circle.so live events page
 * @param {number} [referenceYear] - Reference year for date parsing (defaults to current year)
 * @returns {Array<Object>} Array of event objects
 */
function scrapeEvents(referenceYear) {
  const events = [];

  // Find all event cards - they are divs with specific border classes containing event content
  const eventCards = document.querySelectorAll('.border-primary.border-b.p-6');

  eventCards.forEach(card => {
    const event = extractEventFromCard(card);
    if (event) {
      events.push(event);
    }
  });

  return events;
}

module.exports = { scrapeEvents, extractEventFromCard };
