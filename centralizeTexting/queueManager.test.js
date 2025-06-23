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
  addToGroupedQueue(testQueue, "123", "Hello!", "Intro_form", 4);
  addToGroupedQueue(testQueue, "456", "Hello!", "Intro_form", 5);
  addToGroupedQueue(testQueue, "789", "Different message", "Reject_form", 6);

  const introKey = "Hello!|||Intro_form";
  const rejectKey = "Different message|||Reject_form";

  expectEqual(testQueue.size, 2, "Should group into 2 buckets");

  const introGroup = testQueue.get(introKey);
  const rejectGroup = testQueue.get(rejectKey);

  // Intro group assertions
  expectEqual(introGroup.length, 2, "Intro_form group should contain 2 entries");
  expectEqual(introGroup[0].driverId, "123", "First driver ID in intro group is correct");
  expectEqual(introGroup[0].rowIdx, 4, "First driver rowIdx in intro group is correct");
  expectEqual(introGroup[1].driverId, "456", "Second driver ID in intro group is correct");
  expectEqual(introGroup[1].rowIdx, 5, "Second driver rowIdx in intro group is correct");

  // Reject group assertions
  expectEqual(rejectGroup.length, 1, "Reject_form group should contain 1 entry");
  expectEqual(rejectGroup[0].driverId, "789", "Driver ID in reject group is correct");
  expectEqual(rejectGroup[0].rowIdx, 6, "RowIdx in reject group is correct");

  Logger.log("✅ test_addToGroupedQueue passed");
}

// function test_flushGroupedQueue() {
//   Logger.log("🧪 Running test_flushGroupedQueue");
//   const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
//   const tempSheet = ss.insertSheet("TempFlushTest");

//   tempSheet.clear(); // Start fresh

//   // Insert 3 dummy header rows (TEXT GEORGE starts at row 4)
//   tempSheet.getRange(1, 1, 3, 3).setValues([
//     ["", "", ""],
//     ["", "", ""],
//     ["Header1", "Header2", "Header3"]
//   ]);

//   try {
//     const testQueue = new Map();
//     addToGroupedQueue(testQueue, "123", "hi", "Prescreen");
//     addToGroupedQueue(testQueue, "456", "hi", "Prescreen");
//     addToGroupedQueue(testQueue, "789", "yo", "Welcome");

//     flushGroupedQueue(testQueue, tempSheet);

//     const lastRow = tempSheet.getLastRow();
//     const data = lastRow > 3
//       ? tempSheet.getRange(4, 1, lastRow - 3, 3).getValues()
//       : [];

//     expectEqual(data.length, 3, "Should write 3 rows total");
//     expectEqual(String(data[0][0]), "123", "First driver should be 123");
//     expectEqual(data[0][1], "hi", "First row should have text");
//     expectEqual(data[0][2], "Prescreen", "First row should have convo name");
//     expectEqual(String(data[1][0]), "456", "Second driver should be 456");
//     expectEqual(data[1][1], "", "Second row should not repeat text");
//     expectEqual(data[1][2], "", "Second row should not repeat convo");
//     expectEqual(String(data[2][0]), "789", "Third driver should be 789");
//     expectEqual(testQueue.size, 0, "Queue should be cleared");
//   } finally {
//     ss.deleteSheet(tempSheet);
//   }

//   Logger.log("✅ test_flushGroupedQueue passed");
// }


function test_flushSingleGroup() {
  logError("🧪 Running test_flushSingleGroup");

  const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
  const tempSheet = ss.insertSheet("TempFlushSingle");

  try {
    // Add dummy headers to simulate TEXT GEORGE
    tempSheet.clear();
    tempSheet.getRange(1, 1, 3, 3).setValues([
      ["", "", ""],
      ["", "", ""],
      ["Drivers", "Text", "Convo"]
    ]);

    // Setup queueMap with plain driverId strings
    const queueMap = new Map();
    queueMap.set("hi|||Prescreen", [
      { driverId: "E123", rowIdx: 4 },
      { driverId: "P456", rowIdx: 5 }
    ]);
    const result = flushSingleGroup(queueMap, tempSheet);

    const lastRow = tempSheet.getLastRow();
    const data = lastRow > 3
      ? tempSheet.getRange(4, 1, lastRow - 3, 3).getValues()
      : [];

    expectEqual(data.length, 2, "Should write 2 rows to TEXT GEORGE");
    expectEqual(data[0][0], "E123", "First row: correct driverId");
    expectEqual(data[0][1], "hi", "First row: correct text");
    expectEqual(data[0][2], "Prescreen", "First row: correct convo name");
    expectEqual(data[1][0], "P456", "Second row: correct driverId");
    expectEqual(data[1][1], "", "Second row: text should be blank");
    expectEqual(data[1][2], "", "Second row: convo should be blank");
    expectEqual(result.entries.length, 2, "Result includes 2 flushed entries");
    expectEqual(queueMap.size, 0, "QueueMap should be cleared after flush");

    logError("✅ test_flushSingleGroup passed");
  } finally {
    ss.deleteSheet(tempSheet);
  }
}

