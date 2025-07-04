function updateOutreachDatesAndPrescreen(driverId, pipelineOverride = null) {
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

  // maybe unecessary check
    const interviewStatus = candidatePipeline.getRange(targetRow, 24).getValue();
  if (interviewStatus && interviewStatus.toString().trim() !== "") {
    throw new Error(`❌ Interview Status (X) should be blank before updating outreach dates!`);
  }

  // ✅ Always update both Outreach Dates - to today
  const today = makeSafeSheetDate(new Date());
  candidatePipeline.getRange(targetRow, 17).setValue(today); // Col Q - First Outreach
  candidatePipeline.getRange(targetRow, 18).setValue(today); // Col R - Latest Outreach

  // Read Master Status
  const masterStatus = candidatePipeline.getRange(targetRow, 2).getValue()?.toString().trim();

  // Skip if Rejected
  if (masterStatus === "Rejected" || masterStatus === "Blacklisted") {
    Logger.log(`⚠️ Updated outreach dates, and has License for Driver ID, but skipped updating prescreen to pending for ${driverId} — already ${masterStatus}`);
    return false;
  } else {
    // ✅ Set Prescreen Result to Pending
    candidatePipeline.getRange(targetRow, 23).setValue("Pending"); // Col W
    Logger.log(`✅ Updated outreach dates, Prescreen Result, and Has License for Driver ID ${driverId}`);
  }
  return true;
}


// oLD
function updateCandidateAfterText(driverId, status, hasLicense = null, sheetOverride = null) {
  logError("in updateCandidateAfterText", status)
  const candidatePipeline = sheetOverride || CONFIG.sheets.candidatePipeline;

  // 🟠 Adjusted to start at row 4 to skip header
  // read driver ID
  const data = candidatePipeline
    .getRange(4, 10, candidatePipeline.getLastRow() - 3)
    .getValues().flat();
    // finds matching row
  const rowIndex = data.findIndex(id => id && id.toString().trim() === driverId.trim());

  if (rowIndex === -1) {
    Logger.log(`Driver ID ${driverId} not found.`);
    return;
  }

  // 🟠 Map to correct absolute row in sheet
  const targetRow = rowIndex + 4;
  
  // Outreach dates
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "M/d/yyyy");
  candidatePipeline.getRange(targetRow, 17).setValue(makeSafeSheetDate(today)); // Column Q
  candidatePipeline.getRange(targetRow, 18).setValue(makeSafeSheetDate(today)); // Column R

  if (status === "REJECT") {
    candidatePipeline.getRange(targetRow, 23).setValue("Fail");    // Col W
    candidatePipeline.getRange(targetRow, 2).setValue("Rejected"); // Col B
  } else if (status === "PASS") {
    candidatePipeline.getRange(targetRow, 2).setValue("Pending"); // ✅ Col B
    candidatePipeline.getRange(targetRow, 23).setValue("Pass");    // Col W
    candidatePipeline.getRange(targetRow, 24).setValue("Invited"); // Col X
    candidatePipeline.getRange(targetRow, 25).setValue("Calendly");// Col Y
  }

  if (hasLicense !== null) {
    candidatePipeline.getRange(targetRow, 3).setValue(hasLicense ? "YES" : "NO");
    logError(`License status for ${driverId}: ${hasLicense}`);
  }

  logError(`✅ Updated candidate pipeline row ${targetRow} for Driver ID ${driverId}`);
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
      candidatePipeline.getRange(targetRow, targetCol).setValue(dateTime); // NEED TIME HERE SO WONT USE makeSafeSheetDate
    } else if (type === "canceled") {
      candidatePipeline.getRange(targetRow, targetCol).setValue("Cancelled");
    }
  
    Logger.log(`Updated interview status for email ${email} to ${type}`);
}