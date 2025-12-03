# DynaCal - Dynamous Community Calendar Exporter

A Chrome extension that makes it easy to export events from the Dynamous community to your personal calendar.

## What Does This Extension Do?

DynaCal scans the [Dynamous Live Events page](https://community.dynamous.ai/c/live-events) and lets you export events directly to:

- **Google Calendar** - Opens a pre-filled event in Google Calendar
- **Outlook Calendar** - Opens a pre-filled event in Outlook Web
- **ICS File** - Downloads a calendar file you can import into any calendar app

### Features

- Displays all upcoming events from the Dynamous community
- Shows your RSVP status for each event
- Reminds you to RSVP for events you haven't responded to
- Tracks which events you've already exported (prevents duplicates)
- Shows a confirmation toast when you add an event

## Is This Extension Safe?

**Yes!** Here's why you can trust this extension:

### Privacy First

- **No data leaves your browser** - The extension only reads the Dynamous events page. It never sends your data to any external server.
- **No tracking** - We don't collect analytics, usage data, or any personal information.
- **No accounts required** - You don't need to sign up or log in to anything.

### Minimal Permissions

The extension only requests the permissions it absolutely needs:

| Permission | Why It's Needed |
|------------|-----------------|
| `activeTab` | To read event data from the Dynamous page you're viewing |
| `storage` | To remember which events you've already exported (stored locally on your computer) |
| `host_permissions` for `community.dynamous.ai` | To run only on the Dynamous community site |

### Open Source

All the code is right here in this repository. You can read through it yourself to verify exactly what it does. There are no hidden features or obfuscated code.

## How to Install (Load Unpacked Extension)

Since this extension isn't on the Chrome Web Store, you'll need to load it manually. Don't worry - it's easy!

### Step 1: Download the Extension

1. Click the green **Code** button at the top of this repository
2. Select **Download ZIP**
3. Extract the ZIP file to a folder on your computer (remember where you put it!)

### Step 2: Build the Extension

Before loading the extension, you need to build it:

1. Make sure you have [Node.js](https://nodejs.org/) installed (version 16 or higher)
2. Open a terminal/command prompt in the extension folder
3. Run these commands:

```bash
npm install
npm run build
```

This creates the `dist` folder with the bundled JavaScript files.

### Step 3: Open Chrome Extensions Page

1. Open Google Chrome
2. Type `chrome://extensions` in the address bar and press Enter
3. You should see the Extensions management page

### Step 4: Enable Developer Mode

1. Look for the **Developer mode** toggle in the top-right corner
2. Click it to turn it **ON** (the toggle should turn blue)

### Step 5: Load the Extension

1. Click the **Load unpacked** button (appears after enabling Developer mode)
2. Navigate to the folder where you extracted/downloaded the extension
3. Select the folder and click **Select Folder** (or **Open** on Mac)

### Step 6: Verify Installation

1. You should see "DynaCal" appear in your list of extensions
2. Make sure the toggle next to it is turned ON
3. You should see the DynaCal icon in your Chrome toolbar (you may need to click the puzzle piece icon to find it)

### Step 7: Pin the Extension (Optional but Recommended)

1. Click the puzzle piece icon in Chrome's toolbar
2. Find "DynaCal" in the list
3. Click the pin icon next to it

Now you can access DynaCal with one click!

## How to Use

1. Go to [community.dynamous.ai/c/live-events](https://community.dynamous.ai/c/live-events)
2. Click the DynaCal icon in your Chrome toolbar
3. You'll see a list of upcoming events
4. Click **Google**, **Outlook**, or **ICS** to export an event
5. A confirmation message will appear, and the button will be disabled to prevent duplicate exports

## Troubleshooting

### "Please navigate to the live events page"

This message appears if you're not on the correct page. Make sure you're at:
`https://community.dynamous.ai/c/live-events`

### Extension icon is grayed out

The extension only works on the Dynamous community site. Navigate to the live events page and try again.

### Events aren't showing up

1. Make sure you're logged into the Dynamous community
2. Try refreshing the page
3. Close and reopen the extension popup

### I accidentally exported the same event twice

The extension tracks exports to prevent this, but if it happens:
- **Google Calendar**: Just delete the duplicate event
- **Outlook**: Delete the duplicate from your calendar
- **ICS**: Don't import the file again

## Technical Details

For developers who want to understand or contribute to the codebase:

### Project Structure

```
DynaCal/
├── manifest.json          # Chrome extension configuration
├── popup.html             # Extension popup UI
├── src/
│   ├── content.js         # Runs on Dynamous pages, handles messaging
│   ├── popup.js           # Popup logic and export handling
│   ├── scraper.js         # Extracts event data from the page
│   └── utils/
│       ├── dateParser.js      # Date/time parsing
│       ├── calendarLinks.js   # Google/Outlook URL generation
│       └── icsGenerator.js    # ICS file creation
├── dist/                  # Built/bundled files (created by npm run build)
├── tests/                 # Jest test files
└── icons/                 # Extension icons
```

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

### Building

```bash
npm run build         # Build for production
npm run build:watch   # Rebuild on file changes
```

## License

MIT License - feel free to use, modify, and distribute this code.

---

Built with care for the Dynamous community.
