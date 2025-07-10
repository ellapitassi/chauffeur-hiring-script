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

// function test_updateCandidateRowInterviewStatusByEmail() {
//   const sheet = CONFIG.sheets.candidatePipeline;
//   const testEmail = "ella@drivesally.com"; // Make sure this is in cell G996
//   const testDate = "6/17/2025 1:00pm";

//   // Call your function to simulate invite creation
//   updateCandidateRowInterviewStatusByEmail(testEmail, "created", testDate, ca);

//   // Find the row by email in column G
//   const data = sheet.getRange("G2:G").getValues().flat();
//   const rowIndex = data.findIndex(e => e && e.toString().trim().toLowerCase() === testEmail.toLowerCase());

//   if (rowIndex === -1) {
//     Logger.log(`❌ Email not found in test sheet: ${testEmail}`);
//     return;
//   }

//   const targetRow = rowIndex + 2; // +2 for header and 0-indexing
//   const result = sheet.getRange(targetRow, 25).getValue(); // Column Y = 25
//   Logger.log(`Row ${targetRow} — Expected: ${testDate} | Actual: ${result}`);
// }

function testLogDetailedError() {
  logDetailedError({
    driverId: "TEST",
    message: "Test error message",
    context: "TestContext",
    details: "This is a test to confirm logging works"
  });
}
