/**
 * Backend for the tip-input PWA. Bound to the "Income" sheet tab, deployed
 * as a Web App (Execute as: Me, Who has access: Anyone).
 *
 * Sheet layout (existing tab): column A is unused, title/example rows occupy
 * rows 1-6, the real header row is row 7, and data starts at row 8, in
 * columns B-F:
 *   Date (MM-DD-YYYY) | Source | $ Amount | Income Category | Notes (Optional)
 *
 * The web app URL + SHARED_SECRET (script property) are the only things the
 * frontend needs - see apps-script/README.md for setup.
 */

const SHEET_NAME = 'Income';
const DATA_START_ROW = 8;
const START_COL = 2; // column B
const NUM_COLS = 5; // Date, Source, Amount, Category, Notes

function getSecret_() {
  return PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
}

// Run manually from the Apps Script editor (Run menu) if SHARED_SECRET
// needs to be cleared and re-bootstrapped. Not reachable over HTTP - Apps
// Script hides functions ending in "_" from the Run dropdown, so this one
// deliberately doesn't.
function resetSecret() {
  PropertiesService.getScriptProperties().deleteProperty('SHARED_SECRET');
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('Sheet tab "' + SHEET_NAME + '" not found');
  }
  return sheet;
}

function jsonResponse_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// Sheet dates come back as real Date objects (Sheets auto-converts typed
// dates) - normalize to MM-DD-YYYY. Uses Object.prototype.toString rather
// than `instanceof Date` because values from getValues() fail `instanceof`
// checks against the script's own Date constructor.
function formatDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    const yyyy = value.getFullYear();
    return mm + '-' + dd + '-' + yyyy;
  }
  return String(value);
}

// Frontend works in ISO (yyyy-mm-dd, native to <input type="date">); sheet
// stores MM-DD-YYYY. Convert at the boundary in both directions.
function isoToSheetDate_(iso) {
  const [yyyy, mm, dd] = iso.split('-');
  return mm + '-' + dd + '-' + yyyy;
}

function sheetDateToIso_(value) {
  const formatted = formatDate_(value);
  const [mm, dd, yyyy] = formatted.split('-');
  return yyyy + '-' + mm + '-' + dd;
}

function rowToTip_(row, rowIndex) {
  return {
    id: rowIndex,
    date: sheetDateToIso_(row[0]),
    source: row[1] || '',
    amount: Number(row[2]) || 0,
    category: row[3] || 'Tips',
    note: row[4] || '',
  };
}

function listTips_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return [];
  const values = sheet
    .getRange(DATA_START_ROW, START_COL, lastRow - DATA_START_ROW + 1, NUM_COLS)
    .getValues();
  return values
    .map((row, i) => rowToTip_(row, i + DATA_START_ROW))
    .filter((tip) => row_has_date_(tip));
}

function row_has_date_(tip) {
  return tip.date && tip.date !== '' && !isNaN(new Date(tip.date).getTime());
}

function tipToRow_(payload) {
  return [
    isoToSheetDate_(payload.date),
    payload.source || '',
    payload.amount,
    payload.category || 'Tips',
    payload.note || '',
  ];
}

function addTip_(payload) {
  const sheet = getSheet_();
  const row = tipToRow_(payload);
  const nextRow = sheet.getLastRow() + 1;
  sheet.getRange(nextRow, START_COL, 1, NUM_COLS).setValues([row]);
  return rowToTip_(row, nextRow);
}

function updateTip_(payload) {
  const sheet = getSheet_();
  const rowIndex = Number(payload.id);
  const row = tipToRow_(payload);
  sheet.getRange(rowIndex, START_COL, 1, NUM_COLS).setValues([row]);
  return rowToTip_(row, rowIndex);
}

function deleteTip_(payload) {
  const sheet = getSheet_();
  sheet.deleteRow(Number(payload.id));
  return { id: Number(payload.id) };
}

function doGet(e) {
  // One-time bootstrap: sets SHARED_SECRET if (and only if) it isn't set
  // yet. Safe to leave in place - a no-op once the property exists.
  if (e.parameter.action === 'bootstrap') {
    if (getSecret_()) {
      return jsonResponse_({ error: 'already bootstrapped' });
    }
    PropertiesService.getScriptProperties().setProperty('SHARED_SECRET', e.parameter.token);
    return jsonResponse_({ bootstrapped: true });
  }

  if (e.parameter.token !== getSecret_()) {
    return jsonResponse_({ error: 'unauthorized' });
  }
  try {
    return jsonResponse_({ tips: listTips_() });
  } catch (err) {
    return jsonResponse_({ error: String(err) });
  }
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse_({ error: 'invalid json' });
  }

  if (body.token !== getSecret_()) {
    return jsonResponse_({ error: 'unauthorized' });
  }

  try {
    switch (body.action) {
      case 'add':
        return jsonResponse_({ tip: addTip_(body.payload) });
      case 'update':
        return jsonResponse_({ tip: updateTip_(body.payload) });
      case 'delete':
        return jsonResponse_({ result: deleteTip_(body.payload) });
      default:
        return jsonResponse_({ error: 'unknown action' });
    }
  } catch (err) {
    return jsonResponse_({ error: String(err) });
  }
}
