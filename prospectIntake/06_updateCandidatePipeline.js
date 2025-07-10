function updateCandidateBeforeText({
    driverId,
    COL,
    date,
    rowIdx,
    sheet = getSheets().candidatePipeline,
    statusToSet,
    noteToAppend
  }) {
    if (!rowIdx) {
      logError(`⚠️ updateCandidateBeforeText: Missing rowIdx for Driver ID ${driverId}`);
      return false;
    }
  
    // 1️⃣ Set STATUS, col 2
    if (statusToSet) {
      sheet.getRange(rowIdx, COL.STATUS + 1).setValue(statusToSet);
    }
  
    // 2️⃣ Append to NOTES
    if (noteToAppend) {
      const existingNotes = sheet.getRange(rowIdx, COL.NOTES + 1).getValue() || "";
      sheet.getRange(rowIdx, COL.NOTES + 1).setValue((noteToAppend + " " + existingNotes).trim());
    }
    return true;
}

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
  
    // Always update both Outreach Dates - to today
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
      Logger.log(`Updated outreach dates, Prescreen Result, and Has License for Driver ID ${driverId}`);
    }
    return true;
}
  