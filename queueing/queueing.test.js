function deleteTestSheets(...sheets) {
  const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
  sheets.forEach(sheet => {
    try {
      ss.deleteSheet(sheet);
    } catch (e) {
      Logger.log(`⚠️ Could not delete sheet: ${sheet.getSheetName()}`);
    }
  });
}

function test_getCandidateRows() {
  Logger.log("Running test_getCandidateRows");
  const { testPipeline, testTextGeorge, testSentTexts } = getTestSheets(1);

  try {
    // Write 2 fake rows with 52 columns each
    const row1 = new Array(52).fill("");
    row1[0] = "ID1";
    const row2 = new Array(52).fill("");
    row2[0] = "ID2";

    testPipeline.getRange(4, 1, 2, 52).setValues([row1, row2]);

    // Call function
    const rows = getCandidateRows(testPipeline, 4, 2);

    if (rows.length !== 2) throw new Error("❌ Expected 2 rows");
    if (rows[0][0] !== "ID1") throw new Error("❌ Expected first row to start with ID1");
    if (rows[1][0] !== "ID2") throw new Error("❌ Expected second row to start with ID2");

    Logger.log("✅ test_getCandidateRows passed!");

  } finally {
    // Always clean up
    deleteTestSheets(testPipeline, testTextGeorge, testSentTexts);
  }
}

function test_classifyCandidateRow() {
    Logger.log("Running test_classifyCandidateRow");

    // Match your column mapping from processNewCandidatesFromRows
    const COL = {
      DRIVER_ID: 9,
      PASS_FAIL: 15,
      OVERRIDE: 14,
      NOTES: 27
    };

    // Fake checkDailyDriverStats
    function fakeCheckStats(driverId) {
      return driverId === "BLACKLISTED_ID" ? "BLACKLISTED" : "";
    }

    // 1️⃣ PASS case
    let row = [];
    row[COL.DRIVER_ID] = "DRV1";
    row[COL.PASS_FAIL] = "Pass";
    let res = classifyCandidateRow(row, COL, fakeCheckStats);
    if (res.classification !== "PASS") throw new Error(`❌ Expected PASS, got ${res.classification}`);

    // 2️⃣ FAIL case
    row = [];
    row[COL.DRIVER_ID] = "DRV2";
    row[COL.PASS_FAIL] = "Fail";
    res = classifyCandidateRow(row, COL, fakeCheckStats);
    if (res.classification !== "FAIL") throw new Error(`❌ Expected FAIL, got ${res.classification}`);

    // 3️⃣ OVERRIDE_FAIL case
    row = [];
    row[COL.DRIVER_ID] = "DRV3";
    row[COL.PASS_FAIL] = "Pass";
    row[COL.OVERRIDE] = "fail override text";
    res = classifyCandidateRow(row, COL, fakeCheckStats);
    if (res.classification !== "FAIL") throw new Error(`❌ Expected OVERRIDE_FAIL, got ${res.classification}`);

    // 4️⃣ BLACKLISTED case
    row = [];
    row[COL.DRIVER_ID] = "BLACKLISTED_ID";
    row[COL.PASS_FAIL] = "Pass";
    res = classifyCandidateRow(row, COL, fakeCheckStats);
    if (res.classification !== "BLACKLISTED") throw new Error(`❌ Expected BLACKLISTED, got ${res.classification}`);

    // 5️⃣ SKIP for missing driverId
    row = [];
    res = classifyCandidateRow(row, COL, fakeCheckStats);
    if (res.classification !== "SKIP") throw new Error(`❌ Expected SKIP, got ${res.classification}`);

    Logger.log("test_classifyCandidateRow passed!");
}

function test_queueTextRow() {
    Logger.log("Running test_queueTextRow");

    // Arrange
    const { testPipeline, testTextGeorge, testSentTexts } = getTestSheets(2);

    try {
      // Act
      queueTextRow(testTextGeorge, "DRV999", "Hello message", "TestConvo");

      // Assert
      const values = testTextGeorge.getRange(4, 1, 1, 3).getValues()[0];
      if (values[0] !== "DRV999") throw new Error(`❌ DriverId mismatch. Got ${values[0]}`);
      if (values[1] !== "Hello message") throw new Error(`❌ Text mismatch. Got ${values[1]}`);
      if (values[2] !== "TestConvo") throw new Error(`❌ ConvoName mismatch. Got ${values[2]}`);

      Logger.log("test_queueTextRow passed!");
    } finally {
      // Cleanup
      deleteTestSheets(testPipeline, testTextGeorge, testSentTexts);
    }
}

function test_processSingleCandidateRow() {
  Logger.log("Running test_processSingleCandidateRow");

  // ✅ Fixed test date for stable test
  const staticTestDate = new Date(2025, 6, 2); // July 2, 2025
  const todayFormatted = Utilities.formatDate(staticTestDate, "America/Chicago", "MM/dd/yyyy");

  const { testPipeline, testTextGeorge, testSentTexts } = getTestSheets(3);

  const COL = {
    STATUS: 1,
    DRIVER_ID: 9,
    OVERRIDE: 14,
    PASS_FAIL: 15,
    FIRST_OUTREACH: 16,
    LATEST_OUTREACH: 17,
    PRESCREEN_RESULTS: 22,
    NOTES: 27
  };

  try {
    // Arrange test row
    const candidateRow = new Array(52).fill("");
    candidateRow[COL.DRIVER_ID] = "DRV100";
    candidateRow[COL.PASS_FAIL] = "Pass";
    testPipeline.getRange(4, 1, 1, 52).setValues([candidateRow]);

    const rowFromSheet = testPipeline.getRange(4, 1, 1, 52).getValues()[0];

    // Act
    processSingleCandidateRow({
      row: rowFromSheet,
      rowIdx: 4,
      textGeorgeSheet: testTextGeorge,
      sentTextsSheet: testSentTexts,
      candidatePipeline: testPipeline,
      COL,
      today: todayFormatted,
      checkDriverStatsFn: () => ""  // No blacklist in this test
    });

    // Assert 1️⃣ TEXT GEORGE got the message
    const queuedRow = testTextGeorge.getRange(4, 1, 1, 3).getValues()[0];
    expectEqual(queuedRow[0], "DRV100", "✅ DriverId in TEXT GEORGE");

    // Assert 2️⃣ CandidatePipeline updated
    const updatedRow = testPipeline.getRange(4, 1, 1, 52).getValues()[0];
    expectEqual(updatedRow[COL.STATUS], "Pending", "✅ STATUS is Pending");

    const firstOutreachFormatted = Utilities.formatDate(
      new Date(updatedRow[COL.FIRST_OUTREACH]),
      Session.getScriptTimeZone(),
      "MM/dd/yyyy"
    );
    const latestOutreachFormatted = Utilities.formatDate(new Date(updatedRow[COL.LATEST_OUTREACH]), "America/Chicago", "MM/dd/yyyy");

    expectEqual(firstOutreachFormatted, todayFormatted, "✅ First Outreach date matches");
    expectEqual(latestOutreachFormatted, todayFormatted, "✅ Latest Outreach date matches");

    Logger.log("✅ test_processSingleCandidateRow passed!");
  } finally {
    // Always clean up
    // deleteTestSheets(testPipeline, testTextGeorge, testSentTexts);
  }
}