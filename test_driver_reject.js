/**
 * Helper to insert a test candidate row into the Candidate Pipeline sheet.
 */
function insertTestCandidate(driverId, override = "", chauffeur = "") {
  const row = Array(20).fill("");
  row[9] = driverId;     // Column J = ID
  row[14] = override;    // Column O = Override
  row[2] = chauffeur;    // Column C = Chauffeur license
  CONFIG.sheets.candidatePipeline.appendRow(row);
}

/**
 * Helper to delete a test candidate by driver ID from the Candidate Pipeline sheet.
 */
function deleteCandidateById(driverId) {
  const sheet = CONFIG.sheets.candidatePipeline;
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i][9] === driverId) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

/**
 * Test: Ensure that blacklisted drivers are rejected and do not proceed in the flow.
 */
function test_blacklistedDriverRejection() {
  const driverId = "BLACKLISTED_TEST_123";

  insertTestCandidate(driverId);

  const originalCheck = globalThis.checkDailyDriverStats;
  const originalSend = globalThis.sendRejectionText;

  globalThis.checkDailyDriverStats = function(id) {
    return id === driverId ? "blacklisted" : "ok";
  };

  // mocking texting
  let wasTextSent = false;
  globalThis.sendRejectionText = function(id, convoName, text) {
    if (id === driverId && text.toLowerCase().includes("blacklist")) {
      wasTextSent = true;
    }
  };

  const formSheet = CONFIG.sheets.formResponses;
  const formRow = new Array(formSheet.getLastColumn()).fill("");
  formRow[CONFIG.sheetColumns.COLUMN_PASS] = 1;
  formRow[CONFIG.sheetColumns.COLUMN_ID] = driverId;
  formSheet.appendRow(formRow);
  const rowNum = formSheet.getLastRow();

  handleFormSubmission({
    range: formSheet.getRange(rowNum, 1),
  });

  Logger.log(wasTextSent
    ? "✅ Passed: Blacklisted rejection text was sent."
    : "❌ Failed: Blacklisted rejection text NOT sent.");

  deleteCandidateById(driverId);
  globalThis.sendRejectionText = originalSend;
  globalThis.checkDailyDriverStats = originalCheck;
}

/**
 * Test: Ensure that drivers who fail the prescreen are rejected.
 */
function test_driverFailsPrescreen() {
  const driverId = "TEST_FAIL_123";

  insertTestCandidate(driverId);

  const originalSend = globalThis.sendRejectionText;
  let wasTextSent = false;

  // mocking texts
  globalThis.sendRejectionText = function(id, convoName, text) {
    if (id === driverId && text.toLowerCase().includes("pre-screening")) {
      wasTextSent = true;
    }
  };

  const formSheet = CONFIG.sheets.formResponses;
  const testFormRow = new Array(formSheet.getLastColumn()).fill("");
  testFormRow[CONFIG.sheetColumns.COLUMN_PASS] = 0;
  testFormRow[CONFIG.sheetColumns.COLUMN_ID] = driverId;
  formSheet.appendRow(testFormRow);
  const lastRow = formSheet.getLastRow();

  handleFormSubmission({
    range: formSheet.getRange(lastRow, 1),
  });

  Logger.log(wasTextSent
    ? "Passed: Rejection text was sent for failed prescreen."
    : "Failed: Rejection text was NOT sent for failed prescreen.");

  deleteCandidateById(driverId);
  globalThis.sendRejectionText = originalSend;
}