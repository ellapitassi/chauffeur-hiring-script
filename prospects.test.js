function test_updateCandidatePipelineTwoStepFlow() {
    Logger.log("✅ Running test_updateCandidatePipelineTwoStepFlow");
  
    const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
    const tempPipelineBlank = ss.insertSheet("Temp_CandidatePipeline_TwoStepTest");
  
    try {
      // 1️⃣ Setup headers
      const tempPipeline = test_helper_get_pipeline_headers(tempPipelineBlank)
      tempPipeline.getRange(3, 1, 1, 52).setValues([headers]);
      const COL = {
        STATUS: 1,
        DRIVER_ID: 9,
        FIRST_OUTREACH: 16,
        LATEST_OUTREACH: 17,
        PRESCREEN_RESULTS: 22,
        INTERVIEW_STATUS: 23,
        SOURCE: 24,
        NOTES: 26
      };
  
      // 2️⃣ Add candidate row
      const testDriverId = "DRV_TEST_FLOW";
      const row = new Array(52).fill("");
      row[9] = testDriverId;
      tempPipeline.getRange(4, 1, 1, 52).setValues([row]);

      // 3️⃣ Simulate first update (queued)
      const firstDate = makeSafeSheetDate(new Date(2025, 5, 1));  // June 1, 2025
      updateCandidateBeforeText({
        driverId: testDriverId,
        COL,
        date: firstDate,
        rowIdx: 4,
        sheet: tempPipeline,
        statusToSet: "Pending",
        noteToAppend: "Initial note"
      });
      SpreadsheetApp.flush();  // ⚡️ FORCE WRITE

      const afterFirst = tempPipeline.getRange(4, 1, 1, 52).getValues()[0];
      console.log("afterFirst", afterFirst)
      expectEqual(afterFirst[COL.STATUS], "Pending", "STATUS should be Pending after first update");
      expectTrue(afterFirst[COL.NOTES].includes("Initial note"), "Notes include Initial note");
  

      const firstOutreachDate = Utilities.formatDate(new Date(afterFirst[COL.FIRST_OUTREACH]), "UTC", "MM/dd/yyyy");
      Logger.log("afterFirst", afterFirst,"afterFirst[COL.FIRST_OUTREACH]", afterFirst[COL.FIRST_OUTREACH])
      Logger.log("firstOutreachDate", firstOutreachDate)
        expectEqual(firstOutreachDate, "06/01/2025", "First Outreach set on first update");
  
      const latestOutreachDate1 = Utilities.formatDate(new Date(afterFirst[COL.LATEST_OUTREACH]), "America/Chicago", "MM/dd/yyyy");
      expectEqual(latestOutreachDate1, "06/01/2025", "Latest Outreach set on first update");
  
      Logger.log("First step complete");
  
      // 4️⃣ Simulate second update (after sent)
      const secondDate = new Date(2025, 5, 2);  // June 2, 2025
      Utilities.sleep(500);  // Simulate time gap if desired
  
      // *Manually set system date override if needed for your system*
      updateCandidateAfterText(testDriverId, "PASS", null, tempPipeline);
  
      const afterSecond = tempPipeline.getRange(4, 1, 1, 52).getValues()[0];
      expectEqual(afterSecond[COL.STATUS], "Pending", "STATUS stays Pending after SENT");
      expectEqual(afterSecond[COL.PRESCREEN_RESULTS], "Pass", "Prescreen Result is Pass");
      expectEqual(afterSecond[COL.INTERVIEW_STATUS], "Invited", "Interview Status is Invited");
      expectEqual(afterSecond[COL.SOURCE], "Calendly", "Source is Calendly");
  
      const latestOutreachDate2 = new Date(afterSecond[COL.LATEST_OUTREACH]);
      expectTrue(latestOutreachDate2 >= secondDate, "Latest Outreach updated after SENT");
  
      Logger.log("test_updateCandidatePipelineTwoStepFlow passed!");
  
    } finally {
      ss.deleteSheet(tempPipeline);
    }
}

  function testHandleNewProspects() {
    Logger.log("=== Running testHandleNewProspects ===");

    try {
        handleNewProspects(); // Call your real function
        Logger.log("testHandleNewProspects ran without crashing.");
    } catch (e) {
        Logger.log("❌ testHandleNewProspects failed: " + e.message);
    }

    Logger.log("=== Done ===");
}

function test_appendToCandidatePipelineFromProspects_dedupes() {
  Logger.log("Running test_appendToCandidatePipelineFromProspects_dedupes");

  const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
  const tempPipelineBlank = ss.insertSheet("Temp_CandidatePipeline_AppendTest");
  // 1️⃣ Setup headers in row 3
  const tempPipeline = test_helper_get_pipeline_headers(tempPipelineBlank)

  try {
    // 2️⃣ Existing candidate with ID already in pipeline
    const existingDriverId = "DRV-DUPLICATE";
    const existingRow = new Array(52).fill("");
    existingRow[9] = existingDriverId;
    tempPipeline.getRange(4, 1, 1, 52).setValues([existingRow]);

    // 3️⃣ Confirm there's exactly 1 in pipeline
    let data = tempPipeline.getRange(4, 10, tempPipeline.getLastRow() - 3).getValues().flat().filter(Boolean);
    expectEqual(data.length, 1, "Setup: Should have 1 driver initially");

    // 4️⃣ Fake PROSPECTS row with SAME driver ID
    const fakeProspectsRow = new Array(27).fill("");
    fakeProspectsRow[23] = existingDriverId; // Prospects col X

    // 5️⃣ Call the function — should not add duplicate
    appendToCandidatePipelineFromProspects([fakeProspectsRow], tempPipeline);

    SpreadsheetApp.flush();

    // 6️⃣ Check pipeline contents — should *still* have only 1 copy
    data = tempPipeline.getRange(4, 10, tempPipeline.getLastRow() - 3).getValues().flat().filter(Boolean);
    expectEqual(data.length, 1, "Should still have only 1 driver (no duplicate added)");


      /**
   * === CASE 2️⃣: Dupes within same Prospects batch ===
   */
  Logger.log("CASE 2️⃣: Testing deduplication within batch itself");

  // Start with a new blank pipeline
  const tempPipelineBatch = test_helper_get_pipeline_headers(ss.insertSheet("Temp_CandidatePipeline_BatchTest"));

  // 2 identical rows in the Prospects batch
  const duplicateDriverId = "DRV-DUP-IN-BATCH";
  const duplicateProspectRow = new Array(27).fill("");
  duplicateProspectRow[23] = duplicateDriverId; // Column X

  const batchWithDupes = [duplicateProspectRow, duplicateProspectRow];

  // Call the function with batch containing dupes
  appendToCandidatePipelineFromProspects(batchWithDupes, tempPipelineBatch);

  SpreadsheetApp.flush();

  // Check: Only 1 should be added
  const batchData = tempPipelineBatch
    .getRange(4, 10, tempPipelineBatch.getLastRow() - 3)
    .getValues()
    .flat()
    .filter(Boolean);

  expectEqual(batchData.length, 1, "Should add only 1 unique driver from duplicate batch");
  expectEqual(batchData[0], duplicateDriverId, "Correct driver ID was kept from batch");

  Logger.log("CASE 2️⃣ PASSED - batch-level duplicates skipped");

  // Cleanup extra temp sheet
  ss.deleteSheet(tempPipelineBatch);

    Logger.log("test_appendToCandidatePipelineFromProspects_noDuplicates PASSED!");
  } finally {
    ss.deleteSheet(tempPipeline);
  }
}

function test_appendToPipeline_movesProspectsDataCorrectly() {
  Logger.log("✅ Running test_appendToPipeline_movesProspectsDataCorrectly");

  const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
  const tempPipeline = ss.insertSheet("Temp_CandidatePipeline_AppendTest");
  const tempTextGeorge = ss.insertSheet("Temp_TextGeorge_AppendTest");
  tempTextGeorge.getRange(3, 1, 1, 3).setValues([["Driver ID", "Message", "Convo"]]);
  const tempSentTexts = ss.insertSheet("Temp_SentTexts_AppendTest");

  try {
    // 1️⃣ Setup Pipeline headers
    test_helper_get_pipeline_headers(tempPipeline);

    // 2️⃣ Fake Prospects row with 27 cols, with data in P–AA
    const fakeProspectsRow = new Array(27).fill("");
    const testDriverId = "DRV_APPEND_TEST";
    const testNote = "TEST_NOTE_FROM_PROSPECTS";

    fakeProspectsRow[23] = testDriverId;   // Prospects col X
    fakeProspectsRow[26] = testNote;       // Prospects col AA

    // 3️⃣ Call append
    appendToCandidatePipelineFromProspects(
      [fakeProspectsRow], 
      tempPipeline, 
      tempTextGeorge, 
      tempSentTexts
    );

    SpreadsheetApp.flush();

    // 4️⃣ Verify Pipeline got P–AA copied to B–M
    const data = tempPipeline.getRange(4, 2, 1, 12).getValues()[0];
    expectEqual(data[8], testDriverId, "✅ Sally ID copied to col J");
    expectEqual(data[12 - 1], testNote, "✅ Notes copied to col M");

    // 5️⃣ Master Status (col B) should remain empty
    expectEqual(data[0], "", "✅ Master Status remains empty (not set by append)");

    Logger.log("✅ test_appendToPipeline_movesProspectsDataCorrectly PASSED!");
  } finally {
    ss.deleteSheet(tempPipeline);
    ss.deleteSheet(tempTextGeorge);
    ss.deleteSheet(tempSentTexts);
  }
}

function test_processNewCandidatesFromRows_blacklistDriver() {
  Logger.log("Running test_processNewCandidatesFromRows_blacklistDriver");

  const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
  const tempPipeline = ss.insertSheet("Temp_CandidatePipeline_ProcessTest");
  const tempTextGeorge = ss.insertSheet("Temp_TextGeorge_ProcessTest");
  tempTextGeorge.getRange(3, 1, 1, 3).setValues([["Driver ID", "Message", "Convo"]]);
  const tempSentTexts = ss.insertSheet("Temp_SentTexts_ProcessTest");

  try {
    // 1️⃣ Setup headers in row 3
    test_helper_get_pipeline_headers(tempPipeline);

    // 2️⃣ Insert one row in Candidate Pipeline (B–M), starting row 4
    const testDriverId = "DRV_PROCESS_BLACKLIST";
    const testNote = "BLACKLISTED TAG";
    const pipelineRow = new Array(52).fill("");
    pipelineRow[9] = testDriverId;  // Sally ID (col J)
    pipelineRow[26] = testNote;     // Notes (col AA)

    tempPipeline.getRange(4, 1, 1, 52).setValues([pipelineRow]);

    SpreadsheetApp.flush();

    // 3️⃣ Call processing step (this runs classification & queuing)
    processNewCandidatesFromRows(
      4,
      1,
      tempPipeline,
      tempTextGeorge,
      tempSentTexts,
      (id) => id === testDriverId ? "BLACKLISTED" : ""
    );

    SpreadsheetApp.flush();

    // 4️⃣ Assert Candidate Pipeline row updated
    const updated = tempPipeline.getRange(4, 1, 1, 52).getValues()[0];
    expectEqual(updated[1], "Rejected", "Master Status marked Rejected");
    expectTrue(updated[26].includes("BLACKLISTED"), "Notes appended with BLACKLISTED");

    // Outreach dates should not be filled
    expectEqual(updated[16], "", "First Outreach should stay blank");
    expectEqual(updated[17], "", "Latest Outreach should stay blank");

    // 5️⃣ Assert TEXT GEORGE has queued correct text
    const queued = tempTextGeorge.getRange(4, 1, 1, 3).getValues()[0];
    expectEqual(queued[0], testDriverId, "Driver ID queued in TEXT GEORGE");
    expectTrue(
      queued[2].startsWith(CONFIG.convoNames.blacklist_reject),
      "Correct convo queued for blacklist"
    );

    Logger.log("test_processNewCandidatesFromRows_blacklistDriver PASSED!");
  } finally {
    ss.deleteSheet(tempPipeline);
    ss.deleteSheet(tempTextGeorge);
    ss.deleteSheet(tempSentTexts);
  }
}