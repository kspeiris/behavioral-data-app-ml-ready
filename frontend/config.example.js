// Paste your deployed Google Apps Script Web App URL here.
const API_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";

// Raw event batching settings.
const BATCH_SIZE = 10;
const AUTO_FLUSH_INTERVAL_MS = 5000;
const MOUSEMOVE_SAMPLE_INTERVAL_MS = 120;

// true = stores non-password keydown values in the `key` column.
// Password-field keys are always stored as REDACTED.
const COLLECT_RAW_KEYS = true;
