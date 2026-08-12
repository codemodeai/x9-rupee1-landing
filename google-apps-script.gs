/**
 * ===========================================================================
 * X9 CREATIVES — landing page  →  Google Sheet
 * ===========================================================================
 *
 * HOW TO INSTALL / UPDATE  (do these in order)
 *
 *  1. Open your Google Sheet.
 *  2. Extensions  →  Apps Script.
 *  3. Select EVERYTHING already in the editor and delete it.
 *  4. Paste this whole file.
 *  5. Ctrl+S to save.
 *  6. Function dropdown → testWrite → ▶ Run  (accept the auth prompt).
 *       Two rows appear in "Leads": one Rs.1 and one Growth Site. Delete them.
 *  7. Deploy → New deployment → gear ⚙️ → Web app
 *       Execute as:      Me
 *       Who has access:  Anyone          ← must be "Anyone"
 *  8. Deploy, then copy the /exec URL into CONFIG.sheetEndpoint in main.js.
 *
 *  Saving alone never changes what the live URL serves — you must deploy.
 *
 * ===========================================================================
 */

/** Bumped on every change, so a deployment's freshness is checkable via doGet. */
var BUILD = '2026-08-12-v3';

/** Tab the leads go into. Created automatically. */
var SHEET_NAME = 'Leads';

/** Must match CONFIG.sheetToken in assets/js/main.js. */
var SHARED_TOKEN = 'x9-change-this-token';

/**
 * Column order used when the tab is first created. Rows are written BY HEADER
 * NAME, not by position, so you can safely reorder or hide columns in Sheets
 * afterwards, and any header added here later is appended automatically.
 */
var HEADERS = [
  'Received at',
  'Interest',
  'Name',
  'Business',
  'What they sell',
  'WhatsApp',
  'Content ready',
  'Paid for marketing before',
  'Source',
  'Page',
  'Submission ID'
];

var ID_HEADER = 'Submission ID';
var PHONE_HEADER = 'WhatsApp';

/** How each column gets its value from the posted payload. */
function valueFor_(header, data) {
  switch (header) {
    case 'Received at': return new Date();
    case 'Interest': return str_(data.interest) || 'Rs.1 Website';
    case 'Name': return str_(data.name);
    case 'Business': return str_(data.business);
    case 'What they sell': return str_(data.what);
    case 'WhatsApp': return str_(data.phone);
    case 'Content ready': return str_(data.content);
    case 'Paid for marketing before': return str_(data.paid);
    case 'Source': return str_(data.source);
    case 'Page': return str_(data.page);
    case 'Submission ID': return str_(data.id);
    default: return '';           // a column you added yourself — left alone
  }
}


/* -------------------------------------------------------------------------
   Web endpoints
   ------------------------------------------------------------------------- */

/** Opening the /exec URL in a browser hits this. Should show JSON. */
function doGet() {
  return reply_({
    ok: true,
    service: 'x9-claim-form',
    build: BUILD,
    sheet: SHEET_NAME
  });
}

/** The landing page posts JSON here. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);   // two submissions at once must not share a row

    if (!e || !e.postData || !e.postData.contents) {
      return reply_({ ok: false, error: 'no body' });
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return reply_({ ok: false, error: 'body was not JSON' });
    }

    if (SHARED_TOKEN && data.token !== SHARED_TOKEN) {
      return reply_({ ok: false, error: 'bad token' });
    }

    return reply_(appendLead_(data));

  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}


/* -------------------------------------------------------------------------
   Core
   ------------------------------------------------------------------------- */

/** Appends one lead. Skips it if that submission id is already recorded. */
function appendLead_(data) {
  var sheet = getSheet_();
  var headers = ensureHeaders_(sheet);

  if (data.id && findId_(sheet, headers, data.id)) {
    return { ok: true, duplicate: true, build: BUILD };
  }

  var row = headers.map(function (header) { return valueFor_(header, data); });
  sheet.appendRow(row);

  return {
    ok: true,
    row: sheet.getLastRow(),
    interest: valueFor_('Interest', data),
    build: BUILD
  };
}

/** Returns the Leads tab, creating it on first use. */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('No active spreadsheet. Open the Sheet and use Extensions > Apps Script.');
  }
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  return sheet;
}

/**
 * Returns the sheet's header row, creating it if the tab is new and appending
 * any header this script needs but the sheet does not have yet. Existing
 * columns are never moved, so data already in the sheet stays aligned.
 */
function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 150);
    formatPhoneColumn_(sheet, HEADERS);
    return HEADERS.slice();
  }

  var width = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, width).getValues()[0].map(function (h) {
    return String(h).trim();
  });

  // Drop trailing blanks so appended columns land tight against the data.
  while (headers.length && headers[headers.length - 1] === '') headers.pop();

  var added = false;
  HEADERS.forEach(function (header) {
    if (headers.indexOf(header) === -1) {
      headers.push(header);
      added = true;
    }
  });

  if (added) {
    sheet.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight('bold');
    formatPhoneColumn_(sheet, headers);
  }

  return headers;
}

/** Plain text, or Sheets reads a 10-digit mobile as a number. */
function formatPhoneColumn_(sheet, headers) {
  var col = headers.indexOf(PHONE_HEADER) + 1;
  if (col < 1) return;
  var rows = sheet.getMaxRows() - 1;
  if (rows > 0) sheet.getRange(2, col, rows, 1).setNumberFormat('@');
}

/** True if this submission id is already in the sheet. */
function findId_(sheet, headers, id) {
  var col = headers.indexOf(ID_HEADER) + 1;
  if (col < 1) return false;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  var ids = sheet.getRange(2, col, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return true;
  }
  return false;
}

function str_(value) {
  return (value === null || value === undefined) ? '' : String(value);
}

function reply_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


/* -------------------------------------------------------------------------
   Run this from the editor to prove the code + permissions work
   ------------------------------------------------------------------------- */

/** Writes one row of each type. Check View → Logs, then delete the rows. */
function testWrite() {
  var stamp = new Date().getTime();

  var a = appendLead_({
    id: 'editor-test-a-' + stamp,
    interest: 'Rs.1 Website',
    name: 'X9 Setup Test',
    business: 'DELETE THIS ROW',
    what: 'editor test',
    phone: '9000000000',
    content: 'Yes, all ready',
    paid: 'No',
    source: 'apps-script-editor',
    page: 'testWrite()'
  });

  var b = appendLead_({
    id: 'editor-test-b-' + stamp,
    interest: 'Growth Site',
    name: 'X9 Setup Test',
    business: 'DELETE THIS ROW',
    what: 'editor test',
    phone: '9000000001',
    content: 'Half ready',
    paid: 'Yes',
    source: 'apps-script-editor',
    page: 'testWrite()'
  });

  Logger.log('build: %s', BUILD);
  Logger.log('Rs.1 row     : %s', JSON.stringify(a));
  Logger.log('Growth row   : %s', JSON.stringify(b));
  Logger.log('Two rows should be in "%s" — delete them.', SHEET_NAME);
  return [a, b];
}
