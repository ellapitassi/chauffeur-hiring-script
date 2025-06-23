function checkDailyDriverStats(driverId) {
    const UberSheet = SpreadsheetApp.openById('1Y_STyBMkrjny5XXUIfKx7T8BibTMvJJGyF5BeBMujmA');
    const driverStatsSheet = UberSheet.getSheetByName('daily_driver_stats');
    const statsData = driverStatsSheet.getDataRange().getValues();
  
    const matchRow = statsData.find(row => row[1] && row[1].toString().trim() === driverId.trim());
  
    if (!matchRow) {
      return 'PROSPECT';
    } else if (matchRow[2] && matchRow[2].toString().toLowerCase() === 'blacklisted') {
      return 'BLACKLISTED';
    }
  
    return ''; // No special status
  }
  
  function sendRejectionText(driverId, rejection_convo_name, rejection_text) {
    Logger.log(`Attempting to send rejection text for ${driverId}`);
    const massTextTab = CONFIG.sheets.textGeorge;
    const existingRows = massTextTab.getRange("A4:C").getValues();
    
    // 1. Skip if rejection text already sent (same convo)
    if (hasSentSimilarConvo(driverId, rejection_convo_name, existingRows)) {
      logError(driverId, `Skipping rejection text - Rejection already logged or sent for convo ${rejection_convo_name}`)
      return false;
    }
  
    // 2. Skip if driver not in pipeline
    const inPipeline = checkIfDriverIdExistsInCandidatePipeline(driverId);
    if (!inPipeline) {
      logError(driverId, `Skipping rejection — Driver not found in Candidate Pipeline`);
      return false;
    }
  
    // 3. Skip if blacklisted
    const statusNote = checkDailyDriverStats(driverId)
    if (isBlacklisted(statusNote)) {
      logError(driverId, `Skipping prescreen rejection text because driver is blacklisted.`)
      return false;
    }
  
    // 4. Add row to TEXT GEORGE
    massTextTab.appendRow([
      driverId,
      rejection_text,
      rejection_convo_name,
      statusNote
    ]);
    // NEW
    SpreadsheetApp.flush(); // Forces all pending changes to be written before continuing
    Utilities.sleep(5000);   // <-- Optional but helps for race conditions

    // 5. Attempt to send
    const sent = sendText(driverId);
    if (sent) {
      logError(driverId, `Rejection text sent`)
      updateCandidateRowSentText(driverId, "REJECT")
      return true;
    } else {
      logError(driverId, `Failed to send rejection text`)
      return false;
    }
  }
  
  // used to send calendly text right now
  function shouldSendText(driverId, inCandidatePipeline, isDuplicate, statusNote) {
    if (!inCandidatePipeline) return false;
    if (isDuplicate) {
      Logger.log(`Skipping ${driverId} — duplicate`);
      return false;
    }
    if (isBlacklisted(statusNote)) {
      Logger.log(`⛔ Skipping ${driverId} — blacklisted`);
      return false;
    }
    return true;
  }
  
  function appendMassTextRow(driverId, statusNote) {
    const sheet = CONFIG.sheets.textGeorge;
    const lastRow = sheet.getLastRow() + 1;
    const uniqueId = `${driverId}_${Date.now()}`;
    sheet.appendRow([
      driverId,
      CONFIG.texts.interviewTextToSend,
      CONFIG.convoNames.interviewText,
      statusNote, // col F,
      uniqueId
    ]);
    return uniqueId;
  }
  
  function checkIfDriverIdExistsInCandidatePipeline(driverId) {
    const candidatePipeline = CONFIG.sheets.candidatePipeline;
    const data = candidatePipeline.getRange("J2:J").getValues().flat();
    const rowIndex = data.findIndex(id => id && id.toString().trim() === driverId.trim());
  
    if (rowIndex === -1) {
      logError(driverId,"Filled out form but is missing from Candidate Pipeline Tab" )
      return false;
    }
    return true;
  }
  
  function hasSentSimilarConvo(driverId, convoName, rows) {
    const baseConvo = convoName.split('_').slice(0, -1).join('_');
    return rows.some(row => {
      const existingId = row[0]?.toString().trim();
      const existingConvo = row[2]?.toString().trim();
      const existingBase = existingConvo?.split('_').slice(0, -1).join('_');
      return existingId === driverId && existingBase === baseConvo;
    });
  }

  function getSentTextRows(sentTextsSheetOverride = null) {
    const sheet = sentTextsSheetOverride || CONFIG.sheets.sentTexts;
    const lastRow = sheet.getLastRow();
    Logger.log(`🧪 sentTexts lastRow: ${lastRow}`);
    if (lastRow > 3) {
      const values = sheet.getRange(4, 1, lastRow - 3, 4).getValues();
      Logger.log(`🧪 sentTexts first row: ${JSON.stringify(values[0])}`);
      return values;
    }
    return [];
  }
  
  function formatInChicagoTime(isoString) {
    const date = new Date(isoString);
    return Utilities.formatDate(date, 'America/Chicago', 'MM/dd/yyyy h:mm a');
  }

  function alreadyTextedConvo(driverId, convoName, sentTextRows) {
    const baseConvo = convoName.split('_').slice(0, -1).join('_');
    return sentTextRows.some(row => {
      const existingId = row[1]?.toString().trim();    // Column B = driverId
      const existingConvo = row[2]?.toString().trim(); // Column C = convo_name
      const existingBase = existingConvo?.split('_').slice(0, -1).join('_');
      Logger.log(`existingBase: ${existingBase}, baseConvo ${baseConvo}`)
      return existingId === driverId && existingBase === baseConvo;
    });
  }



  function getFormattedESTTimestamp() {
    const now = new Date();
    const formatted = Utilities.formatDate(now, "America/New_York", "yyyy-MM-dd HH:mm:ss");
    return `${formatted} EST`;
  }