//dvisabled flag, simulates clearing
function test_sendAllTexts_unit() {
    FLAGS.ENABLE_TEXTING = false;
  
    const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
    const tempSheet = ss.insertSheet("TempSendAllTest");
    tempSheet.clear();
    tempSheet.getRange(1, 1, 3, 3).setValues([
      ["", "", ""],
      ["", "", ""],
      ["Driver ID", "Message", "Convo"]
    ]);
  
    try {
      // verify one row for testing:
      tempSheet.getRange(4, 1, 1, 3).setValues([
        ["test-driver-1", "Hello from unit test", "Unit_convo"]
      ]);
      // Verify the row was written before sending
      const data = tempSheet.getRange(4, 1, tempSheet.getLastRow() - 3, 3).getValues();
      expectEqual(data.length, 1, "Should write 1 row total");
      expectEqual(data[0][0], "test-driver-1", "First driver ID should match");
      expectEqual(data[0][1], "Hello from unit test", "Message should match");
      expectEqual(data[0][2], "Unit_convo", "Convo name should match");
  
      // Simulate sending (which clears the sheet)
      sendAllTexts(tempSheet);
  
      // Verify the row is removed
    const rowsAfterSend = tempSheet.getLastRow() - 3;
    const afterSendData = rowsAfterSend > 0
    ? tempSheet.getRange(4, 1, rowsAfterSend, 3).getValues()
    : [];
    expectEqual(afterSendData.length, 0, "Sheet should be cleared after sending");
  
    } finally {
      ss.deleteSheet(tempSheet);
    }
  
    Logger.log("test_sendAllTexts_unit passed");
}

function test_markTextedInGeorgeSheetOnce_removesMatchingRow() {
  Logger.log("Starting test_markTextedInGeorgeSheetOnce_removesMatchingRow");

  // Create temporary test sheets
  const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
  const textGeorge = ss.insertSheet("Temp_TextGeorge");
  const sentTexts = ss.insertSheet("Temp_SentTexts");

  try {
    // 1️⃣ Setup headers
    textGeorge.getRange(3, 1, 1, 3).setValues([["Driver ID", "Message", "Convo"]]);
    sentTexts.getRange(3, 1, 1, 4).setValues([["", "Driver ID", "Convo", "Message"]]);

    // 2️⃣ Add a driver who is in both TEXT GEORGE and SENT TEXTS
    const driverId = "TEST_DRIVER_123";
    const message = "Hello unit test";

    textGeorge.appendRow([driverId, message, "TestConvo"]);
    sentTexts.appendRow(["", driverId, "TestConvo", message]);

    SpreadsheetApp.flush();

    // 3️⃣ Call the function under test
    markTextedInGeorgeSheetOnce(textGeorge, sentTexts);

    // 4️⃣ Verify: TEXT GEORGE should now be empty
    const lastRow = textGeorge.getLastRow();
    const numRows = Math.max(0, lastRow - 3);
    const remaining = numRows > 0
      ? textGeorge.getRange(4, 1, numRows, 3).getValues()
      : [];

    expectEqual(remaining.length, 0, "TEXT GEORGE should be empty after cleanup");

    Logger.log("test_markTextedInGeorgeSheetOnce_removesMatchingRow PASSED!");
  } finally {
    // Always clean up
    ss.deleteSheet(textGeorge);
    ss.deleteSheet(sentTexts);
  }
}

function test_deleteThisTrigger_cleansUp() {
  Logger.log("Starting test_deleteThisTrigger_cleansUp");

  const testHandlerName = 'dummyTriggerFunction';

  // 1️⃣ Ensure no leftover triggers
  deleteThisTrigger(testHandlerName);

  // 2️⃣ Create a new test trigger
  ScriptApp.newTrigger(testHandlerName)
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log(`Created dummy trigger: ${testHandlerName}`);

  try {
    // 3️⃣ Confirm it exists
    let triggers = ScriptApp.getProjectTriggers();
    const existsBefore = triggers.some(t => t.getHandlerFunction() === testHandlerName);
    expectTrue(existsBefore, "Trigger should exist before deletion");

    // 4️⃣ Delete it
    deleteThisTrigger(testHandlerName);

    // 5️⃣ Confirm it's gone
    triggers = ScriptApp.getProjectTriggers();
    const existsAfter = triggers.some(t => t.getHandlerFunction() === testHandlerName);
    expectFalse(existsAfter, "Trigger should be deleted");

    Logger.log("test_deleteThisTrigger_cleansUp PASSED!");
  } finally {
    // 6️⃣ Always clean up
    deleteThisTrigger(testHandlerName);
  }
}
  
  // Dummy function used for trigger creation (must be defined in script to work)
function dummyTriggerFunction() {
    Logger.log("Dummy trigger ran");
}

// function test_findSendTextRow_createsTriggerAndSetsStartTime() {
//   Logger.log("Starting test_findSendTextRow_createsTriggerAndSetsStartTime");

//   const props = PropertiesService.getScriptProperties();
//   const triggerHandler = 'markTextedInGeorgeSheet';

//   // 1️⃣ Ensure a clean state
//   deleteThisTrigger(triggerHandler);
//   props.deleteProperty('startTime');

//   try {
//     // 2️⃣ Call the function under test
//     findSendTextRow();

//     // 3️⃣ Check that startTime was set
//     const startTime = props.getProperty('startTime');
//     expectTrue(!!startTime, "startTime should be set in script properties");

//     // 4️⃣ Check that the trigger was created
//     const triggers = ScriptApp.getProjectTriggers();
//     const found = triggers.some(t => t.getHandlerFunction() === triggerHandler);
//     expectTrue(found, "Trigger for markTextedInGeorgeSheet should exist");

//     Logger.log("test_findSendTextRow_createsTriggerAndSetsStartTime PASSED!");
//   } finally {
//     // 5️⃣ Always clean up after the test
//     deleteThisTrigger(triggerHandler);
//     props.deleteProperty('startTime');
//   }
// }

// checking empty state
function test_isGeorgeQueueEmpty() {
  Logger.log("Running test_isGeorgeQueueEmpty");

  const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
  const tempTextGeorge = ss.insertSheet("Temp_TextGeorge_EmptyTest");

  try {
    // Setup headers
    tempTextGeorge.getRange("A1:C3").setValues([
      ["", "", ""],
      ["", "", ""],
      ["Driver ID", "Message", "Convo"]
    ]);

    // 1️⃣ Should be empty
    const emptyResult = isGeorgeQueueEmpty(tempTextGeorge);
    expectTrue(emptyResult, "Should be empty when no driver rows");

    // 2️⃣ Add a row
    tempTextGeorge.appendRow(["DRV999", "Test message", "TestConvo"]);

    // 3️⃣ Should now return false
    const notEmptyResult = isGeorgeQueueEmpty(tempTextGeorge);
    expectFalse(notEmptyResult, "Should not be empty when row exists");

    Logger.log("test_isGeorgeQueueEmpty passed");
  } finally {
    ss.deleteSheet(tempTextGeorge);
  }
}

// deletes from TEXT GEORGE, updates Candidate Pipeline
function test_1processSentTexts_ENABLE_TEXTING_FALSE() {
  Logger.log("Running 1/4 test_processSentTexts ENABLE_TEXTING_true");
  FLAGS.ENABLE_TEXTING = false;

  const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
  const tempTextGeorge = ss.insertSheet("Temp_TextGeorge_ProcessTest");
  const tempSentTexts = ss.insertSheet("Temp_SentTexts_ProcessTest");
  const tempPipeline = ss.insertSheet("Temp_CandidatePipeline_ProcessTest");

  try {
    // 1️⃣ Setup TEXT GEORGE headers and row
    tempTextGeorge.getRange("A1:C3").setValues([
      ["", "", ""],
      ["", "", ""],
      ["Driver ID", "Message", "Convo"]
    ]);
    const testDriverId = "DRV_TEST_PROCESS";
    const testMessage = "Hello test world";
    const testConvo = "TestConvo";
    tempTextGeorge.appendRow([testDriverId, testMessage, testConvo]);

    // 2️⃣ Setup SENT TEXTS headers and row
    tempSentTexts.getRange("A1:D3").setValues([
      ["", "", "", ""],
      ["", "", "", ""],
      ["Date", "Driver ID", "Convo", "Message"]
    ]);
    tempSentTexts.appendRow([new Date(), testDriverId, testConvo, testMessage]);

    // 3️⃣ Setup Candidate Pipeline headers and row
    const headers = new Array(52).fill("");
    headers[1] = "Master Status";         // Col B
    headers[9] = "Sally ID";              // DRIVER_ID (col J)
    headers[17] = "Latest Outreach Date"; // Col R
    headers[22] = "Prescreen Result";     // Col W
    tempPipeline.getRange(3, 1, 1, headers.length).setValues([headers]);

    const candidateRow = new Array(52).fill("");
    candidateRow[9] = testDriverId;
    tempPipeline.getRange(4, 1, 1, 52).setValues([candidateRow]);

    // 4️⃣ Call function
    processSentTexts(tempTextGeorge, tempSentTexts, tempPipeline);

    // 5️⃣ Assert TEXT GEORGE is empty
    const remainingRows = tempTextGeorge.getLastRow() - 3;
    expectEqual(remainingRows, 0, "TextGeorge should be empty after cleanup");

    // 6️⃣ Assert Candidate Pipeline updated
    const updatedRow = tempPipeline.getRange(4, 1, 1, 52).getValues()[0];
    expectEqual(updatedRow[1], "", "Master Status should not be updated");
    expectTrue(!!updatedRow[17], "Latest Outreach Date should be set");
    expectEqual(updatedRow[22], "Pending", "Prescreen result should be Pending");

    Logger.log("1/4 test_processSentTexts passed!");
  } finally {
    ss.deleteSheet(tempTextGeorge);
    ss.deleteSheet(tempSentTexts);
    ss.deleteSheet(tempPipeline);
  }
}

function test_2processSentTexts_ENABLE_TEXTING_FALSE_failed() {
  Logger.log("Running 2/4 test_processSentTexts ENABLE_TEXTING_true - failed driver");
  FLAGS.ENABLE_TEXTING = false;

  const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
  const tempTextGeorge = ss.insertSheet("Temp_TextGeorge_ProcessTest");
  const tempSentTexts = ss.insertSheet("Temp_SentTexts_ProcessTest");
  const tempPipeline = ss.insertSheet("Temp_CandidatePipeline_ProcessTest");

  try {
    // 1️⃣ Setup TEXT GEORGE headers and row
    tempTextGeorge.getRange("A1:C3").setValues([
      ["", "", ""],
      ["", "", ""],
      ["Driver ID", "Message", "Convo"]
    ]);
    const testDriverId = "DRV_TEST_PROCESS";
    const testMessage = "Hello test world";
    const testConvo = "TestConvo";
    tempTextGeorge.appendRow([testDriverId, testMessage, testConvo]);

    // 2️⃣ Setup SENT TEXTS headers and row
    tempSentTexts.getRange("A1:D3").setValues([
      ["", "", "", ""],
      ["", "", "", ""],
      ["Date", "Driver ID", "Convo", "Message"]
    ]);
    tempSentTexts.appendRow([new Date(), testDriverId, testConvo, testMessage]);

    // 3️⃣ Setup Candidate Pipeline headers and row
    const headers = new Array(52).fill("");
    headers[1] = "Master Status";         // Col B
    headers[9] = "Sally ID";              // DRIVER_ID (col J)
    headers[17] = "Latest Outreach Date"; // Col R
    headers[22] = "Prescreen Result";     // Col W
    tempPipeline.getRange(3, 1, 1, headers.length).setValues([headers]);

    const candidateRow = new Array(52).fill("");
    candidateRow[9] = testDriverId;
    candidateRow[1] = "Rejected"
    tempPipeline.getRange(4, 1, 1, 52).setValues([candidateRow]);

    // 4️⃣ Call function
    processSentTexts(tempTextGeorge, tempSentTexts, tempPipeline);

    // 5️⃣ Assert TEXT GEORGE is empty
    const remainingRows = tempTextGeorge.getLastRow() - 3;
    expectEqual(remainingRows, 0, "TextGeorge should be empty after cleanup");

    // 6️⃣ Assert Candidate Pipeline updated
    const updatedRow = tempPipeline.getRange(4, 1, 1, 52).getValues()[0];
    expectEqual(updatedRow[1], "Rejected", "Master Status should not be updated");
    expectTrue(!!updatedRow[17], "Latest Outreach Date should be set");
    expectEqual(updatedRow[22],"", "Prescreen result should be blank");

    Logger.log("2/4 test_processSentTexts passed!");
  } finally {
    ss.deleteSheet(tempTextGeorge);
    ss.deleteSheet(tempSentTexts);
    ss.deleteSheet(tempPipeline);
  }
}

// deletes from TEXT GEORGE, updates Candidate Pipeline
function test_3processSentTexts_ENABLE_TEXTING_true() {
  Logger.log("Running 3/4 test_processSentTexts ENABLE_TEXTING_true");
  FLAGS.ENABLE_TEXTING = true;

  const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
  const tempTextGeorge = ss.insertSheet("Temp_TextGeorge_ProcessTest");
  const tempSentTexts = ss.insertSheet("Temp_SentTexts_ProcessTest");
  const tempPipeline = ss.insertSheet("Temp_CandidatePipeline_ProcessTest");

  try {
    // 1️⃣ Setup TEXT GEORGE headers and row
    tempTextGeorge.getRange("A1:C3").setValues([
      ["", "", ""],
      ["", "", ""],
      ["Driver ID", "Message", "Convo"]
    ]);
    const testDriverId = "DRV_TEST_PROCESS";
    const testMessage = "Hello test world";
    const testConvo = "TestConvo";
    tempTextGeorge.appendRow([testDriverId, testMessage, testConvo]);

    // 2️⃣ Setup SENT TEXTS headers and row
    tempSentTexts.getRange("A1:D3").setValues([
      ["", "", "", ""],
      ["", "", "", ""],
      ["Date", "Driver ID", "Convo", "Message"]
    ]);
    tempSentTexts.appendRow([new Date(), testDriverId, testConvo, testMessage]);

    // 3️⃣ Setup Candidate Pipeline headers and row
    const headers = new Array(52).fill("");
    headers[1] = "Master Status";         // Col B
    headers[9] = "Sally ID";              // DRIVER_ID (col J)
    headers[17] = "Latest Outreach Date"; // Col R
    headers[22] = "Prescreen Result";     // Col W
    tempPipeline.getRange(3, 1, 1, headers.length).setValues([headers]);

    const candidateRow = new Array(52).fill("");
    candidateRow[9] = testDriverId;
    tempPipeline.getRange(4, 1, 1, 52).setValues([candidateRow]);

    // 4️⃣ Call function
    processSentTexts(tempTextGeorge, tempSentTexts, tempPipeline);

    // 5️⃣ Assert TEXT GEORGE is empty
    const remainingRows = tempTextGeorge.getLastRow() - 3;
    expectEqual(remainingRows, 0, "TextGeorge should be empty after cleanup");

    // 6️⃣ Assert Candidate Pipeline updated
    const updatedRow = tempPipeline.getRange(4, 1, 1, 52).getValues()[0];
    expectEqual(updatedRow[1], "", "Master Status should not be updated");
    expectTrue(!!updatedRow[17], "Latest Outreach Date should be set");
    expectEqual(updatedRow[22], "Pending", "Prescreen result should be Pending");

    Logger.log("3/4 test_processSentTexts passed!");
  } finally {
    ss.deleteSheet(tempTextGeorge);
    ss.deleteSheet(tempSentTexts);
    ss.deleteSheet(tempPipeline);
    FLAGS.ENABLE_TEXTING = false;
  }
}

function test_4processSentTexts_ENABLE_TEXTING_true_failed() {
  Logger.log("Running 4/4 test_processSentTexts ENABLE_TEXTING_true - failed driver");
  FLAGS.ENABLE_TEXTING = true;

  const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
  const tempTextGeorge = ss.insertSheet("Temp_TextGeorge_ProcessTest");
  const tempSentTexts = ss.insertSheet("Temp_SentTexts_ProcessTest");
  const tempPipeline = ss.insertSheet("Temp_CandidatePipeline_ProcessTest");

  try {
    // 1️⃣ Setup TEXT GEORGE headers and row
    tempTextGeorge.getRange("A1:C3").setValues([
      ["", "", ""],
      ["", "", ""],
      ["Driver ID", "Message", "Convo"]
    ]);
    const testDriverId = "DRV_TEST_PROCESS";
    const testMessage = "Hello test world";
    const testConvo = "TestConvo";
    tempTextGeorge.appendRow([testDriverId, testMessage, testConvo]);

    // 2️⃣ Setup SENT TEXTS headers and row
    tempSentTexts.getRange("A1:D3").setValues([
      ["", "", "", ""],
      ["", "", "", ""],
      ["Date", "Driver ID", "Convo", "Message"]
    ]);
    tempSentTexts.appendRow([new Date(), testDriverId, testConvo, testMessage]);

    // 3️⃣ Setup Candidate Pipeline headers and row
    const headers = new Array(52).fill("");
    headers[1] = "Master Status";         // Col B
    headers[9] = "Sally ID";              // DRIVER_ID (col J)
    headers[17] = "Latest Outreach Date"; // Col R
    headers[22] = "Prescreen Result";     // Col W
    tempPipeline.getRange(3, 1, 1, headers.length).setValues([headers]);

    const candidateRow = new Array(52).fill("");
    candidateRow[9] = testDriverId;
    candidateRow[1] = "Rejected"
    tempPipeline.getRange(4, 1, 1, 52).setValues([candidateRow]);

    // 4️⃣ Call function
    processSentTexts(tempTextGeorge, tempSentTexts, tempPipeline);

    // 5️⃣ Assert TEXT GEORGE is empty
    const remainingRows = tempTextGeorge.getLastRow() - 3;
    expectEqual(remainingRows, 0, "TextGeorge should be empty after cleanup");

    // 6️⃣ Assert Candidate Pipeline updated
    const updatedRow = tempPipeline.getRange(4, 1, 1, 52).getValues()[0];
    expectEqual(updatedRow[1], "Rejected", "Master Status should not be updated");
    expectTrue(!!updatedRow[17], "Latest Outreach Date should be set");
    expectEqual(updatedRow[22],"", "Prescreen result should be blank");

    Logger.log("4/4 test_processSentTexts passed!");
  } finally {
    ss.deleteSheet(tempTextGeorge);
    ss.deleteSheet(tempSentTexts);
    ss.deleteSheet(tempPipeline);
    FLAGS.ENABLE_TEXTING = false;
  }
}

function test_updateCandidateBeforeText() {
  Logger.log("Running test_updateCandidateBeforeText");

  const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
  const tempPipeline = ss.insertSheet("Temp_CandidatePipeline_UpdateTest");

  try {
    // 1️⃣ Setup HEADERS
    const headers = new Array(52).fill("");
    headers[1] = "Master Status";         
    headers[9] = "Sally ID";              
    headers[26] = "Notes";                
    tempPipeline.getRange(3, 1, 1, headers.length).setValues([headers]);

    const COL = {
      STATUS: 1,
      DRIVER_ID: 9,
      NOTES: 26
    };

    /**
     * === CASE 1️⃣: Normal driver - sets Pending and appends note
     */
    const rowNormal = new Array(52).fill("");
    rowNormal[9] = "DRV_TEST_1";
    rowNormal[26] = "Existing notes.";
    tempPipeline.getRange(4, 1, 1, 52).setValues([rowNormal]);

    updateCandidateBeforeText({
      driverId: "DRV_TEST_1",
      COL,
      rowIdx: 4,
      sheet: tempPipeline,
      statusToSet: "Pending",
      noteToAppend: "Appended Note"
    });

    const updated1 = tempPipeline.getRange(4, 1, 1, 52).getValues()[0];
    expectEqual(updated1[1], "Pending", "Status should be Pending");
    expectTrue(updated1[26].includes("Appended Note"), "Notes should include appended text");

    Logger.log("CASE 1 PASSED - Normal driver");

    /**
     * === CASE 2️⃣: Blacklisted driver - sets Blacklisted and appends note
     */
    const rowBlacklist = new Array(52).fill("");
    rowBlacklist[9] = "DRV_TEST_2";
    rowBlacklist[26] = "Existing notes.";
    tempPipeline.getRange(5, 1, 1, 52).setValues([rowBlacklist]);

    updateCandidateBeforeText({
      driverId: "DRV_TEST_2",
      COL,
      rowIdx: 5,
      sheet: tempPipeline,
      statusToSet: "Blacklisted",
      noteToAppend: "BLACKLISTED Note"
    });

    const updated2 = tempPipeline.getRange(5, 1, 1, 52).getValues()[0];
    expectEqual(updated2[1], "Blacklisted", "Status should be Blacklisted");
    expectTrue(updated2[26].includes("BLACKLISTED Note"), "Notes should include blacklist note");

    Logger.log("CASE 2 PASSED - Blacklisted driver");

    Logger.log("test_updateCandidateBeforeText COMPLETED!");
  } finally {
    ss.deleteSheet(tempPipeline);
  }
}

// big integration test for classifying rows and queueing to TEXT GEORGE
function test_processNewCandidatesFromRows() {
  Logger.log("Running test_processNewCandidatesFromRows");
  FLAGS.ENABLE_TEXTING = false;

  const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
  const tempPipeline = ss.insertSheet("Temp_CandidatePipeline_ProcessTest");
  const tempTextGeorge = ss.insertSheet("Temp_TextGeorge_ProcessTest");
  const tempSentTexts = ss.insertSheet("Temp_SentTexts_ProcessTest");

  try {
    // 1️⃣ Setup headers
    const headers = new Array(52).fill("");
    headers[1] = "Master Status";
    headers[9] = "Sally ID";              // DRIVER_ID (col J)
    headers[14] = "Override";
    headers[15] = "Master Criteria Check"; // PASS_FAIL
    headers[16] = "First Outreach";
    headers[17] = "Latest Outreach Date";
    headers[22] = "Prescreen Results";
    headers[26] = "Notes";                 // for blacklist tag
    tempPipeline.getRange(3, 1, 1, headers.length).setValues([headers]);

    // 2️⃣ Add 3 test rows
    const today = makeSafeSheetDate(new Date());

    const passRow = new Array(52).fill("");
    passRow[9] = "DRV_PASS";
    passRow[15] = "Pass";

    const failRow = new Array(52).fill("");
    failRow[9] = "DRV_FAIL";
    failRow[15] = "Fail";

    const blacklistRow = new Array(52).fill("");
    blacklistRow[9] = "DRV_BLACKLIST";
    blacklistRow[15] = "Pass";
    blacklistRow[26] = "BLACKLISTED";  // triggers isBlacklisted()

    tempPipeline.getRange(4, 1, 3, 52).setValues([passRow, failRow, blacklistRow]);
    // Setup TEXT GEORGE and SENT TEXTS headers
    tempTextGeorge.getRange(3, 1, 1, 3).setValues([["Driver ID", "Message", "Convo"]]);
    tempSentTexts.getRange(3, 1, 1, 4).setValues([["Date", "Driver ID", "Convo", "Message"]]);
    
    // 3️⃣ Call the function!
    processNewCandidatesFromRows(
      4,
      3,
      tempPipeline,
      tempTextGeorge,
      tempSentTexts,
      (driverId) => driverId === "DRV_BLACKLIST" ? "BLACKLISTED" : "" // custom checkDriverStatsFn
    );
    
    //  4️⃣ Check TEXT GEORGE
    const numQueued = tempTextGeorge.getLastRow() - 3;
    expectTrue(numQueued > 0, "Should have at least 1 queued row in TEXT GEORGE");

    const queuedRows = numQueued > 0
      ? tempTextGeorge.getRange(4, 1, numQueued, 3).getValues()
      : [];
    expectEqual(queuedRows.length, 3, "Should queue 3 texts");

    const convoNames = queuedRows.map(row => row[2]);
    expectTrue(convoNames.includes(CONFIG.convoNames.prescreenFormText), "Includes prescreen text");
    expectTrue(convoNames.includes(CONFIG.convoNames.initial_criteria_reject), "Includes reject text");
    expectTrue(convoNames.includes(CONFIG.convoNames.blacklist_reject), "Includes blacklist text");

    // 5️⃣ Check Candidate Pipeline updates
    const updatedRows = tempPipeline.getRange(4, 1, 3, 52).getValues();

    const passUpdated = updatedRows.find(r => r[9] === "DRV_PASS");
    expectEqual(passUpdated[1], "Pending", "PASS row should have Pending status");
    expectEqual(passUpdated[22], "", "PASS row should have nothing in Prescreen Result");
    expectEqual(passUpdated[16], "", "PASS row should NOT have First Outreach");
    expectEqual(passUpdated[17], "", "PASS row should NOT have Latest Outreach");

    const failUpdated = updatedRows.find(r => r[9] === "DRV_FAIL");
    expectEqual(failUpdated[1], "Rejected", "FAIL row should have Rejected status");
    expectEqual(failUpdated[16], "", "FAIL row should not have First Outreach");

    const blacklistUpdated = updatedRows.find(r => r[9] === "DRV_BLACKLIST");
    expectEqual(blacklistUpdated[1], "Rejected", "Blacklist row should have Rejected status");
    expectTrue(blacklistUpdated[26].includes("BLACKLISTED"), "Blacklist notes should include BLACKLISTED");
    expectEqual(blacklistUpdated[17], "", "Blacklist row should NOT have Latest Outreach");
    Logger.log("test_processNewCandidatesFromRows passed!");

  } finally {
    ss.deleteSheet(tempPipeline);
    ss.deleteSheet(tempTextGeorge);
    ss.deleteSheet(tempSentTexts);
  }
}

function test_markTextedInGeorgeSheetOnce_returnsMatchedIds() {
  Logger.log("Running test_markTextedInGeorgeSheetOnce_returnsMatchedIds");

  const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
  const textGeorge = ss.insertSheet("Temp_TextGeorge_Test");
  const sentTexts = ss.insertSheet("Temp_SentTexts_Test");

  try {
    // 1️⃣ Set headers in row 3
    textGeorge.getRange(3, 1, 1, 3).setValues([["Driver ID", "Message", "Convo"]]);
    sentTexts.getRange(3, 1, 1, 4).setValues([["Date", "Driver ID", "Convo", "Message"]]);

    // 2️⃣ Add data:
    // TEXT GEORGE rows
    textGeorge.appendRow(["DRV_MATCH", "Hello there", "TestConvo_20250704"]);
    textGeorge.appendRow(["DRV_NO_MATCH", "Unsent message", "TestConvo"]);

    // SENT TEXTS row
    sentTexts.appendRow([new Date(), "DRV_MATCH", "TestConvo_20250704", "Hello there"]);

    SpreadsheetApp.flush();

    // 3️⃣ Call the function
    const matched = markTextedInGeorgeSheetOnce(textGeorge, sentTexts);
    SpreadsheetApp.flush();

    // 4️⃣ Check returned IDs
    expectEqual(matched.length, 1, "Should return exactly 1 matched ID");
    expectEqual(matched[0], "DRV_MATCH", "Should return DRV_MATCH as matched ID");

    // 5️⃣ Check remaining TEXT GEORGE rows
    const remaining = textGeorge.getRange(4, 1, textGeorge.getLastRow() - 3, 3).getValues();
    expectEqual(remaining.length, 1, "Should have 1 row left after deletion");
    expectEqual(remaining[0][0], "DRV_NO_MATCH", "Remaining row should be DRV_NO_MATCH");

    Logger.log("test_markTextedInGeorgeSheetOnce_returnsMatchedIds PASSED!");
  } finally {
    ss.deleteSheet(textGeorge);
    ss.deleteSheet(sentTexts);
  }
}

function test_queueTextRowFreezesMessage() {
  Logger.log("Running test_queueTextRowFreezesMessage");

  // Setup
  const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
  const tempTextGeorge = ss.insertSheet("Temp_TextGeorge_TestQueue");

  try {
    // Add headers so messages start at row 4
    tempTextGeorge.getRange(3, 1, 1, 3).setValues([["Driver ID", "Message", "Convo"]]);

    // Your frozen test text
    const testDriverId = "DRV_TEST_123";
    const testMessage = "THIS IS THE EXACT MESSAGE";
    const testConvoName = "TestConvo_2025";

    // Act
    queueTextRow(tempTextGeorge, testDriverId, testMessage, testConvoName);

    // Assert
    const queuedRow = tempTextGeorge.getRange(4, 1, 1, 3).getValues()[0];
    expectEqual(queuedRow[0], testDriverId, "Driver ID matches");
    expectEqual(queuedRow[1], testMessage, "Message was frozen exactly");
    expectEqual(queuedRow[2], testConvoName, "Convo name was frozen exactly");

    Logger.log("test_queueTextRowFreezesMessage PASSED!");
  } finally {
    ss.deleteSheet(tempTextGeorge);
  }
}