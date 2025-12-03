Here is a comprehensive Product Requirements Document (PRD) for the **Circle.so Calendar Exporter** Chrome Extension.

---

# Product Requirements Document (PRD)
**Project Name:** Circle.so Calendar Event Exporter  
**Version:** 1.0  
**Status:** Draft  
**Platform:** Google Chrome Extension (Manifest V3)

---

## 1. Executive Summary
### 1.1 Problem Statement
Circle.so community platforms provide an "Events" tab with a monthly calendar view. However, there is no native functionality to bulk-export these events or easily add individual events from the grid view to personal calendars (Google, Outlook, Apple Calendar) without clicking into each event detail page manually.

### 1.2 Proposed Solution
A lightweight Chrome Extension that injects a content script into the Circle.so events page. It parses the DOM (Document Object Model) to identify dates, times, and event titles, presenting them in a browser popup list. Users can then add events to their preferred calendar service via one-click deep links or ICS file downloads.

---

## 2. Target Audience
*   **Primary:** Members of paid or private communities hosted on Circle.so (e.g., "Dynamous AI Mastery").
*   **Secondary:** Community managers who want to quickly grab event details for newsletters or external communications.

---

## 3. User Stories
| ID       | User Role | Story                                                        | Acceptance Criteria                                          |
| :------- | :-------- | :----------------------------------------------------------- | :----------------------------------------------------------- |
| **US-1** | User      | I want to scan the current webpage for events.               | Clicking "Scan" finds all visible events in the current month view. |
| **US-2** | User      | I want to add a specific event to Google Calendar.           | Clicking "Google" opens a new tab with the event pre-filled (Title, Date, Time). |
| **US-3** | User      | I want to add an event to Outlook Web.                       | Clicking "Outlook" opens the Outlook live calendar compose window with details pre-filled. |
| **US-4** | User      | I want to download an event for Apple Calendar (or desktop Outlook). | Clicking "ICS" instantly downloads a `.ics` file.            |
| **US-5** | User      | I want to know if no events were found.                      | The UI displays a clear "No events found" message if the scrape returns empty. |

---

## 4. Functional Requirements

### 4.1 Data Extraction (Scraping)
*   **FR-1.1 Month Detection:** The system must identify the Month and Year from the calendar header (e.g., "December 2025").
*   **FR-1.2 Date Mapping:** The system must map grid cells to specific dates, accounting for:
    *   Days belonging to the previous month (leading cells).
    *   Days belonging to the next month (trailing cells).
*   **FR-1.3 Event Parsing:**
    *   Must identify text strings containing time patterns (e.g., `1:00PM`, `10:00 AM`).
    *   Must separate the **Time** from the **Event Title**.
    *   Must strip whitespace and newlines from titles.

### 4.2 User Interface (Popup)
*   **FR-2.1 Control:** A primary "Scan Events" button.
*   **FR-2.2 List View:** Scraped events must be displayed as cards containing:
    *   Event Title.
    *   Formatted Date & Start Time.
    *   Action Buttons (Google, Outlook, ICS).
*   **FR-2.3 Persistence:** The popup resets when closed (stateless interaction).

### 4.3 Export Logic
*   **FR-3.1 Time Formatting:** Dates must be converted to ISO format (YYYYMMDDTHHmmSS) for URL generation.
*   **FR-3.2 Duration Assumption:** Since Circle's grid view often lists only Start Time, the system shall default the **End Time** to exactly **1 hour** after the Start Time.
*   **FR-3.3 Google Calendar:** Generate URL: `https://www.google.com/calendar/render?action=TEMPLATE...`
*   **FR-3.4 Outlook Web:** Generate URL: `https://outlook.live.com/calendar/0/deeplink/compose...`
*   **FR-3.5 ICS Generation:** Generate a standard VCALENDAR 2.0 text blob and trigger a browser download.

---

## 5. Non-Functional Requirements
*   **NFR-1 Privacy:** All processing must happen locally in the browser. No data is sent to external servers.
*   **NFR-2 Performance:** The DOM scan must complete in under 500ms.
*   **NFR-3 Compatibility:** Must work on Chromium-based browsers (Chrome, Edge, Brave).
*   **NFR-4 Robustness:** The scraper must use "fuzzy" logic (regex/text matching) rather than rigid CSS class names, as Circle's class names likely change with updates.

---

## 6. Technical Architecture

### 6.1 Component Diagram
1.  **Manifest.json (V3):** Permissions for `activeTab` and `scripting`.
2.  **Popup (UI):** HTML/CSS interface.
3.  **Content Script:** Injected Javascript that reads the DOM of the active tab.
4.  **Message Passing:** `chrome.runtime` messaging to send scraped data from Content Script $\to$ Popup.

### 6.2 Data Model (JSON Object passed to Popup)
```json
[
  {
    "title": "Community Hangout",
    "date": {
      "day": 1,
      "month": 11, // 0-indexed (December)
      "year": 2025
    },
    "time": "1:00PM"
  }
]
```

---

## 7. Assumptions & Constraints
1.  **Visual Dependency:** The extension assumes the user is currently viewing the "Calendar" tab in Circle. It will not work on list views or detail pages.
2.  **English Locale:** The regex for date parsing assumes English month names and AM/PM time formats.
3.  **One-Hour Default:** As start times are the only guaranteed data point on the grid, all events default to 1 hour duration.
4.  **Local Timezone:** Circle renders events in the user's local browser time; the extension scrapes this text and creates the calendar event in the same local time.

---

## 8. Future Scope (V2)
*   **Bulk Export:** A "Download All" button to generate a single ICS file containing all monthly events.
*   **Custom Duration:** A settings dropdown in the popup to change default duration from 1 hour to 30 mins / 90 mins.
*   **Detail Scraping:** Functionality to visit the specific event URL to scrape the actual end time and description (requires significantly more complex logic/permissions).