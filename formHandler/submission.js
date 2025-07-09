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
  
function handleFormSubmission(e, candidatePipelineOverride = null, textGeorgeOverride = null, sentTextOverrride = null, formResponsesOverride = null, skipSend = false) {
    // STEP 1: Form row parsing + validation
    const sheet = formResponsesOverride || SpreadsheetApp.openById(CONFIG.sheetIds.formResponses).getSheetByName('Form Responses 1');    const rowIndex = e.range.getRow();
    const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
    const textGeorgeSheet = textGeorgeOverride || CONFIG.sheets.textGeorge
    const sentTextSheet = sentTextOverrride || CONFIG.sheets.sentTexts
    const passValueCell = row[CONFIG.sheetColumns.COLUMN_PASS];  // Column Q
    const driverId = row[CONFIG.sheetColumns.COLUMN_ID];   // Column K
    if (!isValidDriverId(driverId)) {
        logError(`❌ Invalid or missing Driver ID: ${driverId}. Exiting handleFormSubmission.`);
        return;
    }

    const candidateSheet = candidatePipelineOverride || CONFIG.sheets.candidatePipeline;

    const result = getCandidateRowOrLogAndExit(driverId, candidateSheet);
    if (!result) return;

    const { candidateRow, rowNumber } = result;

    // NEW: stop if already Rejected or Blacklisted
    const masterStatus = candidateRow[1]?.toString().trim();
    if (masterStatus === "Rejected") {
        logError(`❌ Driver ID ${driverId} has status ${masterStatus}. Not processing form submission.`);
        return;
    }

    // Check if AZ (col 52) is 1 to update Chauffeur License (col C)
    const licenseFlag = Number(candidateRow[51]);  // AZ
    if (licenseFlag === 1) {
        candidateSheet.getRange(rowNumber, 3).setValue("YES");
        Logger.log(`Updated Chauffeur License to "YES" for driver ${driverId}`);
    }

    const passValue = Number(passValueCell);  
    logError(`--- Handling form for driverId: ${driverId} | passValue: ${passValue} ---`);
  
    // failed and no override
    const override = candidateRow[14]; // Column O (index 14), Override
    if (passValue === 1 || override === "Pass") {
        logError(`Driver ID ${driverId} passed form or has override. Marking prescreen results pass and sending interview text.`);
        handleFormPass(driverId, candidateSheet, rowNumber, textGeorgeSheet, sentTextSheet, skipSend);
        return;
    }

    // reject
    logError(`Driver ID ${driverId} failed form and has no override. Marking Rejected and sending rejection text.`);
    handleFormFail(driverId, candidateSheet, rowNumber, textGeorgeSheet, sentTextSheet, skipSend);
    return;
}
  
function getCandidateRowOrLogAndExit(driverId, candidateSheet) {
    const candidateData = candidateSheet.getDataRange().getValues();
    const rowIndex = candidateData.findIndex(row => row[9]?.toString().trim() === driverId);
    
    if (rowIndex === -1) {
        logError(`❌ Driver ID ${driverId} not found in Candidate Pipeline. Exiting handleFormSubmission.`);
        return null;
    }
    
    const candidateRow = candidateData[rowIndex];
    
    // Row number in sheet (header + 1-index)
    const rowNumber = rowIndex + 1;
    
    return { candidateRow, rowNumber };
}

function handleFormFail(driverId, candidateSheet, rowNumber, textGeorgeSheet = CONFIG.sheets.textGeorge, sentTextsSheet, skipSend = false) {
    // 1️⃣ Queue Rejection Text
    queueTextRow(
      textGeorgeSheet,
      driverId,
      CONFIG.texts.prescreenReject,
      CONFIG.convoNames.prescreen_reject
    );

    updatePipelineAfterForm(driverId, candidateSheet, "FAIL")

    if (!skipSend) {
        sendAllTextsWithLock(textGeorgeSheet, sentTextsSheet);
    }

    Logger.log(`handleFormFail completed for driver ${driverId}`);
}

function handleFormPass(driverId, candidateSheet, rowNumber, textGeorgeSheet = CONFIG.sheets.textGeorge, sentTextsSheet, skipSend = false) {
    // 1️⃣ Queue Rejection Text
    queueTextRow(
      textGeorgeSheet,
      driverId,
      CONFIG.texts.interviewTextToSend,
      CONFIG.convoNames.interviewText
    );

    updatePipelineAfterForm(driverId, candidateSheet, "PASS")

    if (!skipSend) {
        sendAllTextsWithLock(textGeorgeSheet, sentTextsSheet);
    }

    Logger.log(`handleFormPass completed for driver ${driverId}`);
}

function updatePipelineAfterForm(driverId, pipelineOverride, status) {
    const candidatePipeline = pipelineOverride || CONFIG.sheets.candidatePipeline;
    
    // Find driver row, starting at row 4
    const data = candidatePipeline
      .getRange(4, 10, candidatePipeline.getLastRow() - 3)
      .getValues().flat();
    const rowIndex = data.findIndex(id => id && id.toString().trim() === driverId.trim());
    if (rowIndex === -1) {
      Logger.log(`⚠️ Driver ID ${driverId} not found in Candidate Pipeline`);
      return false;
    }
    const targetRow = rowIndex + 4;

    //last Outreach Date
    const today = makeSafeSheetDate(new Date());
    candidatePipeline.getRange(targetRow, 18).setValue(today); // Col R - Latest Outreach

    if (status === "FAIL") {
        candidatePipeline.getRange(targetRow, 23).setValue("Fail"); 
        candidatePipeline.getRange(targetRow, 2).setValue("Rejected"); // Master Status
    } else if (status === "PASS") {
        candidatePipeline.getRange(targetRow, 2).setValue("Pending"); // Master Status
        candidatePipeline.getRange(targetRow, 23).setValue("Pass");
        candidatePipeline.getRange(targetRow, 24).setValue("Invited");
        candidatePipeline.getRange(targetRow, 25).setValue("Calendly");
    }
}

function sendAllTextsWithLock(
    textGeorgeSheet = CONFIG.sheets.textGeorge,
    sentTextsSheet = CONFIG.sheets.sentTexts
  ) {
    const lock = LockService.getScriptLock();
  
    try {
      // 1️⃣ Attempt to acquire the lock
      Logger.log('🔐 Attempting to acquire send lock...');
      lock.waitLock(30000);  // Wait up to 30 seconds
  
      Logger.log('✅ Lock acquired. Starting send process.');
  
      // 2️⃣ Perform sending
      sendAllTexts(textGeorgeSheet);
  
      // 3️⃣ Clean up
      markTextedInGeorgeSheetOnce(textGeorgeSheet, sentTextsSheet)
  
      Logger.log('✅ Sending and cleanup complete.');
  
    } catch (error) {
      Logger.log('❌ Could not obtain lock. Another process may be running: ' + error);
  
    } finally {
      // 4️⃣ Always release the lock
      lock.releaseLock();
      Logger.log('🔓 Lock released.');
    }
}
