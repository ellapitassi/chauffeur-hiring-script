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
  
    Logger.log("✅ test_isSafeToQueueText passed");
}

function test_addToGroupedQueue() {
    Logger.log("🧪 Running test_addToGroupedQueue");
  
    const testQueue = new Map();
    addToGroupedQueue(testQueue, "123", "Hello!", "Intro_form");
    addToGroupedQueue(testQueue, "456", "Hello!", "Intro_form");
    addToGroupedQueue(testQueue, "789", "Different message", "Reject_form");
  
    expectEqual(testQueue.size, 2, "Should group into 2 buckets");
  
    const introKey = "Hello!|||Intro_form";
    const rejectKey = "Different message|||Reject_form";
  
    expectEqual(testQueue.get(introKey).length, 2, "Intro_form group should contain 2 driver IDs");
    expectEqual(testQueue.get(introKey)[0], "123", "First driver ID in intro group is correct");
    expectEqual(testQueue.get(introKey)[1], "456", "Second driver ID in intro group is correct");
  
    expectEqual(testQueue.get(rejectKey).length, 1, "Reject_form group should contain 1 driver ID");
    expectEqual(testQueue.get(rejectKey)[0], "789", "Driver ID in reject group is correct");
  
    Logger.log("✅ test_addToGroupedQueue passed");
}

function test_flushGroupedQueue() {
  Logger.log("🧪 Running test_flushGroupedQueue");
  const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
  const tempSheet = ss.insertSheet("TempFlushTest");

  tempSheet.clear(); // Start fresh

  // Insert 3 dummy header rows (TEXT GEORGE starts at row 4)
  tempSheet.getRange(1, 1, 3, 3).setValues([
    ["", "", ""],
    ["", "", ""],
    ["Header1", "Header2", "Header3"]
  ]);

  try {
    const testQueue = new Map();
    addToGroupedQueue(testQueue, "123", "hi", "Prescreen");
    addToGroupedQueue(testQueue, "456", "hi", "Prescreen");
    addToGroupedQueue(testQueue, "789", "yo", "Welcome");

    flushGroupedQueue(testQueue, tempSheet);

    const lastRow = tempSheet.getLastRow();
    const data = lastRow > 3
      ? tempSheet.getRange(4, 1, lastRow - 3, 3).getValues()
      : [];

    expectEqual(data.length, 3, "Should write 3 rows total");
    expectEqual(String(data[0][0]), "123", "First driver should be 123");
    expectEqual(data[0][1], "hi", "First row should have text");
    expectEqual(data[0][2], "Prescreen", "First row should have convo name");
    expectEqual(String(data[1][0]), "456", "Second driver should be 456");
    expectEqual(data[1][1], "", "Second row should not repeat text");
    expectEqual(data[1][2], "", "Second row should not repeat convo");
    expectEqual(String(data[2][0]), "789", "Third driver should be 789");
    expectEqual(testQueue.size, 0, "Queue should be cleared");
  } finally {
    ss.deleteSheet(tempSheet);
  }

  Logger.log("✅ test_flushGroupedQueue passed");
}