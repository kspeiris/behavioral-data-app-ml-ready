# Behavioral Data App — Raw Events + ML Feature Dataset

This project collects raw browser interaction events for bot-detection research and includes a Python script to convert those raw logs into a processed session-level CSV for ML.

## Architecture

```text
Frontend on Netlify
  -> JavaScript raw event logger
  -> Google Apps Script Web App
  -> Google Sheets RawEvents tab
  -> Download CSV
  -> Python feature extraction
  -> processed ML CSV
```

## Project structure

```text
behavioral-data-app-ml-ready/
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── dashboard.html
│   ├── styles.css
│   ├── config.js
│   ├── config.example.js
│   └── app.js
├── google-apps-script/
│   └── Code.gs
├── processing/
│   ├── feature_extraction.py
│   └── requirements.txt
├── data_samples/
│   ├── raw_events_sample.csv
│   └── session_labels_sample.csv
└── docs/
    ├── google-sheets-setup.md
    └── feature-extraction-setup.md
```

## 1. Raw events CSV

The Google Sheet stores raw events with this structure:

```text
session_id,event_type,timestamp,x,y,key,element,target_value,page,received_at
```

Core event types:

- `mousemove`
- `click`
- `keydown`
- `input`
- `scroll`
- `page_view`
- `session_start`
- `login_submit`
- `search_submit`
- `session_finish`

Password-field values and password keystrokes are stored as `REDACTED`.

## 2. Processed ML dataset CSV

The Python script creates one row per session:

```text
session_id,avg_mouse_speed,click_frequency,avg_click_interval,typing_speed,avg_key_interval,session_duration,scroll_speed,task_completion_time,label
```

## Setup summary

### Frontend + Google Sheets

1. Create a Google Sheet and name the first tab `RawEvents`.
2. Paste `google-apps-script/Code.gs` into Google Apps Script.
3. Replace `PASTE_YOUR_GOOGLE_SHEET_ID_HERE` with your Sheet ID.
4. Deploy Apps Script as a Web App with access set to `Anyone`.
5. Copy the Web App URL into `frontend/config.js`.
6. Deploy the `frontend` folder to Netlify.
7. Download the Google Sheet as CSV when enough sessions are collected.

See `docs/google-sheets-setup.md` for detailed steps.

### Feature extraction

Install requirements:

```bash
pip install -r processing/requirements.txt
```

Create a processed dataset with one label for all sessions:

```bash
python processing/feature_extraction.py \
  --input raw_events.csv \
  --output processed_dataset.csv \
  --label human
```

Or use per-session labels:

```bash
python processing/feature_extraction.py \
  --input raw_events.csv \
  --output processed_dataset.csv \
  --labels-file session_labels.csv
```

See `docs/feature-extraction-setup.md` for details.
