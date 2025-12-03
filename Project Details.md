This is a great project. Circle.so (the platform hosting this community) uses a Single Page Application (SPA) structure, which means the HTML is generated dynamically. However, the visual structure of the calendar (a 7-column grid) makes it predictable enough to scrape.

Here is a complete, working prototype for a Chrome Extension to achieve this.

### The Architecture
1.  **Manifest V3:** The configuration file.
2.  **Popup UI:** A small window to click "Scan Events" and view the results.
3.  **Content Script:** The logic that injects into the Circle page, reads the grid, extracts dates/times, and sends them back to the popup.
4.  **Utils:** Logic to generate Google Calendar links and `.ics` files.

---

### Step 1: Create the Folder Structure
Create a folder named `circle-calendar-exporter` and create the following 4 files inside it.

### 1. `manifest.json`
This tells Chrome what the extension does.
```json
{
  "manifest_version": 3,
  "name": "Circle.so Calendar Exporter",
  "version": "1.0",
  "description": "Export events from Circle.so calendars to Google, Outlook, or ICS.",
  "permissions": ["activeTab", "scripting"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icon.png", 
      "48": "icon.png",
      "128": "icon.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["https://*.circle.so/*"],
      "js": ["content.js"]
    }
  ]
}
```
*(Note: You can grab any generic PNG image and name it `icon.png` for the icon).*

### 2. `content.js`
This is the heavy lifter. It analyzes the DOM (Document Object Model) of the screenshot you provided.

*Note on Logic: Since CSS classes often change in apps like Circle, this script uses "Fuzzy" logic—it looks for the grid structure and text patterns (like times containing ":") rather than specific encoded class names.*

```javascript
// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scanEvents") {
        const events = scrapeCalendar();
        sendResponse({ events: events });
    }
});

function scrapeCalendar() {
    const events = [];
    
    // 1. Find the Month and Year from the header
    // Usually in a generic header like "December 2025"
    const headerNode = Array.from(document.querySelectorAll('h2, h3, div')).find(el => 
        /^[A-Z][a-z]+ \d{4}$/.test(el.innerText)
    );

    if (!headerNode) return []; // Couldn't find calendar
    
    const [monthName, yearStr] = headerNode.innerText.split(' ');
    const currentYear = parseInt(yearStr);
    const monthIndex = new Date(`${monthName} 1, ${currentYear}`).getMonth(); // 0-11

    // 2. Find the Grid Cells
    // We look for the grid container. Usually has 7 columns.
    // Circle uses CSS grid. We look for elements containing numeric dates.
    const cells = Array.from(document.querySelectorAll('div')).filter(div => {
        // Filter logic: Must look like a day cell (contains a number 1-31 at the start)
        // This is a heuristic and might need tweaking based on exact HTML
        return div.innerText.match(/^\d+/) && div.children.length > 0;
    });

    // Helper to determine if we are in prev, current, or next month
    // We assume the grid starts, potentially has prev month days, then 1...31, then next month
    let foundFirst = false;
    let currentMonthTracker = monthIndex;
    let yearTracker = currentYear;

    cells.forEach((cell, index) => {
        const dateNum = parseInt(cell.innerText.match(/^\d+/)[0]);
        
        // Simple logic to detect month boundaries in the grid
        if (dateNum === 1) foundFirst = true;
        
        // If we see high numbers (20+) before we see the first "1", it's the previous month
        let actualMonth = currentMonthTracker;
        let actualYear = yearTracker;

        if (!foundFirst && dateNum > 20) {
            actualMonth = monthIndex - 1;
            if(actualMonth < 0) { actualMonth = 11; actualYear--; }
        } else if (foundFirst && dateNum < 15 && index > 20) {
            // If we are late in the grid and see small numbers, it's next month
            actualMonth = monthIndex + 1;
            if(actualMonth > 11) { actualMonth = 0; actualYear++; }
        }

        // 3. Find Events inside the cell
        // Events usually have a time (e.g., 10:00AM) and text
        const eventNodes = Array.from(cell.querySelectorAll('div, a, p'));
        
        eventNodes.forEach(node => {
            const text = node.innerText;
            // Look for time pattern: 10:00AM or 1:00PM
            const timeMatch = text.match(/(\d{1,2}:\d{2}\s?(?:AM|PM|am|pm))/);
            
            if (timeMatch) {
                const timeStr = timeMatch[0];
                // Clean title: Remove the time and newlines from the text
                const title = text.replace(timeStr, '').replace(/^\s+|\s+$/g, '').trim();
                
                if (title.length > 0) {
                    events.push({
                        title: title,
                        date: { day: dateNum, month: actualMonth, year: actualYear },
                        time: timeStr
                    });
                }
            }
        });
    });

    return events;
}
```

### 3. `popup.html`
The user interface.

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { width: 350px; font-family: sans-serif; padding: 10px; background: #1a1a1a; color: white; }
        h3 { margin-top: 0; }
        button#scan { width: 100%; padding: 10px; background: #4f46e5; color: white; border: none; cursor: pointer; border-radius: 4px; }
        button#scan:hover { background: #4338ca; }
        .event-card { background: #333; margin-top: 10px; padding: 10px; border-radius: 4px; border-left: 4px solid #4f46e5; }
        .event-title { font-weight: bold; margin-bottom: 5px; font-size: 14px; }
        .event-time { font-size: 12px; color: #ccc; margin-bottom: 8px; }
        .actions { display: flex; gap: 5px; }
        .btn-sm { font-size: 10px; padding: 4px 8px; cursor: pointer; border: none; border-radius: 3px; color: white; text-decoration: none; display: inline-block; }
        .gcal { background: #ea4335; }
        .outlook { background: #0078d4; }
        .ics { background: #28a745; }
    </style>
</head>
<body>
    <h3>Circle Calendar Export</h3>
    <button id="scan">Scan Events on Page</button>
    <div id="results"></div>
    <script src="popup.js"></script>
</body>
</html>
```

### 4. `popup.js`
This handles the logic of converting the scraped data into actual Calendar Links and ICS files.

```javascript
document.getElementById('scan').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script
    chrome.tabs.sendMessage(tab.id, { action: "scanEvents" }, (response) => {
        const container = document.getElementById('results');
        container.innerHTML = '';

        if (!response || !response.events || response.events.length === 0) {
            container.innerHTML = '<p style="text-align:center; margin-top:10px;">No events found. Make sure you are on the Calendar view.</p>';
            return;
        }

        response.events.forEach(ev => {
            const startDate = parseDateTime(ev.date, ev.time);
            const endDate = new Date(startDate.getTime() + (60 * 60 * 1000)); // Assume 1 hour duration default

            const card = document.createElement('div');
            card.className = 'event-card';
            card.innerHTML = `
                <div class="event-title">${ev.title}</div>
                <div class="event-time">${startDate.toDateString()} @ ${ev.time}</div>
                <div class="actions">
                    <a href="${generateGCalLink(ev.title, startDate, endDate)}" target="_blank" class="btn-sm gcal">Google</a>
                    <a href="${generateOutlookLink(ev.title, startDate, endDate)}" target="_blank" class="btn-sm outlook">Outlook</a>
                    <button class="btn-sm ics" data-title="${ev.title}" data-start="${startDate.toISOString()}">ICS</button>
                </div>
            `;
            container.appendChild(card);
        });

        // Add ICS listeners
        document.querySelectorAll('.ics').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const title = e.target.getAttribute('data-title');
                const start = new Date(e.target.getAttribute('data-start'));
                const end = new Date(start.getTime() + (60 * 60 * 1000));
                downloadICS(title, start, end);
            });
        });
    });
});

// Helper: Convert scraped data to JS Date Object
function parseDateTime(dateObj, timeStr) {
    // timeStr format "1:00PM"
    const [time, modifier] = timeStr.split(/(AM|PM)/i);
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') hours = '00';
    if (modifier.toUpperCase() === 'PM') hours = parseInt(hours, 10) + 12;
    
    const d = new Date(dateObj.year, dateObj.month, dateObj.day);
    d.setHours(parseInt(hours), parseInt(minutes));
    return d;
}

// Helper: Generate ISO string without special chars for URLs
function formatISODate(date) {
    return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
}

function generateGCalLink(title, start, end) {
    const s = formatISODate(start);
    const e = formatISODate(end);
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${s}/${e}`;
}

function generateOutlookLink(title, start, end) {
    return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&startdt=${start.toISOString()}&enddt=${end.toISOString()}&subject=${encodeURIComponent(title)}`;
}

function downloadICS(title, start, end) {
    const s = formatISODate(start);
    const e = formatISODate(end);
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
URL:${document.URL}
DTSTART:${s}
DTEND:${e}
SUMMARY:${title}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${title}.ics`;
    anchor.click();
    URL.revokeObjectURL(url);
}
```

### How to Install and Test

1.  **Save Files:** Save the 4 files above into a folder.
2.  **Open Chrome Extensions:** Go to `chrome://extensions/`.
3.  **Developer Mode:** Toggle "Developer mode" on (top right corner).
4.  **Load Unpacked:** Click the "Load unpacked" button (top left).
5.  **Select Folder:** Select the folder containing your files.
6.  **Test:**
    *   Navigate to your "Dynamous AI Mastery" events page on Circle.
    *   Click the extension icon in your Chrome toolbar.
    *   Click "Scan Events on Page".
    *   You should see a list of the events (Community Hangout, AI Exploration Hour, etc.).
    *   Click the "Google", "Outlook", or "ICS" buttons to export them.

### Limitations / Future Improvements
*   **Timezones:** Circle usually displays times in your local browser timezone. This script creates the calendar event based on *your* computer's time. If you share the ICS file with someone in a different timezone, it generally works fine as it uses UTC offsets in the ISO string.
*   **Event Duration:** The screenshot only shows start times (e.g., 1:00 PM). The script defaults all events to **1 hour**. You might want to add a duration setting in the popup if your events are usually longer.