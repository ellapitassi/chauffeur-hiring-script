function getTestSheets(testNum) {
    const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText)
    // 1. MOCK CANDIDATE PIPELINE
    const testPipeline = ss.insertSheet(`${testNum}.test_PIPELINE_ ${getFormattedESTTimestamp()}`);
    const headers = Array(52).fill("");
    headers[1] = "Master Status";
    headers[9] = "Sally ID";                // DRIVER_ID
    headers[14] = "Override";              // COL.OVERRIDE
    headers[15] = "Master Criteria Check"; // PASS_FAIL
    headers[16] = "First Outreach";
    headers[17] = "Latest Outreach Date";
    headers[22] = "Prescreen Results";
    headers[26] = "Notes";                 // for blacklist tag
    
    testPipeline.getRange(3, 1, 1, headers.length).setValues([headers]);

    // 2. MOCK TEXT GEORGE SHEET
    const testTextGeorge = ss.insertSheet(`${testNum}.test_TEXTGEORGE_ ${getFormattedESTTimestamp()}`);
    testTextGeorge.getRange(3, 1, 1, 3).setValues([["DRIVERS TO BE TEXTED", "TEXT", "CONVERSATION NAME"]]);

    // 3. MOCK SENT TEXTS SHEET
    const testSentTexts = ss.insertSheet(`${testNum}.test_SENTTEXTS_ ${getFormattedESTTimestamp()}`);
    testSentTexts.getRange(2, 1, 1, 4).setValues([["Date", "Driver ID", "Convo Name", "Text"]]);
    return { testPipeline, testTextGeorge, testSentTexts };
}

function test_processNewCandidates_queueingCorrectTexts() {
    Logger.log("1. Testing test_processNewCandidates_queueingCorrectTexts");
    FLAGS.ENABLE_TEXTING = false;
    Logger.log("🚫 Texting is DISABLED — running in test mode");
    const { testPipeline, testTextGeorge, testSentTexts } = getTestSheets(1);
    const headers = [
      "A","B","C","D","E","F","G","H","I","J",
      "K","L","M","N","O","P","Q","R","S","T",
      "U","V","W","X","Y","Z","AA"
    ];
    // add test cases
    const testRows = [
      setRow({ 9: "DRV111", 15: "Pass" }),                   // Should get prescreen text
      setRow({ 9: "ADAMS_NAKEMA_57115", 15: "Pass"}),        // Should get blacklist rejection
      setRow({ 9: "DRV222", 15: "Fail" })                    // Should get base rejection
    ];
  
    testPipeline.getRange(4, 1, testRows.length, headers.length).setValues(testRows);
  
    // Run the function, to queue the texts
    processNewCandidatesFromRows(4, 3, testPipeline, testTextGeorge, testSentTexts);
  
    // 6. Read queued texts
    const startRow = 4;
    const numRows = testTextGeorge.getLastRow() - 3;
    const result = testTextGeorge.getRange(startRow, 1, numRows, 3).getValues();
  
    // Replace this with your expected value
    const expectedNumRows = 3;
    if (numRows !== expectedNumRows) {
        throw new Error(`❌ Test failed: Expected ${expectedNumRows} queued texts, but found ${numRows}`);
    }
      
    // check message content too
    const expectedConvoNames = [
        CONFIG.convoNames.prescreenFormText,
        CONFIG.convoNames.blacklist_reject,
        CONFIG.convoNames.initial_criteria_reject
    ];
    
    const actualConvoNames = result.map(row => row[2]);
    
    expectedConvoNames.forEach((expected, idx) => {
        if (actualConvoNames[idx] !== expected) {
        throw new Error(`❌ Test failed: Expected convo "${expected}" at row ${idx + startRow}, got "${actualConvoNames[idx]}"`);
        }
    });
    
    Logger.log("✅ All queued texts matched expectations.");
  
    SpreadsheetApp.flush();
}

function test_sendRealTextToSelfPass() {
    FLAGS.ENABLE_TEXTING = true; // ✅ Turn ON real texting
  
    Logger.log("📲 Sending real text to self — texting is ENABLED");
  
    // 1. Create a temporary sheet to simulate candidate pipeline
    const testPipeline = SpreadsheetApp.openById(CONFIG.sheetIds.formResponses).insertSheet("Test_Pipeline");
    testPipeline.setName("Test_Pipeline_" + Date.now());
  
    // 2. Minimal headers (columns aligned to real config)
    const headers = Array(52).fill("");
    headers[1] = "Master Status";
    headers[9] = "Sally ID";                // DRIVER_ID
    headers[14] = "Override";              // COL.OVERRIDE
    headers[15] = "Master Criteria Check"; // PASS_FAIL
    headers[16] = "First Outreach";
    headers[17] = "Latest Outreach Date";
    headers[22] = "Prescreen Results";
    headers[26] = "Notes";
  
    testPipeline.getRange(3, 1, 1, headers.length).setValues([headers]);
  
    // 3. Add a row for yourself (update with your real Sally ID)
    const testRows = [
      setRow({ 9: "PITASSI_ELLA_83333", 15: "Pass" }) // Use your real ID here
    ];
  
    testPipeline.getRange(4, 1, testRows.length, headers.length).setValues(testRows);
  
    // 4. Clear existing textGeorge entries (optional but helpful)
    const testTextGeorge = SpreadsheetApp.openById(CONFIG.sheetIds.formResponses).insertSheet("Test_TextGeorge_" + Date.now());
    testTextGeorge.getRange(3, 1, 1, 3).setValues([["DRIVERS TO BE TEXTED", "TEXT", "CONVERSATION NAME"]]);
    const lastRow = testTextGeorge.getLastRow();
    if (lastRow > 3) testTextGeorge.deleteRows(4, lastRow - 3);
    testTextGeorge.getRange(3, 1, 1, 3).setValues([["DRIVERS TO BE TEXTED", "TEXT", "CONVERSATION NAME"]]);

    // 5. Actually run it
    Logger.log("⚙️ Starting process...");
    processNewCandidatesFromRows(4, testRows.length, testPipeline);
    Logger.log("✅ processNewCandidatesFromRows finished.");

    Logger.log("✅ Test complete. Check if you received a real text.");
  
    // 6. Clean up
    SpreadsheetApp.flush();
}

function test_sendRealTextToSelfFail() {
    FLAGS.ENABLE_TEXTING = true; // ✅ Turn ON real texting
  
    Logger.log("📲 Sending real text to self — texting is ENABLED");
  
    // 1. Create a temporary sheet to simulate candidate pipeline
    const testPipeline = SpreadsheetApp.openById(CONFIG.sheetIds.formResponses).insertSheet("Test_Pipeline");
    testPipeline.setName("Test_Pipeline_" + Date.now());

    // 2. Minimal headers (columns aligned to real config)
    const headers = Array(52).fill("");
    headers[1] = "Master Status";
    headers[9] = "Sally ID";                // DRIVER_ID
    headers[14] = "Override";              // COL.OVERRIDE
    headers[15] = "Master Criteria Check"; // PASS_FAIL
    headers[16] = "First Outreach";
    headers[17] = "Latest Outreach Date";
    headers[22] = "Prescreen Results";
    headers[26] = "Notes";
  
    testPipeline.getRange(3, 1, 1, headers.length).setValues([headers]);
  
    // 3. Add a row for yourself (update with your real Sally ID)
    const testRows = [
      setRow({ 9: "PITASSI_ELLA_83333", 15: "Fail" }) // Use your real ID here
    ];
  
    testPipeline.getRange(4, 1, testRows.length, headers.length).setValues(testRows);
  
    // 4. Clear existing textGeorge entries (optional but helpful)
    const testTextGeorge = SpreadsheetApp.openById(CONFIG.sheetIds.formResponses).insertSheet("Test_TextGeorge_" + Date.now());
    testTextGeorge.getRange(3, 1, 1, 3).setValues([["DRIVERS TO BE TEXTED", "TEXT", "CONVERSATION NAME"]]);
    const lastRow = testTextGeorge.getLastRow();
    if (lastRow > 3) testTextGeorge.deleteRows(4, lastRow - 3);
    testTextGeorge.getRange(3, 1, 1, 3).setValues([["DRIVERS TO BE TEXTED", "TEXT", "CONVERSATION NAME"]]);

    // 5. Actually run it
    Logger.log("⚙️ Starting process...");
    processNewCandidatesFromRows(4, testRows.length, testPipeline, testTextGeorge);
    Logger.log("✅ processNewCandidatesFromRows finished.");

    Logger.log("✅ Test complete. Check if you received a real text.");
  
    // 6. Clean up
    SpreadsheetApp.flush();
}

function test_preventDuplicateTexts() {
    Logger.log("Testing test_preventDuplicateTexts");
    FLAGS.ENABLE_TEXTING = false;
    const { testPipeline, testTextGeorge, testSentTexts } = getTestSheets(2);
  
    try {
        // Add existing text to simulate a 
        testSentTexts.appendRow(["2025-06-20 14:53", "DRV999", "Chauffeur_form_20250619", "some previous text"]);
        SpreadsheetApp.flush(); // ⬅ensures row is saved before it's read

        // Try to queue the same convo again
        const testRows = [setRow({ 9: "DRV999", 15: "Pass" })];
        testPipeline.getRange(4, 1, 1, 52).setValues(testRows);
          
        // Run it
        processNewCandidatesFromRows(4, 1, testPipeline, testTextGeorge, testSentTexts);

        // Check if they were blocked
        const georgeRows = testTextGeorge.getLastRow() - 3;
        const errorRows = testSentTexts.getLastRow() - 1;

        if (georgeRows !== 0) throw new Error("❌ Test failed: Unexpected text was queued.");
        if (errorRows <= 0) throw new Error("❌ Test failed: Missing error row.");

        Logger.log("✅ Test passed. Cleaning up test sheets...");

        // Clean up
        const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
        ss.deleteSheet(testPipeline);
        ss.deleteSheet(testTextGeorge);
        ss.deleteSheet(testSentTexts);
    } catch (e) {
        Logger.log(`❌ Test failed. Leaving sheets for inspection: ${e.message}`);
        throw e;
     }
}

function setRow(overrides) {
    const row = Array(52).fill("");
    for (const [colIndex, value] of Object.entries(overrides)) {
        row[parseInt(colIndex)] = value;
    }
    return row;
}

function test_processNewCandidate_pass() {
    const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
    const candidateSheet = ss.insertSheet("Test_Pass_Candidate");
    const textGeorge = ss.insertSheet("Test_Pass_TextGeorge");
  
    try {
      // Headers (2 empty + actual header row) and test row
      const blankRow = Array(28).fill("");
      const testRow = [
        "", "Pending", "", "", "", "", "", "", "", "TEST_ID_123", "", "", "", "", "", "Pass", "",
        "", "", "", "", "", "", "", "", "", "", ""
      ];
      
      candidateSheet.getRange(1, 1, 4, 28).setValues([
        blankRow,
        blankRow,
        blankRow,
        testRow
      ]);
      FLAGS.IN_TEST_MODE = true;
  
      processNewCandidatesFromRows(4, 1, candidateSheet, textGeorge);
  
      const resultRow = candidateSheet.getRange(4, 2, 1, 28).getValues()[0]; // Start at col B
  
      expectEqual(resultRow[0], "Pending", "Status should be 'Pending'");
      expectEqual(resultRow[21], "Pending", "Prescreen Results should be 'Pending'");
  
      const numRows = textGeorge.getLastRow() - 3;
      const georgeData = numRows > 0
        ? textGeorge.getRange(4, 1, numRows, 3).getValues()
        : [];
      
    const wasQueued = georgeData.some(row =>
        row[0] === "TEST_ID_123" &&
        row[1]?.includes("Thanks for your interest in the Drive Sally Chauffeur team") &&
        row[2] === CONFIG.convoNames.prescreenFormText
        );
  
      expectTrue(wasQueued, "TextGeorge should have correct row queued");
  
      Logger.log("✅ test_processNewCandidate_pass passed");
    } finally {
    //   ss.deleteSheet(candidateSheet);
    //   ss.deleteSheet(textGeorge);
      FLAGS.IN_TEST_MODE = false;
    }
}

function test_processNewCandidates_batch() {
    FLAGS.IN_TEST_MODE = true;
    logError("🧪 Running test_processNewCandidates_batch");
  
    const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
    const tempCandidateSheet = ss.insertSheet("TempCandidate_Batch");
    const tempGeorgeSheet = ss.insertSheet("TempGeorge_Batch");
  
    try {
      // Set test rows: row 4: Pass, row 5: Fail, row 6: Blacklisted
      const testRows = [
        ["", "Pending", "", "", "", "", "", "", "", "TEST_ID_123", "", "", "", "", "", "Pass", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "FAIL_ID", "", "", "", "", "", "Fail", "", "", "", "", "", "", "", "", "", "", "", ""],  // row 5
        ["", "", "", "", "", "", "", "", "", "BLACKLISTED_ID", "", "", "", "", "", "Pass", "", "", "", "", "", "", "", "", "", "", "", ""]  // row 6
      ];
  
      // Set PASS_FAIL col (P = index 15) to "Pass", "Fail", and "Pass"
      Logger.log(testRows[0][15])
      Logger.log(testRows[1][15])
      Logger.log(testRows[2][15])

      testRows[0][15] = "Pass";
      testRows[1][15] = "Fail";
      testRows[2][15] = "Pass";
  
      tempCandidateSheet.getRange(4, 1, 3, 28).setValues(testRows);
  
      // Mock checkDailyDriverStats: Only last one is blacklisted
      const mockCheckStatus = (id) => id === "BLACKLISTED_ID" ? "BLACKLISTED" : "";
  
      function simulateSendAndClearTextGeorge(sheet) {
        const lastRow = sheet.getLastRow();
        if (lastRow > 3) {
          sheet.deleteRows(4, lastRow - 3);
        }
      }

      const fakeCheckDriverStats = (driverId) => {
        if (driverId === "BLACKLISTED_ID") return "BLACKLISTED";
        return "";
      };

      processNewCandidatesFromRows(
        4, 3,
        tempCandidateSheet,
        tempGeorgeSheet,
        null,
        fakeCheckDriverStats,
        // simulateSendAndClearTextGeorge // ✅ testCleanupHook
      );
  
      // === ASSERTIONS ===
      const values = tempCandidateSheet.getRange(4, 1, 3, 28).getValues();
  
      // Row 4 = PASS_ID
      expectEqual(values[0][1], "Pending", "TEST_ID_123 should be Pending");
      expectEqual(values[0][22], "Pending", "TEST_ID_123 prescreen results should be Pending");
  
      // Row 5 = FAIL_ID
      expectEqual(values[1][1], "Rejected", "FAIL_ID should be Rejected");
  
      // Row 6 = BLACKLISTED_ID
      expectEqual(values[2][1], "Rejected", "BLACKLISTED_ID should be Rejected");
      expectTrue(values[2][27].includes("BLACKLISTED"), "BLACKLISTED_ID notes should mention blacklist");

      // TEXT GEORGE check
      const rowCount = tempGeorgeSheet.getLastRow() - 3;
      const georgeData = rowCount > 0
        ? tempGeorgeSheet.getRange(4, 1, rowCount, 3).getValues()
        : [];
          
      const passQueued = georgeData.some(row =>
        row[0] === "TEST_ID_123" &&
        row[1] === CONFIG.texts.prescreenFormTextToSend &&
        row[2] === CONFIG.convoNames.prescreenFormText
      );
  
      const failQueued = georgeData.some(row =>
        row[0] === "FAIL_ID" &&
        row[1] === CONFIG.texts.baseCriteriaRejectText &&
        row[2] === CONFIG.convoNames.initial_criteria_reject
      );
  
      const blacklistQueued = georgeData.some(row =>
        row[0] === "BLACKLISTED_ID" &&
        row[1] === CONFIG.texts.blacklistReject &&
        row[2] === CONFIG.convoNames.blacklist_reject
      );
  
      expectTrue(passQueued, "PASS_ID should be queued in TextGeorge");
      expectTrue(failQueued, "FAIL_ID should be queued in TextGeorge");
      expectTrue(blacklistQueued, "BLACKLISTED_ID should be queued in TextGeorge");

      // After all expectTrue checks
const lastRow = tempGeorgeSheet.getLastRow();
if (lastRow > 3) {
  tempGeorgeSheet.deleteRows(4, lastRow - 3);
}
  
      logError("✅ test_processNewCandidates_batch passed");
  
    } finally {
      ss.deleteSheet(tempCandidateSheet);
      ss.deleteSheet(tempGeorgeSheet);
    FLAGS.IN_TEST_MODE = false;
    }
}

function test_processNewCandidates_batch_stepwise() {
    logError("🧪 Running test_processNewCandidates_batch_stepwise");
  
    const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
    const tempCandidateSheet = ss.insertSheet("TempCandidate_Batch");
    const tempGeorgeSheet = ss.insertSheet("TempGeorge_Batch");
  
    try {
      // Prepare rows: Pass, Fail, Blacklisted
      const testRows = [
        ["", "Pending", "", "", "", "", "", "", "", "TEST_ID_123", "", "", "", "", "", "Pass", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "FAIL_ID", "", "", "", "", "", "Fail", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "BLACKLISTED_ID", "", "", "", "", "", "Pass", "", "", "", "", "", "", "", "", "", "", "", ""]
      ];
  
      tempCandidateSheet.getRange(4, 1, 3, 28).setValues(testRows);
  
      const fakeCheckDriverStats = (id) => id === "BLACKLISTED_ID" ? "BLACKLISTED" : "";
  
      // Step 1: Queue and flush first row only
      processNewCandidatesFromRows(4, 1, tempCandidateSheet, tempGeorgeSheet, null, fakeCheckDriverStats);
  
      let data = tempGeorgeSheet.getRange(4, 1, tempGeorgeSheet.getLastRow() - 3, 3).getValues();
      expectEqual(data.length, 1, "Step 1: Should have 1 message queued");
      expectEqual(data[0][0], "TEST_ID_123", "Step 1: Should queue PASS_ID");
  
      // Clear textGeorge to simulate message sent
      if (tempGeorgeSheet.getLastRow() > 3) {
        tempGeorgeSheet.deleteRows(4, tempGeorgeSheet.getLastRow() - 3);
      }
  
      // Step 2: Queue and flush second row (FAIL_ID)
      processNewCandidatesFromRows(5, 1, tempCandidateSheet, tempGeorgeSheet, null, fakeCheckDriverStats);
  
      data = tempGeorgeSheet.getRange(4, 1, tempGeorgeSheet.getLastRow() - 3, 3).getValues();
      expectEqual(data.length, 1, "Step 2: Should have 1 message queued");
      expectEqual(data[0][0], "FAIL_ID", "Step 2: Should queue FAIL_ID");
  
      // Clear again
      if (tempGeorgeSheet.getLastRow() > 3) {
        tempGeorgeSheet.deleteRows(4, tempGeorgeSheet.getLastRow() - 3);
      }
  
      // Step 3: Queue and flush third row (BLACKLISTED_ID)
      processNewCandidatesFromRows(6, 1, tempCandidateSheet, tempGeorgeSheet, null, fakeCheckDriverStats);
  
      data = tempGeorgeSheet.getRange(4, 1, tempGeorgeSheet.getLastRow() - 3, 3).getValues();
      expectEqual(data.length, 1, "Step 3: Should have 1 message queued");
      expectEqual(data[0][0], "BLACKLISTED_ID", "Step 3: Should queue BLACKLISTED_ID");
  
      logError("✅ test_processNewCandidates_batch_stepwise passed");
  
    } finally {
      // Uncomment if you want cleanup
      ss.deleteSheet(tempCandidateSheet);
      ss.deleteSheet(tempGeorgeSheet);
    }
}