
function run_all_formsubmission_tests() {
    test_handleFormFail_updatesCandidateAndQueuesText()
    test_handleFormPass_updatesCandidateAndQueuesText()
    test_handleFormSubmission_marksRejectedAndQueuesText()
    test_handleFormSubmission_marksPassedAndQueuesText()
    test_handleFormSubmission_processesTwoSubmissions()
    test_sendAllTextsWithLock_removesProcessedRows()
}

// Verifies that calling handleFormFail directly marks the candidate as Rejected and queues the rejection text in TEXT GEORGE.
function test_handleFormFail_updatesCandidateAndQueuesText() {
    Logger.log("Running test_handleFormFail_updatesCandidateAndQueuesText");
    FLAGS.ENABLE_TEXTING = false
    const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
    const tempPipeline = ss.insertSheet("Temp_CandidatePipeline_HandleFailTest");
    const tempTextGeorge = ss.insertSheet("Temp_TextGeorge_HandleFailTest");
    const tempSentTexts = ss.insertSheet("Temp_SentTexts_HandleFailTest");
  
    try {
      // 1️⃣ Setup Candidate Pipeline with headers
      test_helper_get_pipeline_headers(tempPipeline);
  
      // 2️⃣ Add fake candidate
      const testDriverId = "DRV_FAIL_TEST";
      const rowData = new Array(52).fill("");
      rowData[9] = testDriverId;  // Sally ID (J)
  
      tempPipeline.getRange(4, 1, 1, 52).setValues([rowData]);

      const textGeorgeData = new Array(3).fill("header");
      tempTextGeorge.getRange(3, 1, 1, 3).setValues([textGeorgeData]);

      SpreadsheetApp.flush();
  
      // 3️⃣ Call handleFormFail
      handleFormFail(
        testDriverId,
        tempPipeline,
        4,
        tempTextGeorge,
        tempSentTexts,
        true
      );
  
      SpreadsheetApp.flush();
  
      // 4️⃣ Assert Candidate Pipeline updated
      const updatedRow = tempPipeline.getRange(4, 1, 1, 52).getValues()[0];
      expectEqual(updatedRow[1], "Rejected", "Master Status set to Rejected");
      expectTrue(updatedRow[17] !== "", "Latest Outreach date is set");
      expectEqual(updatedRow[22], "Fail", "Presscreen Results marked Fail")
  
      // 5️⃣ Assert TEXT GEORGE queue
      const textGeorgeRows = tempTextGeorge.getRange(4, 1, 1, 3).getValues()[0];
      expectEqual(textGeorgeRows[0], testDriverId, "Driver ID queued in TEXT GEORGE");
      expectTrue(
        textGeorgeRows[2].startsWith(CONFIG.convoNames.prescreen_reject),
        "Correct convo name queued"
      );
  
      Logger.log("test_handleFormFail_updatesCandidateAndQueuesText PASSED!");
    } finally {
      ss.deleteSheet(tempPipeline);
      ss.deleteSheet(tempTextGeorge);
      ss.deleteSheet(tempSentTexts);
    }
}

// Verifies that calling handleFormPass marks the candidate as prescreen results = pass and queues the interview text in TEXT GEORGE.
function test_handleFormPass_updatesCandidateAndQueuesText() {
    Logger.log("Running test_handleFormPass_updatesCandidateAndQueuesText");
    FLAGS.ENABLE_TEXTING = false
    const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
    const tempPipeline = ss.insertSheet("Temp_CandidatePipeline_HandlePassTest");
    const tempTextGeorge = ss.insertSheet("Temp_TextGeorge_HandlePassTest");
    const tempSentTexts = ss.insertSheet("Temp_SentTexts_HandlePassTest");
  
    try {
      // 1️⃣ Setup Candidate Pipeline with headers
      test_helper_get_pipeline_headers(tempPipeline);
  
      // 2️⃣ Add fake candidate
      const testDriverId = "DRV_PASS_TEST";
      const rowData = new Array(52).fill("");
      rowData[9] = testDriverId;  // Sally ID (J)
  
      tempPipeline.getRange(4, 1, 1, 52).setValues([rowData]);

      const textGeorgeData = new Array(3).fill("header");
      tempTextGeorge.getRange(3, 1, 1, 3).setValues([textGeorgeData]);

      SpreadsheetApp.flush();
  
      // 3️⃣ Call handleFormPass
      handleFormPass(
        testDriverId,
        tempPipeline,
        4,
        tempTextGeorge,
        tempSentTexts,
        true
      );
  
      SpreadsheetApp.flush();
  
      // 4️⃣ Assert Candidate Pipeline updated
      const updatedRow = tempPipeline.getRange(4, 1, 1, 52).getValues()[0];
      expectEqual(updatedRow[1], "Pending", "Master Status should still be set to Pending");
      expectTrue(updatedRow[17] !== "", "Latest Outreach date is set");
  
      // 5️⃣ Assert TEXT GEORGE queue
      const textGeorgeRows = tempTextGeorge.getRange(4, 1, 1, 3).getValues()[0];
      expectEqual(textGeorgeRows[0], testDriverId, "Driver ID queued in TEXT GEORGE");
      expectTrue(
        textGeorgeRows[2].startsWith(CONFIG.convoNames.interviewText),
        "Correct convo name queued"
      );
  
      Logger.log("test_handleFormPass_updatesCandidateAndQueuesText PASSED!");
    } finally {
      ss.deleteSheet(tempPipeline);
      ss.deleteSheet(tempTextGeorge);
      ss.deleteSheet(tempSentTexts);
    }
}

// Simulates a single form submission and checks that handleFormSubmission marks the candidate Rejected and queues the text.
function test_handleFormSubmission_marksRejectedAndQueuesText() {
    Logger.log("Running test_handleFormSubmission_marksRejectedAndQueuesText");
  
    const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
    const tempPipeline = ss.insertSheet("Temp_CandidatePipeline_RejectTest");
    const tempTextGeorge = ss.insertSheet("Temp_TextGeorge_RejectTest");
    const tempFormResponses = ss.insertSheet("Temp_FormResponses_RejectTest");
  
    try {
      // 1️⃣ Setup Candidate Pipeline headers
      test_helper_get_pipeline_headers(tempPipeline);
  
      // 2️⃣ Insert candidate row (blank license, so no exemption)
      const testDriverId = "DRV_TEST_REJECT_FLOW";
      const pipelineRow = new Array(52).fill("");
      pipelineRow[9] = testDriverId;  // Sally ID (J)
  
      tempPipeline.getRange(4, 1, 1, 52).setValues([pipelineRow]);
      tempTextGeorge.getRange(3, 1, 1, 3).setValues([["Drivers", "Text", "Convo name"]])
      SpreadsheetApp.flush();

  
      // 3️⃣ Simulate Form Responses sheet
      tempFormResponses.getRange(1, CONFIG.sheetColumns.COLUMN_ID + 1).setValue("Driver ID");
      tempFormResponses.getRange(1, CONFIG.sheetColumns.COLUMN_PASS + 1).setValue("Pass");
      tempFormResponses.getRange(2, CONFIG.sheetColumns.COLUMN_ID + 1).setValue(testDriverId);
      tempFormResponses.getRange(2, CONFIG.sheetColumns.COLUMN_PASS + 1).setValue(0);
      SpreadsheetApp.flush();
  
      // 4️⃣ Fake event object
      const fakeEvent = {
        source: ss,
        range: tempFormResponses.getRange(2, 1)
      };
  
      // 5️⃣ Call submission handler
      FLAGS.ENABLE_TEXTING = false; // ✅ Simulate test without sending real texts
      handleFormSubmission(fakeEvent, tempPipeline, tempTextGeorge, null, tempFormResponses, true);
      SpreadsheetApp.flush();
  
      // 6️⃣ Verify Candidate Pipeline updated
      const updated = tempPipeline.getRange(4, 1, 1, 52).getValues()[0];
      expectEqual(updated[1], "Rejected", "Master Status marked Rejected");
  
      // 7️⃣ Verify text was queued in Text George
      const queued = tempTextGeorge.getRange(4, 1, 1, 3).getValues()[0];
      expectEqual(queued[0], testDriverId, "Correct Driver ID queued in TEXT GEORGE");
      expectTrue(
        queued[2].startsWith(CONFIG.convoNames.prescreen_reject),
        "Correct convo name queued for rejection"
      );
  
      Logger.log("test_handleFormSubmission_marksRejectedAndQueuesText PASSED!");
    } finally {
      ss.deleteSheet(tempPipeline);
      ss.deleteSheet(tempTextGeorge);
      ss.deleteSheet(tempFormResponses);
    }
}

// Simulates a single form submission and checks that handleFormSubmission marks the candidate passed and queues the text.
function test_handleFormSubmission_marksPassedAndQueuesText() {
    Logger.log("Running test_handleFormSubmission_marksPassedAndQueuesText");
  
    const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
    const tempPipeline = ss.insertSheet("Temp_CandidatePipeline_PassTest");
    const tempTextGeorge = ss.insertSheet("Temp_TextGeorge_PassTest");
    const tempFormResponses = ss.insertSheet("Temp_FormResponses_PassTest");
  
    try {
      // 1️⃣ Setup Candidate Pipeline headers
      test_helper_get_pipeline_headers(tempPipeline);
  
      // 2️⃣ Insert candidate row (blank license, so no exemption)
      const testDriverId = "DRV_TEST_PASS_FLOW";
      const pipelineRow = new Array(52).fill("");
      pipelineRow[9] = testDriverId;  // Sally ID (J)
  
      tempPipeline.getRange(4, 1, 1, 52).setValues([pipelineRow]);
      tempTextGeorge.getRange(3, 1, 1, 3).setValues([["Drivers", "Text", "Convo name"]])
      SpreadsheetApp.flush();

  
      // 3️⃣ Simulate Form Responses sheet
      tempFormResponses.getRange(1, CONFIG.sheetColumns.COLUMN_ID + 1).setValue("Driver ID");
      tempFormResponses.getRange(1, CONFIG.sheetColumns.COLUMN_PASS + 1).setValue("Pass");
      tempFormResponses.getRange(2, CONFIG.sheetColumns.COLUMN_ID + 1).setValue(testDriverId);
      tempFormResponses.getRange(2, CONFIG.sheetColumns.COLUMN_PASS + 1).setValue(1);
      SpreadsheetApp.flush();
  
      // 4️⃣ Fake event object
      const fakeEvent = {
        source: ss,
        range: tempFormResponses.getRange(2, 1)
      };
  
      // 5️⃣ Call submission handler
      FLAGS.ENABLE_TEXTING = false; // ✅ Simulate test without sending real texts
      handleFormSubmission(fakeEvent, tempPipeline, tempTextGeorge, null, tempFormResponses, true);
      SpreadsheetApp.flush();
  
      // 6️⃣ Verify Candidate Pipeline updated
      const updated = tempPipeline.getRange(4, 1, 1, 52).getValues()[0];
      expectEqual(updated[1], "Pending", "Master Status marked Pending");
  
      // 7️⃣ Verify text was queued in Text George
      const queued = tempTextGeorge.getRange(4, 1, 1, 3).getValues()[0];
      expectEqual(queued[0], testDriverId, "Correct Driver ID queued in TEXT GEORGE");
      expectTrue(
        queued[2].startsWith(CONFIG.convoNames.interviewText),
        "Correct convo name queued for interview step"
      );
  
      Logger.log("test_handleFormSubmission_marksPassedAndQueuesText PASSED!");
    } finally {
      ss.deleteSheet(tempPipeline);
      ss.deleteSheet(tempTextGeorge);
      ss.deleteSheet(tempFormResponses);
    }
}

// Simulates two separate form submissions back-to-back and verifies both candidates are marked Rejected and both texts are queued.
function test_handleFormSubmission_processesTwoSubmissions() {
    Logger.log("Running test_handleFormSubmission_processesTwoSubmissions");
  
    const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
  
    // Create temp sheets
    const tempPipeline = ss.insertSheet("Temp_CandidatePipeline_TwoSubmitTest");
    const tempTextGeorge = ss.insertSheet("Temp_TextGeorge_TwoSubmitTest");
    const tempFormResponses = ss.insertSheet("Temp_FormResponses_TwoSubmitTest");
    tempTextGeorge.getRange(3, 1, 1, 3).setValues([["Drivers", "Text", "Convo name"]])

    try {
      // 1. Set up Candidate Pipeline headers
      test_helper_get_pipeline_headers(tempPipeline);
  
      // 2. Insert TWO candidate rows (blank license, so no exemption)
      const driverId1 = "DRV_TEST_SUBMIT_1";
      const driverId2 = "DRV_TEST_SUBMIT_2";
      const blankRow = new Array(52).fill("");
      const row1 = blankRow.slice();
      const row2 = blankRow.slice();
      row1[9] = driverId1;
      row2[9] = driverId2;
  
      tempPipeline.getRange(4, 1, 2, 52).setValues([row1, row2]);
      SpreadsheetApp.flush();
  
      // 3. Setup Form Responses headers
      tempFormResponses.getRange(1, CONFIG.sheetColumns.COLUMN_ID + 1).setValue("Driver ID");
      tempFormResponses.getRange(1, CONFIG.sheetColumns.COLUMN_PASS + 1).setValue("Pass");
  
      // 4. Add TWO form submission rows (one FAIL, one PASS)
      tempFormResponses.getRange(2, CONFIG.sheetColumns.COLUMN_ID + 1).setValue(driverId1);
      tempFormResponses.getRange(2, CONFIG.sheetColumns.COLUMN_PASS + 1).setValue(0);
  
      tempFormResponses.getRange(3, CONFIG.sheetColumns.COLUMN_ID + 1).setValue(driverId2);
      tempFormResponses.getRange(3, CONFIG.sheetColumns.COLUMN_PASS + 1).setValue(1);
  
      SpreadsheetApp.flush();
  
      // 5. Disable actual texting
      FLAGS.ENABLE_TEXTING = false;
  
      // 6. Simulate TWO separate form submissions
      const fakeEvent1 = {
        source: ss,
        range: tempFormResponses.getRange(2, 1)
      };
      const fakeEvent2 = {
        source: ss,
        range: tempFormResponses.getRange(3, 1)
      };
  
      // Call handleFormSubmission twice, simulating two triggers
      handleFormSubmission(fakeEvent1, tempPipeline, tempTextGeorge, null, tempFormResponses, true);
      handleFormSubmission(fakeEvent2, tempPipeline, tempTextGeorge, null, tempFormResponses, true);
  
      SpreadsheetApp.flush();
  
      // 7. Verify both drivers are marked Rejected in Candidate Pipeline
      const updated = tempPipeline.getRange(4, 1, 2, 52).getValues();
      expectEqual(updated[0][1], "Rejected", "Driver 1 marked Rejected");
      expectEqual(updated[1][1], "Pending", "Driver 2 marked Pending");
  
      // 8. Verify both were queued in TEXT GEORGE
      const queued = tempTextGeorge.getRange(4, 1, 2, 3).getValues();
      expectEqual(queued[0][0], driverId1, "Driver 1 queued in TEXT GEORGE");
      expectEqual(queued[1][0], driverId2, "Driver 2 queued in TEXT GEORGE");
  
      Logger.log("test_handleFormSubmission_processesTwoSubmissions PASSED!");
    } finally {
      ss.deleteSheet(tempPipeline);
      ss.deleteSheet(tempTextGeorge);
      ss.deleteSheet(tempFormResponses);
    }
}

// Confirms that sendAllTextsWithLock processes and deletes all queued rows from TEXT GEORGE as if they were sent.
function test_sendAllTextsWithLock_removesProcessedRows() {
    Logger.log("Running test_sendAllTextsWithLock_removesProcessedRows");
  
    const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
    const tempTextGeorge = ss.insertSheet("Temp_TextGeorge_SendLockCleanupTest");
    const tempSentTexts = ss.insertSheet("Temp_SentTexts_SendLockCleanupTest");
  
    try {
      // 1. Add headers in row 3
      tempTextGeorge.getRange(3, 1, 1, 3).setValues([["Driver ID", "Text", "Convo Name"]]);
  
      // 2. Insert a pending row in row 4
      const testDriverId = "DRV_CLEANUP_TEST";
      const testText = "Your form was rejected";
      const testConvo = CONFIG.convoNames.prescreen_reject;
  
      tempTextGeorge.getRange(4, 1, 1, 3).setValues([
        [testDriverId, testText, testConvo]
      ]);
  
      SpreadsheetApp.flush();
  
      // 3. Disable actual texting but still simulate sending
      FLAGS.ENABLE_TEXTING = false;
  
      // 4. Call sendAllTextsWithLock (this should "send" and remove the row)
      sendAllTextsWithLock(tempTextGeorge, tempSentTexts);
  
      SpreadsheetApp.flush();
  
      // 5. Verify TEXT GEORGE is now empty of pending rows
      const remainingRows = tempTextGeorge.getLastRow();
      if (remainingRows > 3) {
        throw new Error("TEXT GEORGE still has pending rows after sending!");
      }
  
      Logger.log("test_sendAllTextsWithLock_removesProcessedRows PASSED!");
  
    } finally {
      // Clean up temp sheets
      ss.deleteSheet(tempTextGeorge);
      ss.deleteSheet(tempSentTexts);
    }
}
