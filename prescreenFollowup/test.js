/**
 * === CONFIG TEST SHEET NAMES ===
 */
const TEST_PIPELINE_SHEET = "Test_Pipeline";
const TEST_TEXT_GEORGE_SHEET = "Test_Text_George";
const TEST_SENT_TEXTS_SHEET = "Test_Sent_Texts";

/**
 * === Cleanly deletes a sheet if it exists ===
 */
function deleteIfExists(spreadsheet, name) {
  const sheet = spreadsheet.getSheetByName(name);
  if (sheet) {
    spreadsheet.deleteSheet(sheet);
  }
}

/**
 * === Sets up a test sheet with the given headers ===
 */
function createTestSheet(spreadsheet, name, numCols = 46) {
  const sheet = spreadsheet.insertSheet(name);
  const headers = Array(numCols).fill("").map((_, i) => `Col ${i + 1}`);
  sheet.getRange(1, 1, 1, numCols).setValues([headers]);
  return sheet;
}

/**
 * === Makes a safe date with noon time in Chicago ===
 */
function makeSafeDateChicago(date) {
  const chicagoOffset = -5 * 60; // UTC-5 fallback
  const tz = "America/Chicago";
  const safe = new Date(date);
  safe.setHours(12, 0, 0, 0);
  return Utilities.formatDate(safe, tz, "MM/dd/yyyy");
}

/**
 * === Helper to create one row of candidate data ===
 */
function createTestRow({ driverId, status, lastOutreach, extraAttempts, outreachFlag }) {
  const row = Array(46).fill("");
  row[9] = driverId;           // Col J
  row[22] = status;            // Col W
  row[17] = lastOutreach;      // Col R
  row[38] = extraAttempts;     // Col AM
  row[45] = outreachFlag;      // Col AT
  return row;
}

/**
 * === Main test for end-to-end prescreen follow-up automation ===
 */
function test_AutomatedPrescreenFollowUp() {
  Logger.log("START test_AutomatedPrescreenFollowUp");
  FLAGS.ENABLE_TEXTING = false;

  const formSS = SpreadsheetApp.openById(CONFIG.sheetIds.formResponses);
  const textingSS = SpreadsheetApp.openById(CONFIG.sheetIds.massText);

  // Cleanup old test sheets
  deleteIfExists(formSS, TEST_PIPELINE_SHEET);
  deleteIfExists(textingSS, TEST_TEXT_GEORGE_SHEET);
  deleteIfExists(textingSS, TEST_SENT_TEXTS_SHEET);

  // Create fresh test sheets
  const pipelineSheet = createTestSheet(formSS, TEST_PIPELINE_SHEET);
  const textGeorgeSheet = createTestSheet(textingSS, TEST_TEXT_GEORGE_SHEET);
  const sentTextsSheet = createTestSheet(textingSS, TEST_SENT_TEXTS_SHEET);

  // Setup dates
  const today = new Date();
  const todayFormatted = makeSafeDateChicago(today);
  const staleDate = new Date(today.getTime() - 5 * 86400000);
  const staleFormatted = makeSafeDateChicago(staleDate);

  // Add test data
  const testData = [
    createTestRow({ driverId: "TEST1", status: "Pending", lastOutreach: staleFormatted, extraAttempts: 0, outreachFlag: 1 }),
    createTestRow({ driverId: "TEST2", status: "Pending", lastOutreach: staleFormatted, extraAttempts: 1, outreachFlag: 1 }),
    createTestRow({ driverId: "TEST3", status: "Pending", lastOutreach: staleFormatted, extraAttempts: 2, outreachFlag: 1 }),
    createTestRow({ driverId: "TEST4", status: "Pending", lastOutreach: todayFormatted, extraAttempts: 1, outreachFlag: 0 }),
    createTestRow({ driverId: "TEST5", status: "Pass", lastOutreach: staleFormatted, extraAttempts: 1, outreachFlag: 0 }),
  ];
  pipelineSheet.getRange(4, 1, testData.length, testData[0].length).setValues(testData);

  Logger.log("Test data written. Running runPrescreenFollowUp to queue texts...");

  // Stage 1: Run prescreen follow-up to queue
  runPrescreenFollowUp(pipelineSheet, textGeorgeSheet);

  // Check that texts were queued correctly
  let queuedCount = textGeorgeSheet.getLastRow() - 3;
  if (queuedCount < 0) queuedCount = 0;
  let queuedTexts = queuedCount > 0 ? textGeorgeSheet.getRange(4, 1, queuedCount, 3).getValues() : [];

  const expectedQueued = ["TEST1", "TEST2"];
  Logger.log("Checking queued texts...");
  expectedQueued.forEach(id => {
    const found = queuedTexts.some(row => row[0] === id);
    Logger.log(found ? `PASS: Queued text for ${id}` : `FAIL: Missing queued text for ${id}`);
  });

  // Check pipeline updates
  const resultData = pipelineSheet.getRange(4, 1, testData.length, testData[0].length).getValues();
  const expectedRows = [
    { driverId: "TEST1", AM: 1, outreach: todayFormatted, status: "" },
    { driverId: "TEST2", AM: 2, outreach: todayFormatted, status: "" },
    { driverId: "TEST3", AM: 2, outreach: staleFormatted, status: "Abandoned" },
    { driverId: "TEST4", AM: 1, outreach: todayFormatted, status: "" },
    { driverId: "TEST5", AM: 1, outreach: staleFormatted, status: "" },
  ];

  Logger.log("Checking pipeline updates...");
  resultData.forEach((row, i) => {
    const driverId = row[9];
    const lastOutreach = makeSafeDateChicago(new Date(row[17]));
    const am = row[38];
    const status = row[1];
    const expected = expectedRows[i];
    const pass = (am === expected.AM) && (lastOutreach === expected.outreach) && (status === expected.status);

    Logger.log(pass ? `PASS: ${driverId}` : `FAIL: ${driverId} — Expected AM: ${expected.AM}, Outreach: ${expected.outreach}, Status: ${expected.status}`);
  });

  Logger.log("Now simulating sendAllTexts and markTextedInGeorgeSheetOnce...");
  sendAllTexts(textGeorgeSheet);
  markTextedInGeorgeSheetOnce(textGeorgeSheet, sentTextsSheet);

  // Verify queue is empty
  const remaining = textGeorgeSheet.getLastRow() - 3;
  Logger.log(remaining <= 0 ? "PASS: Text George queue is empty" : "FAIL: Queue still has rows");

  // Cleanup
  Logger.log("Cleaning up test sheets...");
  [pipelineSheet, textGeorgeSheet, sentTextsSheet].forEach(sheet => sheet.getParent().deleteSheet(sheet));
  Logger.log("Test complete.");
}

function test_RunPrescreenFollowUp() {
  Logger.log("START test_RunPrescreenFollowUp");
  FLAGS.ENABLE_TEXTING = false;

  const ss = SpreadsheetApp.openById(CONFIG.sheetIds.formResponses);
  const texting = SpreadsheetApp.openById(CONFIG.sheetIds.massText);

  const testPipelineName = "Test_Pipeline";
  const testTextGeorgeName = "Test_Text_George";

  // Clean up any existing test sheets
  const existingPipeline = ss.getSheetByName(testPipelineName);
  if (existingPipeline) ss.deleteSheet(existingPipeline);

  const existingTextGeorge = texting.getSheetByName(testTextGeorgeName);
  if (existingTextGeorge) texting.deleteSheet(existingTextGeorge);

  // Create fresh test sheets
  const testPipelineSheet = ss.insertSheet(testPipelineName);
  const testTextGeorgeSheet = texting.insertSheet(testTextGeorgeName);

  // Headers
  const headers = Array(46).fill("").map((_, i) => `Col ${i + 1}`);
  testPipelineSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Date setup
  const today = makeSafeSheetDateChi(new Date());
  const staleDate = makeSafeSheetDateChi(new Date(today.getTime() - 5 * 86400000));
  const todayFormatted = Utilities.formatDate(today, "America/Chicago", "MM/dd/yyyy");
  const staleFormatted = Utilities.formatDate(staleDate, "America/Chicago", "MM/dd/yyyy");

  // Test data
  const testData = [
    createTestRow({ driverId: "TEST1", status: "Pending", lastOutreach: staleDate, extraAttempts: 0, outreachFlag: 1 }),
    createTestRow({ driverId: "TEST2", status: "Pending", lastOutreach: staleDate, extraAttempts: 1, outreachFlag: 1 }),
    createTestRow({ driverId: "TEST3", status: "Pending", lastOutreach: staleDate, extraAttempts: 2, outreachFlag: 1 }),
    createTestRow({ driverId: "TEST4", status: "Pending", lastOutreach: today, extraAttempts: 1, outreachFlag: 0 }),
    createTestRow({ driverId: "TEST5", status: "Pass", lastOutreach: staleDate, extraAttempts: 1, outreachFlag: 0 }),
  ];
  testPipelineSheet.getRange(4, 1, testData.length, testData[0].length).setValues(testData);

  Logger.log("Test data written. Running runPrescreenFollowUp...");

  // RUN
  runPrescreenFollowUp(testPipelineSheet, testTextGeorgeSheet);

  // VERIFY PIPELINE
  const resultData = testPipelineSheet.getRange(4, 1, testData.length, testData[0].length).getValues();
  const checks = [
    { driverId: "TEST1", expectedAM: 1, expectedLastOutreach: todayFormatted },
    { driverId: "TEST2", expectedAM: 2, expectedLastOutreach: todayFormatted },
    { driverId: "TEST3", expectedAM: 2, expectedLastOutreach: staleFormatted, expectedAbandoned: "Abandoned" },
    { driverId: "TEST4", expectedAM: 1, expectedLastOutreach: todayFormatted },
    { driverId: "TEST5", expectedAM: 1, expectedLastOutreach: staleFormatted },
  ];

  Logger.log("Checking pipeline updates...");
  resultData.forEach((row, i) => {
    const driverId = row[9];
    const lastOutreachDate = makeSafeSheetDateChi(new Date(row[17]));
    const lastOutreachFormatted = Utilities.formatDate(lastOutreachDate, "America/Chicago", "MM/dd/yyyy");
    const extraAttempts = row[38];
    const abandonedStatus = row[1];

    const exp = checks[i];
    let pass = true;
    if (extraAttempts !== exp.expectedAM) pass = false;
    if (lastOutreachFormatted !== exp.expectedLastOutreach) pass = false;
    if (exp.expectedAbandoned && abandonedStatus !== exp.expectedAbandoned) pass = false;

    if (pass) {
      Logger.log(`PASS: ${driverId}`);
    } else {
      Logger.log(`FAIL: ${driverId}`);
      Logger.log(`  Expected -> AM: ${exp.expectedAM}, Outreach: ${exp.expectedLastOutreach}, Status: ${exp.expectedAbandoned || ""}`);
      Logger.log(`  Got      -> AM: ${extraAttempts}, Outreach: ${lastOutreachFormatted}, Status: ${abandonedStatus}`);
    }
  });

  // VERIFY QUEUED TEXTS
  let queuedTexts = [];
  const queuedCount = testTextGeorgeSheet.getLastRow() - 3;
  if (queuedCount > 0) {
    queuedTexts = testTextGeorgeSheet.getRange(4, 1, queuedCount, 3).getValues();
  }

  const expectedQueuedIds = ["TEST1", "TEST2"];
  Logger.log("Checking queued texts...");
  expectedQueuedIds.forEach(id => {
    if (queuedTexts.some(row => row[0] === id)) {
      Logger.log(`PASS: Queued text for ${id}`);
    } else {
      Logger.log(`FAIL: Missing queued text for ${id}`);
    }
  });

  // CLEANUP
  Logger.log("Cleaning up test sheets...");
  [testPipelineSheet, testTextGeorgeSheet].forEach(sheet => {
    sheet.getParent().deleteSheet(sheet);
  });

  Logger.log("test_RunPrescreenFollowUp complete.");
}
  
/**
 * Create a test row for candidate pipeline
 * Columns:
 *  - Col J (10): Driver ID
 *  - Col R (18): Last Outreach
 *  - Col W (23): Status
 *  - Col AM (39): Extra Attempts
 *  - Col AT (46): Outreach Flag
 */
function createTestRow({ driverId, status, lastOutreach, extraAttempts, outreachFlag }) {
  const row = Array(46).fill("");
  row[9]  = driverId;         // Col J
  row[17] = lastOutreach;     // Col R
  row[22] = status;           // Col W
  row[38] = extraAttempts;    // Col AM
  row[45] = outreachFlag;     // Col AT
  return row;
}