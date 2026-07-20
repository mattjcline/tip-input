/**
 * Backend for the tip-input PWA. Deploy this bound to the Google Sheet that
 * stores tips, as a Web App (Execute as: Me, Who has access: Anyone).
 *
 * Sheet layout (row 1 = header, created automatically if missing):
 *   Date | Amount | Source | Note
 *
 * The web app URL + SHARED_SECRET (set below via Script Properties) are the
 * only things the frontend needs — see apps-script/README.md for setup.
 */

const SHEET_NAME = 'Tips';
const HEADERS = ['Date', 'Amount', 'Source', 'Note'];

function getSecret_() {
  return PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function jsonResponse_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function rowToTip_(row, rowIndex) {
  return {
    id: rowIndex,
    date: row[0] instanceof Date ? row[0].toISOString().slice(0, 10) : row[0],
    amount: Number(row[1]),
    source: row[2] || '',
    note: row[3] || '',
  };
}

function listTips_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return values
    .map((row, i) => rowToTip_(row, i + 2))
    .filter((tip) => tip.date !== '');
}

function addTip_(payload) {
  const sheet = getSheet_();
  sheet.appendRow([payload.date, payload.amount, payload.source || '', payload.note || '']);
  return rowToTip_(
    [payload.date, payload.amount, payload.source, payload.note],
    sheet.getLastRow()
  );
}

function updateTip_(payload) {
  const sheet = getSheet_();
  const rowIndex = Number(payload.id);
  sheet
    .getRange(rowIndex, 1, 1, HEADERS.length)
    .setValues([[payload.date, payload.amount, payload.source || '', payload.note || '']]);
  return rowToTip_([payload.date, payload.amount, payload.source, payload.note], rowIndex);
}

function deleteTip_(payload) {
  const sheet = getSheet_();
  sheet.deleteRow(Number(payload.id));
  return { id: Number(payload.id) };
}

function doGet(e) {
  const token = e.parameter.token;
  if (token !== getSecret_()) {
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
