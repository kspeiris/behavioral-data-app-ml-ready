# Google Sheets + Apps Script Setup

## 1. Create the Google Sheet

1. Open Google Sheets.
2. Create a new spreadsheet.
3. Rename the first sheet/tab to:

```text
RawEvents
```

4. Add these headers in row 1, or let Apps Script create them automatically:

```text
session_id,event_type,timestamp,x,y,key,element,target_value,page,received_at
```

5. Copy the Google Sheet ID from the URL:

```text
https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
```

## 2. Create Apps Script API

1. Go to Google Apps Script.
2. Create a new project.
3. Paste the contents of:

```text
google-apps-script/Code.gs
```

4. Replace:

```js
const SHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
```

with your real Google Sheet ID.

5. Save the script.

## 3. Deploy Apps Script

1. Click **Deploy**.
2. Click **New deployment**.
3. Select **Web app**.
4. Use:

```text
Execute as: Me
Who has access: Anyone
```

5. Click **Deploy**.
6. Authorize permissions.
7. Copy the Web App URL.

## 4. Connect frontend to backend

Open:

```text
frontend/config.js
```

Replace:

```js
const API_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
```

with your deployed Web App URL.

## 5. Test

1. Open `frontend/index.html` locally, or deploy the `frontend` folder to Netlify.
2. Start the study.
3. Complete the login and search tasks.
4. Check your `RawEvents` sheet.

## 6. Export CSV

In Google Sheets:

```text
File → Download → Comma Separated Values (.csv)
```

This gives you the raw event dataset only.
