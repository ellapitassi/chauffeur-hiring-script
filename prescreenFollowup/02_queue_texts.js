function automatedPrescreenFollowUp(pipelineSheet = null, textGeorgeSheet = null, sentTextSheet = null) {
  Logger.log("Starting prescreen follow-up process");

  runPrescreenFollowUp(pipelineSheet, textGeorgeSheet);
  sendAllTexts(textGeorgeSheet);
  markTextedInGeorgeSheetOnce(textGeorgeSheet, sentTextSheet);

  Logger.log("Prescreen follow-up process complete.");
}

function runPrescreenFollowUp(pipelineSheet = null, textSheetOverride = null) {
  const activeSheet = pipelineSheet || CONFIG.sheets.candidatePipeline;
  const textSheet = textSheetOverride || CONFIG.sheets.textGeorge;
  const lastRow = activeSheet.getLastRow();
  const pipelineData = activeSheet.getRange(4, 1, lastRow - 3, 46).getValues(); // include AT (col 46)

  const safeToday = makeSafeSheetDate(new Date());
  const todayFormatted = Utilities.formatDate(safeToday, "America/Chicago", "MM/dd/yyyy");

  pipelineData.forEach((row, idx) => {
    const rowNum = idx + 4;
    const driverId = row[9];       // Col J
    const status = row[22];        // Col W
    const outreachFlag = row[45];    // Col AT
    let extraAttempts = row[38];     // Col AM

    if (!driverId) return;
    if (outreachFlag !== 1) return;

    // Extra guard if status changed unexpectedly
    if (status !== "Pending") {
      Logger.log(`[Row ${rowNum}] Skipped — Status is not Pending`);
      return;
    }

    // Normalize extraAttempts
    if (extraAttempts === "" || extraAttempts === null) {
      extraAttempts = 0;
    } else if (typeof extraAttempts !== "number") {
      extraAttempts = parseInt(extraAttempts, 10);
      if (isNaN(extraAttempts)) extraAttempts = 0;
    }

    if (extraAttempts === 0) {
        // Send 2nd message
        queueText(driverId, CONFIG.texts.prescreenSecondOutreach, CONFIG.convoNames.prescreenSecondOutreach, textSheet);
        activeSheet.getRange(rowNum, 18).setValue(todayFormatted);      // Col R
        activeSheet.getRange(rowNum, 39).setValue(1);                   // Col AM
        logError(`[Row ${rowNum}] Sent 2nd message to ${driverId}`);
      } else if (extraAttempts === 1) {
        // send final message
        queueText(driverId, CONFIG.texts.prescreenThirdOutreach, CONFIG.convoNames.prescreenThirdOutreach, textSheet);
        activeSheet.getRange(rowNum, 18).setValue(todayFormatted);      // Col R
        activeSheet.getRange(rowNum, 39).setValue(2);                   // Col AM
        logError(`[Row ${rowNum}] Sent final message to ${driverId}`);
      } else if (extraAttempts >= 2) {
        // mark as abandoned
        activeSheet.getRange(rowNum, 2).setValue("Abandoned");          // Col B
        Logger.log(`[Row ${rowNum}] Marked as Abandoned`);
    }
  });

  Logger.log("Prescreen follow-up run complete.");
}

function queueText(driverId, message, convoName, textSheetOverride) {
  // if (!FLAGS.ENABLE_TEXTING) {
  //     Logger.log(`🧪 [DISABLED] Would queue text for ${driverId}: "${message}" (${convoName})`);
  //     return;
  //   }
  const textGeorgeSheet = textSheetOverride || CONFIG.sheets.textGeorge;

  if (!driverId || !message) {
    logDetailedError({
      message: "Missing driverId or message for queuing text",
      context: "queueText",
      details: `driverId: ${driverId}, message: ${message}`
    });
    return;
  }
  const existingRows = textGeorgeSheet.getRange("A4:A").getValues().flat();
  if (existingRows.includes(driverId)) {
      logDetailedError({
          driverId,
          message: "Duplicate entry — driverId already exists in TEXT GEORGE",
          context: "queueText",
          details: `Skipped queuing for convo: ${convoName}`
      });
      return;
  }
  
  textGeorgeSheet.appendRow([driverId, message, convoName]);
  Logger.log(`📨 Queued text for ${driverId} — ${convoName}`);
}