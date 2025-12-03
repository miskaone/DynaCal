/**
 * Content Script for Circle.so Calendar Exporter
 * Runs on community.dynamous.ai/c/live-events
 * Handles DOM scraping and message passing with popup
 */

const { scrapeEvents } = require('./scraper');

/**
 * Message handler for communication with popup
 */
function handleMessage(message, sender, sendResponse) {
  if (message.action === 'scanEvents') {
    try {
      const events = scrapeEvents();
      sendResponse({
        success: true,
        events: events
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  } else {
    sendResponse({
      success: false,
      error: `Unknown action: ${message.action}`
    });
  }

  // Return true to indicate we will send a response asynchronously
  return true;
}

// Register message listener
chrome.runtime.onMessage.addListener(handleMessage);

module.exports = { handleMessage };
