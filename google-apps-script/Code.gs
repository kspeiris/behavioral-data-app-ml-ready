/**
 * Google Apps Script backend for raw behavioral event collection.
 *
 * CSV / Google Sheet columns:
 * session_id,event_type,timestamp,x,y,key,element,target_value,page,received_at
 */

const SHEET_ID = "1IVZlB-JLjPz8cJObUBxdup4u3udp-k9fpS6zrejfEWY";
const SHEET_NAME = 'RawEvents';

const HEADERS = [
  'session_id',
  'event_type',
  'timestamp',
  'x',
  'y',
  'key',
  'element',
  'target_value',
  'page',
  'received_at'
];

function doPost(e) {
  try {
    const sheet = getOrCreateSheet_();
    const body = e && e.postData && e.postData.contents ? e.postData.contents : '[]';
    const parsed = JSON.parse(body);
    const events = Array.isArray(parsed) ? parsed : [parsed];

    if (!events.length) {
      return jsonResponse_({ status: 'success', inserted: 0 });
    }

    const rows = events.map(eventToRow_);
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);

    return jsonResponse_({ status: 'success', inserted: rows.length });
  } catch (error) {
    return jsonResponse_({ status: 'error', message: error.message });
  }
}

function doGet() {
  return jsonResponse_({ status: 'ok', app: 'raw-behavioral-event-collector' });
}

function getOrCreateSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const hasHeaders = firstRow.some(Boolean);
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function eventToRow_(event) {
  const raw = event || {};
  return [
    raw.session_id || raw.sessionId || '',
    raw.event_type || raw.eventType || raw.type || '',
    raw.timestamp || '',
    raw.x !== undefined ? raw.x : '',
    raw.y !== undefined ? raw.y : '',
    raw.key || '',
    raw.element || '',
    raw.target_value || raw.targetValue || '',
    raw.page || '',
    new Date().toISOString()
  ];
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
