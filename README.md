# Behavioral Data App for ML-Ready Bot Detection

This project collects raw browser interaction events from a small behavioral study app and converts those logs into a session-level CSV dataset for machine learning.

The app is designed for bot-detection research. It records anonymized interaction signals such as mouse movement, clicks, typing timing, page visits, scrolls, login task completion, and search task completion. Raw events are saved to Google Sheets through a Google Apps Script Web App, then processed with Python into ML-ready features.

## What This Project Includes

- Static frontend study pages in `frontend/`
- Raw browser event logger in `frontend/app.js`
- Google Apps Script backend in `google-apps-script/Code.gs`
- Google Sheets storage using a `RawEvents` tab
- Python feature extraction script in `processing/feature_extraction.py`
- Setup guides in `docs/`

## Architecture

```text
Browser frontend
  -> JavaScript event collector
  -> Google Apps Script Web App
  -> Google Sheets RawEvents tab
  -> CSV export
  -> Python feature extraction
  -> ML-ready processed dataset
```

## Project Structure

```text
behavioral-data-app-ml-ready/
|-- frontend/
|   |-- index.html
|   |-- login.html
|   |-- dashboard.html
|   |-- styles.css
|   |-- config.js
|   |-- config.example.js
|   `-- app.js
|-- google-apps-script/
|   `-- Code.gs
|-- processing/
|   |-- feature_extraction.py
|   `-- requirements.txt
|-- docs/
|   |-- google-sheets-setup.md
|   `-- feature-extraction-setup.md
`-- README.md
```

## Data Flow

1. A participant opens the study frontend.
2. The app creates or reuses a random `session_id`.
3. Browser events are collected into a local queue.
4. Events are periodically sent to the deployed Google Apps Script Web App.
5. Apps Script writes each event as a row in the Google Sheet tab named `RawEvents`.
6. The sheet is downloaded as CSV.
7. The Python script converts raw events into one ML feature row per session.

## Raw Event Columns

The Google Sheet stores raw events with these columns:

```text
session_id,event_type,timestamp,x,y,key,element,target_value,page,received_at
```

| Column | Description |
|---|---|
| `session_id` | Random ID stored in browser local storage |
| `event_type` | Type of event, such as `mousemove`, `click`, or `keydown` |
| `timestamp` | Browser timestamp in milliseconds since epoch |
| `x` | Mouse or scroll x position when available |
| `y` | Mouse or scroll y position when available |
| `key` | Key pressed, or `REDACTED` for password fields |
| `element` | Element ID, name, or tag name |
| `target_value` | Input value when safe to store |
| `page` | Current page name |
| `received_at` | Server-side timestamp from Apps Script |

Password-field values and password keystrokes are saved as `REDACTED`.

## Event Types

Common collected event types:

```text
page_view
session_start
consent_toggle
mousemove
click
keydown
input
scroll
login_submit
search_submit
session_finish
```

## Prerequisites

For the frontend:

- A modern web browser
- Python 3, only if you want to run a local static server
- A Google account
- A Google Sheet
- A deployed Google Apps Script Web App

For feature extraction:

- Python 3.9 or newer recommended
- `pandas`

## Google Sheet Setup

Create a Google Sheet and make sure it has a tab named:

```text
RawEvents
```

The Apps Script can create the headers automatically if the tab is empty.

The current Apps Script file is configured for this sheet ID:

```text
1IVZlB-JLjPz8cJObUBxdup4u3udp-k9fpS6zrejfEWY
```

That ID comes from a Google Sheets URL like:

```text
https://docs.google.com/spreadsheets/d/1IVZlB-JLjPz8cJObUBxdup4u3udp-k9fpS6zrejfEWY/edit
```

If you use a different sheet, update this line in `google-apps-script/Code.gs`:

```js
const SHEET_ID = "YOUR_GOOGLE_SHEET_ID";
```

## Google Apps Script Setup

1. Open [Google Apps Script](https://script.google.com/).
2. Create a new project.
3. Copy the contents of `google-apps-script/Code.gs`.
4. Paste it into the Apps Script editor.
5. Confirm `SHEET_ID` matches your Google Sheet.
6. Save the script.
7. Click **Deploy**.
8. Click **New deployment**.
9. Select **Web app**.
10. Use these deployment settings:

```text
Execute as: Me
Who has access: Anyone
```

11. Authorize the requested permissions.
12. Copy the Web App URL ending in `/exec`.

## Frontend Configuration

Open:

```text
frontend/config.js
```

Set `API_URL` to your deployed Apps Script Web App URL:

```js
window.APP_CONFIG = {
  API_URL: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",
  BATCH_SIZE: 10,
  AUTO_FLUSH_INTERVAL_MS: 5000,
  MOUSEMOVE_SAMPLE_INTERVAL_MS: 120,
  COLLECT_RAW_KEYS: true
};
```

The current local config points to:

```text
https://script.google.com/macros/s/AKfycbz1UPWnIfJto0nH1zPSg3GCGltT6LuxciexRDUWgqu8_Ee0L6U8sOL02zqJJ_hyaDOV/exec
```

## Run Locally

From the project root:

```powershell
cd frontend
python -m http.server 8000
```

Open the app in your browser:

```text
http://localhost:8000
```

You can also open individual pages:

```text
http://localhost:8000/index.html
http://localhost:8000/login.html
http://localhost:8000/dashboard.html
```

## Study Flow

1. Open `index.html`.
2. Tick the consent checkbox.
3. Click **Start Study**.
4. Complete the dummy login task.
5. Complete the search task.
6. Click **Finish Session**.
7. Open the Google Sheet.
8. Check the `RawEvents` tab for new rows.

## Deploy the Frontend

Because the frontend is static HTML, CSS, and JavaScript, it can be deployed to any static host.

Recommended options:

- Netlify
- GitHub Pages
- Vercel static deployment
- Any simple web server

For Netlify, deploy the `frontend/` folder as the site root.

If you deploy the frontend online, make sure the deployed copy of `frontend/config.js` contains the correct Apps Script Web App URL.

## Test the Apps Script Backend

Open the Apps Script Web App URL in a browser. A healthy deployment should return JSON similar to:

```json
{"status":"ok","app":"raw-behavioral-event-collector"}
```

You can also test a POST request from PowerShell:

```powershell
$payload='[{"session_id":"manual-test","event_type":"api_test","timestamp":1778112000000,"page":"manual"}]'
Invoke-WebRequest -Method Post `
  -Uri "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec" `
  -ContentType "text/plain;charset=utf-8" `
  -Body $payload
```

A successful response looks like:

```json
{"status":"success","inserted":1}
```

Then check the `RawEvents` tab in Google Sheets.

## Export Raw Events

After collecting sessions:

1. Open the Google Sheet.
2. Select the `RawEvents` tab.
3. Click **File**.
4. Click **Download**.
5. Choose **Comma Separated Values (.csv)**.
6. Save the file as `raw_events.csv`.

## Feature Extraction

Install Python requirements:

```bash
pip install -r processing/requirements.txt
```

Create a processed dataset with one label for all sessions:

```bash
python processing/feature_extraction.py --input raw_events.csv --output processed_dataset.csv --label human
```

For bot sessions:

```bash
python processing/feature_extraction.py --input raw_events.csv --output processed_bot.csv --label bot
```

For mixed labels, create a labels CSV:

```csv
session_id,label
sess-example-1,human
sess-example-2,bot
```

Then run:

```bash
python processing/feature_extraction.py --input raw_events.csv --output processed_dataset.csv --labels-file session_labels.csv
```

## Processed Dataset Columns

The feature extraction script writes one row per session:

```text
session_id,avg_mouse_speed,click_frequency,avg_click_interval,typing_speed,avg_key_interval,session_duration,scroll_speed,task_completion_time,label
```

| Feature | Meaning | Unit |
|---|---|---|
| `session_id` | Random session ID from raw logs | text |
| `avg_mouse_speed` | Average mouse movement speed | pixels/second |
| `click_frequency` | Click count divided by session duration | clicks/second |
| `avg_click_interval` | Average time between clicks | milliseconds |
| `typing_speed` | Keydown count divided by session duration | keys/second |
| `avg_key_interval` | Average time between keydown events | milliseconds |
| `session_duration` | Last event timestamp minus first event timestamp | milliseconds |
| `scroll_speed` | Average absolute scroll movement speed | pixels/second |
| `task_completion_time` | Time from session/page start to search submit or finish | milliseconds |
| `label` | Session class label | `human`, `bot`, or `unlabeled` |

## Troubleshooting

### Headers appear, but no event rows are saved

Make sure you are viewing the `RawEvents` tab, not `Sheet1`.

Also confirm that:

- `frontend/config.js` has the latest `/exec` Apps Script URL.
- You redeployed the frontend after changing `config.js`.
- You clicked **Finish Session** or waited at least 5 seconds for auto-flush.
- The Apps Script deployment access is set to **Anyone**.
- The Apps Script deployment is the latest version after editing `Code.gs`.

### The browser says events are saved, but the sheet is empty

The frontend uses `fetch` with `no-cors` for Google Apps Script compatibility. That means the browser cannot fully inspect the server response. Test the Apps Script URL directly with the PowerShell POST command above.

### Data saves to the wrong spreadsheet

Check this line in `google-apps-script/Code.gs`:

```js
const SHEET_ID = "YOUR_GOOGLE_SHEET_ID";
```

Then redeploy Apps Script as a new version.

### Changes to Apps Script do not take effect

Google Apps Script deployments do not automatically update for every code edit. After changing `Code.gs`, create or update a deployment and use the latest `/exec` URL if Google gives you a new one.

### Local app works, but deployed app does not

The deployed site may still have an old `config.js`. Update and redeploy the `frontend/` folder.

## Privacy Notes

- The app uses a random session ID instead of personal identity.
- Password input values are never stored.
- Password keydown events are saved as `REDACTED`.
- The demo login is not real authentication.
- Do not ask participants to enter real passwords or private data.

## More Documentation

- `docs/google-sheets-setup.md`
- `docs/feature-extraction-setup.md`
