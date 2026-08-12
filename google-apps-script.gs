/**
 * ===========================================================================
 * X9 CREATIVES — ₹1 landing page  →  Google Sheet
 * ===========================================================================
 *
 * HOW TO INSTALL  (do these in order)
 *
 *  1. Open your Google Sheet.
 *  2. Extensions  →  Apps Script.
 *  3. Select EVERYTHING already in the editor and delete it.
 *  4. Paste this whole file.
 *  5. Ctrl+S to save.
 *  6. In the toolbar function dropdown pick  testWrite  and press  ▶ Run.
 *       - Accept the authorisation prompt (Advanced → Go to … (unsafe)).
 *       - A row should appear in the "Leads" tab. Delete it afterwards.
 *       - If this works, the code is definitely in the right project.
 *  7. Deploy  →  New deployment  →  gear ⚙️  →  Web app
 *       Execute as:      Me
 *       Who has access:  Anyone          ← must be "Anyone"
 *  8. Deploy, then copy the /exec URL.
 *
 * ===========================================================================
 */

/** Bumped whenever this file changes, so a deployment's freshness is checkable. */
var BUILD = '2026-08-12-v2';

/** Tab the leads go into. Created automatically. */
var SHEET_NAME = 'Leads';

/** Must match CONFIG.sheetToken in assets/js/main.js. */
var SHARED_TOKEN = 'x9-change-this-token';

var HEADERS = [
  'Received at',
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

var PHONE_COL = 5;  // 1-indexed positions in HEADERS
var ID_COL = 10;


/* -------------------------------------------------------------------------
   Web endpoints
   ------------------------------------------------------------------------- */

/**
 * Opening the /exec URL in a browser hits this. Should show JSON.
 * If you see "Script function not found: doGet", the deployment is serving an
 * older version of the code — deploy again (step 7).
 */
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

    var result = appendLead_(data);
    return reply_(result);

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

  if (data.id && findId_(sheet, data.id)) {
    return { ok: true, duplicate: true, build: BUILD };
  }

  sheet.appendRow([
    new Date(),
    str_(data.name),
    str_(data.business),
    str_(data.what),
    str_(data.phone),
    str_(data.content),
    str_(data.paid),
    str_(data.source),
    str_(data.page),
    str_(data.id)
  ]);

  return { ok: true, row: sheet.getLastRow(), build: BUILD };
}

/** Returns the Leads tab, creating and formatting it on first use. */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('No active spreadsheet. Open the Sheet and use Extensions > Apps Script.');
  }

  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 150);
    // Plain text, or Sheets reads a 10-digit mobile as a number.
    sheet.getRange(2, PHONE_COL, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
  }

  return sheet;
}

/** True if this submission id is already in the sheet. */
function findId_(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  var ids = sheet.getRange(2, ID_COL, lastRow - 1, 1).getValues();
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

/**
 * Select "testWrite" in the toolbar dropdown and press Run.
 * Writes one obvious test row. Check View → Logs for the result.
 */
function testWrite() {
  var result = appendLead_({
    id: 'editor-test-' + new Date().getTime(),
    name: 'X9 Setup Test',
    business: 'DELETE THIS ROW',
    what: 'editor test',
    phone: '9000000000',
    content: 'Yes, all ready',
    paid: 'No',
    source: 'apps-script-editor',
    page: 'testWrite()'
  });

  Logger.log('build: %s', BUILD);
  Logger.log('result: %s', JSON.stringify(result));
  Logger.log('If you see a row in the "%s" tab, everything works. Delete it.', SHEET_NAME);
  return result;
}
