const { generateGoogleCalendarLink, generateOutlookLink } = require('../src/utils/calendarLinks');

/**
 * Helper to extract a URL parameter value (decoded)
 */
function getParam(url, param) {
  const urlObj = new URL(url);
  return urlObj.searchParams.get(param);
}

describe('generateGoogleCalendarLink', () => {
  const baseEvent = {
    title: 'Community Hangout',
    startDate: new Date(2025, 11, 15, 13, 0, 0), // Dec 15, 2025 1:00 PM
    endDate: new Date(2025, 11, 15, 14, 0, 0),   // Dec 15, 2025 2:00 PM
    location: 'Virtual',
    url: 'https://community.dynamous.ai/c/live-events/community-hangout-123'
  };

  test('generates valid Google Calendar URL structure', () => {
    const link = generateGoogleCalendarLink(baseEvent);
    expect(link).toMatch(/^https:\/\/www\.google\.com\/calendar\/render\?action=TEMPLATE/);
  });

  test('includes event title in text parameter', () => {
    const link = generateGoogleCalendarLink(baseEvent);
    expect(getParam(link, 'text')).toBe('Community Hangout');
  });

  test('includes start and end dates in dates parameter', () => {
    const link = generateGoogleCalendarLink(baseEvent);
    // Format: YYYYMMDDTHHmmSS/YYYYMMDDTHHmmSS
    expect(getParam(link, 'dates')).toBe('20251215T130000/20251215T140000');
  });

  test('includes location parameter', () => {
    const link = generateGoogleCalendarLink(baseEvent);
    expect(getParam(link, 'location')).toBe('Virtual');
  });

  test('includes description in details parameter', () => {
    const event = {
      ...baseEvent,
      description: 'Join us for a community hangout!\n🔗 https://community.dynamous.ai/c/live-events/community-hangout-123'
    };
    const link = generateGoogleCalendarLink(event);
    const details = getParam(link, 'details');
    expect(details).toContain('https://community.dynamous.ai/c/live-events/community-hangout-123');
  });

  test('omits details when no description provided', () => {
    const event = {
      title: 'Simple Event',
      startDate: new Date(2025, 11, 15, 13, 0, 0),
      endDate: new Date(2025, 11, 15, 14, 0, 0)
    };
    const link = generateGoogleCalendarLink(event);
    expect(getParam(link, 'details')).toBeNull();
  });

  test('handles special characters in title', () => {
    const event = {
      ...baseEvent,
      title: 'Office Hours/ Q&A'
    };
    const link = generateGoogleCalendarLink(event);
    expect(getParam(link, 'text')).toBe('Office Hours/ Q&A');
  });

  test('handles event with description', () => {
    const event = {
      ...baseEvent,
      description: 'Join us for a community hangout session!'
    };
    const link = generateGoogleCalendarLink(event);
    const details = getParam(link, 'details');
    expect(details).toContain('Join us for a community hangout session!');
  });

  test('omits details when no url or description provided', () => {
    const event = {
      title: 'Simple Event',
      startDate: new Date(2025, 11, 15, 13, 0, 0),
      endDate: new Date(2025, 11, 15, 14, 0, 0)
    };
    const link = generateGoogleCalendarLink(event);
    expect(getParam(link, 'details')).toBeNull();
  });

  test('omits location when not provided', () => {
    const event = {
      title: 'Simple Event',
      startDate: new Date(2025, 11, 15, 13, 0, 0),
      endDate: new Date(2025, 11, 15, 14, 0, 0)
    };
    const link = generateGoogleCalendarLink(event);
    expect(getParam(link, 'location')).toBeNull();
  });
});

describe('generateOutlookLink', () => {
  const baseEvent = {
    title: 'Community Hangout',
    startDate: new Date(2025, 11, 15, 13, 0, 0), // Dec 15, 2025 1:00 PM
    endDate: new Date(2025, 11, 15, 14, 0, 0),   // Dec 15, 2025 2:00 PM
    location: 'Virtual',
    url: 'https://community.dynamous.ai/c/live-events/community-hangout-123'
  };

  test('generates valid Outlook deeplink structure', () => {
    const link = generateOutlookLink(baseEvent);
    expect(link).toMatch(/^https:\/\/outlook\.office\.com\/calendar\/0\/deeplink\/compose/);
  });

  test('includes path and rru parameters', () => {
    const link = generateOutlookLink(baseEvent);
    expect(getParam(link, 'path')).toBe('/calendar/action/compose');
    expect(getParam(link, 'rru')).toBe('addevent');
  });

  test('includes subject', () => {
    const link = generateOutlookLink(baseEvent);
    expect(getParam(link, 'subject')).toBe('Community Hangout');
  });

  test('uses ISO format for startdt and enddt parameters', () => {
    const link = generateOutlookLink(baseEvent);
    const startdt = getParam(link, 'startdt');
    const enddt = getParam(link, 'enddt');
    // ISO 8601 format: 2025-12-15T...
    expect(startdt).toMatch(/^2025-12-15T\d{2}:\d{2}:\d{2}/);
    expect(enddt).toMatch(/^2025-12-15T\d{2}:\d{2}:\d{2}/);
  });

  test('includes location parameter', () => {
    const link = generateOutlookLink(baseEvent);
    expect(getParam(link, 'location')).toBe('Virtual');
  });

  test('includes description in body parameter', () => {
    const event = {
      ...baseEvent,
      description: 'Join us for a community hangout!\n🔗 https://community.dynamous.ai/c/live-events/community-hangout-123'
    };
    const link = generateOutlookLink(event);
    const body = getParam(link, 'body');
    expect(body).toContain('https://community.dynamous.ai/c/live-events/community-hangout-123');
  });

  test('omits body when no description provided', () => {
    const event = {
      title: 'Simple Event',
      startDate: new Date(2025, 11, 15, 13, 0, 0),
      endDate: new Date(2025, 11, 15, 14, 0, 0)
    };
    const link = generateOutlookLink(event);
    expect(getParam(link, 'body')).toBeNull();
  });

  test('handles special characters in subject', () => {
    const event = {
      ...baseEvent,
      title: 'Office Hours/ Q&A'
    };
    const link = generateOutlookLink(event);
    expect(getParam(link, 'subject')).toBe('Office Hours/ Q&A');
  });

  test('handles event with description', () => {
    const event = {
      ...baseEvent,
      description: 'Join us for a community hangout session!'
    };
    const link = generateOutlookLink(event);
    const body = getParam(link, 'body');
    expect(body).toContain('Join us for a community hangout session!');
  });

  test('omits body when no url or description provided', () => {
    const event = {
      title: 'Simple Event',
      startDate: new Date(2025, 11, 15, 13, 0, 0),
      endDate: new Date(2025, 11, 15, 14, 0, 0)
    };
    const link = generateOutlookLink(event);
    expect(getParam(link, 'body')).toBeNull();
  });

  test('omits location when not provided', () => {
    const event = {
      title: 'Simple Event',
      startDate: new Date(2025, 11, 15, 13, 0, 0),
      endDate: new Date(2025, 11, 15, 14, 0, 0)
    };
    const link = generateOutlookLink(event);
    expect(getParam(link, 'location')).toBeNull();
  });
});
