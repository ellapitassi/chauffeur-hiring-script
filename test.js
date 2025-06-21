function test_onFormSubmit() {
  const sheet = CONFIG.sheets.formResponses;
  const fakeEvent = {
    source: sheet.getParent(), // Spreadsheet object
    range: sheet.getRange(2, 1) // Simulate edit at row 2, column 1
  };
  const result = onFormSubmit(fakeEvent);
  Logger.log(result);
}

function simulateFormSubmitRow462() {
  const sheet = SpreadsheetApp.openById(CONFIG.sheetIds.formResponses).getSheetByName('Form Responses 1');
  const fakeEvent = {
    source: sheet.getParent(),
    range: sheet.getRange(462, 1), // Cell A462
  };
  onFormSubmit(fakeEvent);
}

function test_onFormSubmit_UI() {
  const sheet = CONFIG.sheets.formResponses;
  const range = sheet.getRange(2, 1); // Example range
  const fakeEvent = { source: SpreadsheetApp.getActiveSpreadsheet(), range };
  onFormSubmit(fakeEvent);
}

function test_handleFormSubmission() {
  const sheet = CONFIG.sheets.formResponses;
  const testRow = 433; // Ella row
  const range = sheet.getRange(testRow, 1); // simulate an edit in Column A

  const fakeEvent = {
    range: range,
    source: SpreadsheetApp.getActiveSpreadsheet()
  };

  handleFormSubmission(fakeEvent);
}


function test_manualSendTextToElla() {
  const testDriverId = "PITASSI_ELLA_83333"; 

  // Optional: add guard to prevent accidental use
  if (testDriverId !== "PITASSI_ELLA_83333") {
    Logger.log("Driver ID not recognized for test — aborting.");
    return;
  }

  // Call the actual function
  const wasSuccessful = sendText(testDriverId);
  if (wasSuccessful) {
    Logger.log(`Text successfully sent to ${testDriverId}`);
  } else {
    Logger.log(`Text failed to send to ${testDriverId}`);
  }
}

function test_sendRejectionText_real() {
  const driverId = "PITASSI_ELLA_83333";  // Only test on your own ID
  const convoName = "test_rejection";
  const messageText = "This is a test rejection message.";

  const sheet = CONFIG.sheets.textGeorge;
  const existingRows = sheet.getRange("A4:C").getValues();

  // 1. Prevent testing if other rows exist
  const otherRows = existingRows.filter(row => row[0] && row[0] !== driverId);
  if (otherRows.length > 0) {
    Logger.log("Aborting test: TEXT GEORGE sheet has other rows. Clean up first.");
    return;
  }

  // 2. Guard clause for safety
  if (driverId !== "PITASSI_ELLA_83333") {
    Logger.log("Skipping test: Only allowed to use PITASSI_ELLA_83333 for safety.");
    return;
  }

  // 3. Run the real function (which will add the row, send, and delete)
  const success = sendRejectionText(driverId, convoName, messageText);
  if (success) {
    Logger.log("Test passed: Text sent and row removed.");
  } else {
    Logger.log("Test failed: Text was not sent.");
  }
}

function test_updateCandidateRowInterviewStatusByEmail() {
  const sheet = CONFIG.sheets.candidatePipeline;
  const testEmail = "ella@drivesally.com"; // Make sure this is in cell G996
  const testDate = "6/17/2025 1:00pm";

  // Call your function to simulate invite creation
  updateCandidateRowInterviewStatusByEmail(testEmail, "created", testDate);

  // Find the row by email in column G
  const data = sheet.getRange("G2:G").getValues().flat();
  const rowIndex = data.findIndex(e => e && e.toString().trim().toLowerCase() === testEmail.toLowerCase());

  if (rowIndex === -1) {
    Logger.log(`❌ Email not found in test sheet: ${testEmail}`);
    return;
  }

  const targetRow = rowIndex + 2; // +2 for header and 0-indexing
  const result = sheet.getRange(targetRow, 25).getValue(); // Column Y = 25
  Logger.log(`✅ Row ${targetRow} — Expected: ${testDate} | Actual: ${result}`);
}

function testLogDetailedError() {
  logDetailedError({
    driverId: "TEST123",
    message: "Test error message",
    context: "TestContext",
    details: "This is a test to confirm logging works"
  });
}

function testRunPrescreenFollowUp() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.sheetIds.formResponses);
  const testSheet = spreadsheet.insertSheet("Test_Pipeline");

  // Add mock headers and test data (simulate A–AM = 1–39)
  const headers = Array(39).fill("").map((_, i) => `Col ${i + 1}`);
  const today = new Date();
  const staleDate = new Date(today.getTime() - 15 * 86400000); // 15 days ago

  const testData = [
    // status(W), lastOutreach(R), extraAttempts(AM), driverId(J)
    // Should send follow-up #1
    createTestRow({ status: "Pending", lastOutreach: staleDate, extraAttempts: 0, driverId: "TEST1" }),

    // Should send follow-up #2
    createTestRow({ status: "Pending", lastOutreach: staleDate, extraAttempts: 1, driverId: "PITASSI_ELLA_83333" }),

    // Should mark as Abandoned
    createTestRow({ status: "Pending", lastOutreach: staleDate, extraAttempts: 2, driverId: "TEST3" }),

    // Should skip — recent outreach
    createTestRow({ status: "Pending", lastOutreach: today, extraAttempts: 1, driverId: "TEST4" }),

    // Should skip — not pending
    createTestRow({ status: "Interview Scheduled", lastOutreach: staleDate, extraAttempts: 1, driverId: "TEST5" }),
  ];

  testSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  testSheet.getRange(4, 1, testData.length, testData[0].length).setValues(testData);

  // Temporarily override CONFIG to use the test sheet
  const originalGetSheets = CONFIG.sheets;
  CONFIG.sheets = {
    ...originalGetSheets,
    candidatePipeline: testSheet
  };

  runPrescreenFollowUp(testSheet);

  // Restore original config
  CONFIG.sheets = originalGetSheets;

  Logger.log("✅ testRunPrescreenFollowUp completed. Check the Test_Pipeline sheet for results.");
}

function createTestRow({ status, lastOutreach, extraAttempts, driverId }) {
  const row = Array(39).fill("");

  row[22] = status; // W
  row[17] = lastOutreach; // R
  row[38] = extraAttempts; // AM
  row[9] = driverId; // J

  return row;
}