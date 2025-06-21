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
