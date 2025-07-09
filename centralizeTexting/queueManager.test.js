function test_isSafeToQueueText() {
    Logger.log("🧪 Running test_isSafeToQueueText");
  
    // Create temporary sheets
    const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
    const tempTextGeorge = ss.insertSheet("Test_TextGeorge");
    const tempSentTexts = ss.insertSheet("Test_SentTexts");
  
    // Set up headers
    tempTextGeorge.getRange("A3:C3").setValues([["Driver ID", "Text", "Convo Name"]]);
    tempSentTexts.getRange("B3:C3").setValues([["Driver ID", "Convo Name"]]);
  
    // Insert dummy data
    tempTextGeorge.getRange("A4:C4").setValues([["12345", "Hi", "Chauffeur_form_2024-01-01"]]);
    tempSentTexts.getRange("B4:C4").setValues([["67890", "Prescreen_2024-01-01"]]);
  
    // Case 1 — new entry should pass
    const result1 = isSafeToQueueText("99999", "hi there", "Intro_form_2024-06-03", tempTextGeorge, tempSentTexts);
    expectTrue(result1 === true, "Expected text to be queued (not a duplicate)");
  
    // Case 2 — duplicate in TEXT GEORGE (same driverId + base convo)
    const result2 = isSafeToQueueText("12345", "hi again", "Chauffeur_form_2024-01-02", tempTextGeorge, tempSentTexts);
    expectTrue(result2 === false, "Expected duplicate (in TEXT GEORGE)");
  
    // Case 3 — duplicate in SENT TEXTS
    const result3 = isSafeToQueueText("67890", "yo", "Prescreen_2024-01-02", tempTextGeorge, tempSentTexts);
    expectTrue(result3 === false, "Expected duplicate (in SENT TEXTS)");
  
    // Cleanup
    ss.deleteSheet(tempTextGeorge);
    ss.deleteSheet(tempSentTexts);
  
    Logger.log("test_isSafeToQueueText passed");
}

function test_queueSingleDriverText() {
  const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
  const today = Utilities.formatDate(new Date(), "America/Chicago", "MM/dd/yyyy");

  Logger.log("Setting up test sheets...");

  // Setup TEXT GEORGE TEST sheet
  const tempTextGeorge = ss.getSheetByName("TextGeorgeTest") || ss.insertSheet("TextGeorgeTest");
  tempTextGeorge.clear();
  tempTextGeorge.appendRow([
    "DRIVERS TO BE TEXTED", // A (1)
    "TEXT",                  // B (2)
    "CONVERSATION NAME"      // C (3)
  ]);

  // Setup SENT TEXTS TEST sheet
  const tempSentTexts = ss.getSheetByName("SentTextsTest") || ss.insertSheet("SentTextsTest");
  tempSentTexts.clear();
  tempSentTexts.appendRow([
    "DATE TIME",  // A (1)
    "DRIVER ID",  // B (2)
    "convo_name", // C (3)
    "text"        // D (4)
  ]);

  // Setup CANDIDATE PIPELINE TEST sheet
  const pipelineSheet = ss.getSheetByName("PipelineTest") || ss.insertSheet("PipelineTest");
  pipelineSheet.clear();
  pipelineSheet.appendRow([
    "A","B","C","D","E","F","G","H","I","J",
    "K","L","M","N","O","P","Q" // example headers
  ]);
  pipelineSheet.appendRow([
    "","","","","","","","","","123", // driverId in J (index 9)
    "","","","","","",""
  ]);

  const rowIdx = 2; // 1-based row index in pipeline
  const COL = {
    DRIVER_ID: 9,
    FIRST_OUTREACH: 15,
    LATEST_OUTREACH: 16
  };

  Logger.log("---- TEST 1: Queue first time (should succeed) ----");

  const result1 = queueSingleDriverText({
    driverId: "123",
    text: "Hello Test Message!",
    convoName: "Intro_Test_Convo",
    tempTextGeorge,
    tempSentTexts,
    COL,
    today,
    rowIdx,
    candidatePipeline: pipelineSheet
  });

  Logger.log(`First call result (should be true): ${result1}`);

  // Check TEXT GEORGE contents
  const queuedData = tempTextGeorge.getDataRange().getValues();
  Logger.log(`📋 TEXT GEORGE after first append:\n${JSON.stringify(queuedData)}`);

  Logger.log(" ---- Simulating 'sending' the message ----");

  // Move message to SENT TEXTS to simulate sending
  tempSentTexts.appendRow([
    today,                   // A = DATE TIME
    "123",                   // B = DRIVER ID
    "Intro_Test_Convo",      // C = convo_name
    "Hello Test Message!"    // D = text
  ]);

  // Clear TEXT GEORGE (like production would after sending)
  tempTextGeorge.clear();
  tempTextGeorge.appendRow([
    "DRIVERS TO BE TEXTED",
    "TEXT",
    "CONVERSATION NAME"
  ]);

  Logger.log(" ---- TEST 2: Attempt duplicate queue (should be blocked) ----");

  const result2 = queueSingleDriverText({
    driverId: "123",
    text: "Hello Test Message!",
    convoName: "Intro_Test_Convo",
    tempTextGeorge,
    tempSentTexts,
    COL,
    today,
    rowIdx,
    candidatePipeline: pipelineSheet
  });

  Logger.log(`Second call result (should be false): ${result2}`);

  // Final contents for inspection
  const finalQueuedData = tempTextGeorge.getDataRange().getValues();
  const finalSentData = tempSentTexts.getDataRange().getValues();

  Logger.log(`📋 FINAL TEXT GEORGE:\n${JSON.stringify(finalQueuedData)}`);
  Logger.log(`📋 FINAL SENT TEXTS:\n${JSON.stringify(finalSentData)}`);

  Logger.log("Test complete!");
}