function updateCandidateRowSentText(driverId, status, hasLicense = null) {
    const candidatePipeline = CONFIG.sheets.candidatePipeline;
    const data = candidatePipeline.getRange("J2:J").getValues().flat();
    const rowIndex = data.findIndex(id => id && id.toString().trim() === driverId.trim());
    if (rowIndex === -1) {
      Logger.log(`Driver ID ${driverId} not found.`);
      return;
    }
  
    const targetRow = rowIndex + 2; // Offset for header row and 0-based index
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "M/d/yyyy");
  
    candidatePipeline.getRange(targetRow, 18).setValue(today); // Column R

    if (status === "REJECT") {
      candidatePipeline.getRange(targetRow, 23).setValue("Fail"); // Column W
      candidatePipeline.getRange(targetRow, 2).setValue("Rejected"); // Column B, master status
    } if (status === "PASS") {
      candidatePipeline.getRange(targetRow, 23).setValue("Pass"); // Column W
      candidatePipeline.getRange(targetRow, 24).setValue("Invited"); // Column X
      candidatePipeline.getRange(targetRow, 25).setValue("Calendly"); // Column Y (for now)
    }

      // License update hook
    if (hasLicense !== null) {
      sheet.getRange(row, 3) // colC
          .setValue(hasLicense ? "YES" : "NO");      // Mark license
      Logger.log(`License status for ${driverId}: ${hasLicense}`);
    }

    Logger.log(`Updated candidate pipeline row ${targetRow} for Driver ID ${driverId}`);
}

function updateCandidateRowInterviewStatusByEmail(email, type, dateTime = null) {
    const candidatePipeline = CONFIG.sheets.candidatePipeline;
    const errorLog = CONFIG.sheets.errorLog;
    const emailCol = 7; // Column G
    const targetCol = 25; // Column Y — where interview info goes
  
    const data = candidatePipeline.getRange(2, emailCol, candidatePipeline.getLastRow() - 1).getValues().flat();
    const rowIndex = data.findIndex(e => e && e.toString().trim().toLowerCase() === email.trim().toLowerCase());
  
    if (rowIndex === -1) {
      const timestamp = new Date();
      errorLog.appendRow([timestamp, `Email not found: ${email}`, type, dateTime || ""]);
      Logger.log(`Email ${email} not found in candidate pipeline.`);
      return;
    }
  
    const targetRow = rowIndex + 2;
  
    if (type === "created" && dateTime) {
      candidatePipeline.getRange(targetRow, targetCol).setValue(dateTime);
    } else if (type === "canceled") {
      candidatePipeline.getRange(targetRow, targetCol).setValue("Cancelled");
    }
  
    Logger.log(`Updated interview status for email ${email} to ${type}`);
}