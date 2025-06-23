// candidate pipeline should already be filled out -> form gets subbmited 
function createFormSubmitTrigger() {
  const sheet = SpreadsheetApp.openById(CONFIG.sheetIds.formResponses);
  ScriptApp.newTrigger("onFormSubmit")
    .forSpreadsheet(sheet)
    .onFormSubmit()
    .create();
}

function logAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    Logger.log(`Trigger for function: ${trigger.getHandlerFunction()} - Event type: ${trigger.getEventType()}`);
  });
}

function onFormSubmit(e) {
  handleFormSubmission(e)
}

function handleFormSubmission(e) {
  // STEP 1: Form row parsing + validation
  const sheet = SpreadsheetApp.openById(CONFIG.sheetIds.formResponses).getSheetByName('Form Responses 1');
  const rowIndex = e.range.getRow();
  const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];

  const passValueCell = row[CONFIG.sheetColumns.COLUMN_PASS];  // Column Q
  const driverId = row[CONFIG.sheetColumns.COLUMN_ID];   // Column K
  const passValue = Number(passValueCell);

  Logger.log(`--- Handling form for driverId: ${driverId} | passValue: ${passValue} ---`);

  // failed or invalid Id
  if (passValue !== 1 || !isValidDriverId(driverId)) {
    // STEP 2: Candidate Pipeline logic
    const candidateSheet = CONFIG.sheets.candidatePipeline;
    const candidateData = candidateSheet.getDataRange().getValues();
    const candidateRow = candidateData.find(row => row[9]?.toString().trim() === driverId);

    if (!candidateRow) {
      logError(driverId, `No candidate row found for ${driverId}`);
      return;
    }
    const colO = candidateRow[14]; // Column O (index 14), Override
    const colC = candidateRow[2];  // Column C (index 2), Chauffeur License
    if (colO !== "Pass" && colC !== "YES") {
      Logger.log(`Sending rejection for ${driverId} with convo: ${CONFIG.convoNames.prescreen_reject}`);
      if (FLAGS.ENABLE_TEXTING) {
        Logger.log(`Sending rejection for ${driverId} with convo: ${CONFIG.convoNames.prescreen_reject}`);
        sendRejectionText(driverId, CONFIG.convoNames.prescreen_reject, CONFIG.texts.prescreenReject);
        logError(driverId, "✅ Rejection text should be sent to ");
      } else {
        logError("🚫 Texting disabled — rejection text not sent.");
      }
    }
    return;
  }

  // STEP 3: Mass Text logic
  const inCandidatePipeline = checkIfDriverIdExistsInCandidatePipeline(driverId);
  const statusNote = inCandidatePipeline
    ? checkDailyDriverStats(driverId)
    : "NOT_IN_CANDIDATE_PIPELINE";

  const existingRows = CONFIG.sheets.textGeorge.getRange("A4:C").getValues();
  const isDuplicate = hasSentSimilarConvo(driverId, CONFIG.convoNames.interviewText, existingRows);
  const uniqueId = appendMassTextRow(driverId, statusNote)
  SpreadsheetApp.flush(); // Ensure row is committed before continuing

  // FOR TESTING ADD THIS && driverId === "PITASSI_ELLA_83333"
  if (shouldSendText(driverId, inCandidatePipeline, isDuplicate, statusNote) && FLAGS.ENABLE_TEXTING) { 
    const textSentSuccess = sendText(driverId);

    if (textSentSuccess) {
      updateCandidateRowSentText(driverId, "PASS")
      // runPrescreenFollowUp(); 
    }
  } else {
    Logger.log(`Text not sent to ${driverId} — FLAGS.ENABLE_TEXTING: ${FLAGS.ENABLE_TEXTING}, In Pipeline: ${inCandidatePipeline}, Duplicate: ${isDuplicate}, Blacklisted: ${isBlacklisted(statusNote)}`);
  }
}