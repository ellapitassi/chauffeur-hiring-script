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
      const testQueue = new Map();
      addToGroupedQueue(testQueue, "test-driver-1", "Hello from unit test", "Unit_convo");
  
      // Flush just one group into the temp sheet
      const flushed = flushSingleGroup(testQueue, tempSheet);
      expectEqual(!!flushed, true, "flushSingleGroup should return a truthy object");
      expectEqual(flushed.convoName, "Unit_convo", "Should return correct convoName");
      expectEqual(flushed.entries.length, 1, "Should return one entry");

      // ✅ Verify the row was written before sending
      const data = tempSheet.getRange(4, 1, tempSheet.getLastRow() - 3, 3).getValues();
      expectEqual(data.length, 1, "Should write 1 row total");
      expectEqual(data[0][0], "test-driver-1", "First driver ID should match");
      expectEqual(data[0][1], "Hello from unit test", "Message should match");
      expectEqual(data[0][2], "Unit_convo", "Convo name should match");
  
      // Simulate sending (which clears the sheet)
      sendAllTexts(tempSheet);
  
      // ✅ Verify the row is removed
    const rowsAfterSend = tempSheet.getLastRow() - 3;
    const afterSendData = rowsAfterSend > 0
    ? tempSheet.getRange(4, 1, rowsAfterSend, 3).getValues()
    : [];
    expectEqual(afterSendData.length, 0, "Sheet should be cleared after sending");
  
    } finally {
      ss.deleteSheet(tempSheet);
    }
  
    Logger.log("✅ test_sendAllTexts_unit passed");
}

function test_sendAllTexts_real() {
    FLAGS.ENABLE_TEXTING = true;
  
    const driverId = "PITASSI_ELLA_83333";
    const testMessage = "This is a real test text";
    const convoName = "Test_Convo";
    const textGeorgeSheet = CONFIG.sheets.textGeorge;
    const sentTextsSheet = CONFIG.sheets.sentTexts;
  
    try {
      // Step 1: Queue and flush
      const queue = new Map();
      addToGroupedQueue(queue, driverId, testMessage, convoName);
      const flushed = flushSingleGroup(queue);
      expectTrue(!!flushed, "flushSingleGroup should return a truthy object");
  
      SpreadsheetApp.flush();
      Utilities.sleep(5000); // Give the sheet time to write before triggering the API
  
      // Step 2: Send
      sendAllTexts();
      Utilities.sleep(5000); // Give George time to log the result
  
      // Step 3: Poll for sentTexts
      const maxAttempts = 10;
      const sleepTime = 2000;
      let found = false;
  
      for (let i = 0; i < maxAttempts; i++) {
        SpreadsheetApp.flush();
        Utilities.sleep(sleepTime);
  
        const rows = sentTextsSheet.getRange(4, 1, sentTextsSheet.getLastRow() - 3, 4).getValues();
        Logger.log(`🔍 Attempt ${i + 1}: Searching sentTexts for driverId=${driverId}...`);
  
        found = rows.some(row => row[1] === driverId && row[3]?.includes(testMessage));
        if (found) {
          Logger.log("✅ Text found in sentTexts!");
          break;
        }
      }
  
      expectTrue(found, "Expected text to be logged in sentTexts");
  
      // Step 4: Confirm deletion from TEXT GEORGE
    // Polling to detect when the textGeorge row is deleted
    const maxCleanupAttempts = 10;
    const cleanupSleepTime = 3000; // 3 seconds
    let deleted = false;

    for (let i = 0; i < maxCleanupAttempts; i++) {
    SpreadsheetApp.flush();
    Utilities.sleep(cleanupSleepTime);

    const lastRow = textGeorgeSheet.getLastRow();
    const numRows = Math.max(0, lastRow - 3);
    const georgeRows = numRows > 0
        ? textGeorgeSheet.getRange(4, 1, numRows, 3).getValues()
        : [];

    deleted = !georgeRows.some(row => row[0] === driverId);

    Logger.log(`🔍 Cleanup check ${i + 1}: ${deleted ? "Row removed ✅" : "Still present ❌"}`);
    if (deleted) break;
}

expectTrue(deleted, "TextGeorge row should be deleted after send");
  
    } catch (error) {
      logError(driverId, `Real text test failed: ${error}`);
    }
  
    Logger.log("✅ test_sendAllTexts_real completed");
}

function test_markTextedInGeorgeSheet() {
    const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
    const tempTextGeorge = ss.insertSheet("Temp_TextGeorge");
    const tempSentTexts = ss.insertSheet("Temp_SentTexts");
    const originalConfig = CONFIG.sheets;

    try {
      // Setup headers
      tempTextGeorge.getRange("A1:C3").setValues([
        ["", "", ""],
        ["", "", ""],
        ["Driver ID", "Message", "Convo"]
      ]);
      tempSentTexts.getRange("A1:D3").setValues([
        ["", "", "", ""],
        ["", "", "", ""],
        ["", "Driver ID", "Convo", "Message"]
      ]);
  
      // Test data
      const testDriverId = "TEST_DRIVER_123";
      const testMessage = "Hello test world";
  
      // Add one row to TextGeorge (starts at row 4)
      tempTextGeorge.appendRow([testDriverId, testMessage, "TestConvo"]);
  
      // Add a matching row to SentTexts (starts at row 4)
      tempSentTexts.appendRow(["", testDriverId, "", testMessage]);
  
        // Run function with temp sheets
        markTextedInGeorgeSheet(tempTextGeorge, tempSentTexts);

      // Check that the row was deleted
      const lastRow = tempTextGeorge.getLastRow();
      let remaining = [];
      if (lastRow >= 4) {
        remaining = tempTextGeorge.getRange(4, 1, lastRow - 3, 3).getValues();
      }
        expectEqual(remaining.length, 0, "Row should be deleted after match");
      Logger.log("✅ test_markTextedInGeorgeSheet passed");
    } finally {
        // cleanup
      ss.deleteSheet(tempTextGeorge);
      ss.deleteSheet(tempSentTexts);
    }
}

function test_deleteThisTrigger() {
    // Create a time-based trigger for testing
    const testHandler = 'dummyTriggerFunction';
    ScriptApp.newTrigger(testHandler)
      .timeBased()
      .everyMinutes(5)
      .create();
  
    // Confirm it was added
    let triggers = ScriptApp.getProjectTriggers();
    const existsBefore = triggers.some(t => t.getHandlerFunction() === testHandler);
    expectTrue(existsBefore, "Trigger should exist before deletion");
  
    // Run the function to delete it
    deleteThisTrigger(testHandler);
  
    // Confirm it's gone
    triggers = ScriptApp.getProjectTriggers(); // Refresh trigger list
    const existsAfter = triggers.some(t => t.getHandlerFunction() === testHandler);
    expectFalse(existsAfter, "Trigger should be deleted");
  
    Logger.log("✅ test_deleteThisTrigger passed");
  }
  
  // Dummy function used for trigger creation (must be defined in script to work)
function dummyTriggerFunction() {
    Logger.log("Dummy trigger ran");
}

function test_findSendTextRow() {
    // Clean up any existing trigger first
    deleteThisTrigger('markTextedInGeorgeSheet');
  
    const props = PropertiesService.getScriptProperties();
    props.deleteProperty('startTime'); // Ensure clean state
  
    // Run the function
    findSendTextRow();
  
    // ✅ Check if startTime was set
    const startTime = props.getProperty('startTime');
    expectTrue(!!startTime, "startTime should be set in script properties");
  
    // ✅ Check if the trigger was created
    const triggers = ScriptApp.getProjectTriggers();
    const found = triggers.some(t => t.getHandlerFunction() === 'markTextedInGeorgeSheet');
    expectTrue(found, "Trigger for markTextedInGeorgeSheet should be created");
  
    // Clean up after test
    deleteThisTrigger('markTextedInGeorgeSheet');
    props.deleteProperty('startTime');
  
    Logger.log("✅ test_findSendTextRow passed");
}

function test_flushQueueOneAtATime() {
    logError("🧪 Running test_flushQueueOneAtATime");
    FLAGS.IN_TEST_MODE = true;
    const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
    const tempSheet = ss.insertSheet("Temp_Text_Flush_Queue");
  
    try {
      // Add dummy headers
      tempSheet.getRange(1, 1, 3, 3).setValues([
        ["", "", ""],
        ["", "", ""],
        ["DriverID", "Message", "ConvoName"]
      ]);
  
      // Set up queueMap for test
      const queueMap = new Map();
      queueMap.set("hi there|||Prescreen", ["A1", "A2"]);
      queueMap.set("please respond|||Reminder", ["B1"]);
      
      const fakeCleanup = () => {
        const lastRow = tempSheet.getLastRow();
        if (lastRow > 3) tempSheet.deleteRows(4, lastRow - 3);
      };
  
      flushQueueOneAtATime(queueMap, tempSheet, fakeCleanup);
    
      // After processing, sheet should be empty (beyond headers)
      SpreadsheetApp.flush();
      expectEqual(tempSheet.getLastRow(), 3, "Sheet should be cleared after flush (only headers remain)");
      logError("✅ test_flushQueueOneAtATime passed");
    } finally {
      ss.deleteSheet(tempSheet);
      FLAGS.IN_TEST_MODE = false;
    }
  }