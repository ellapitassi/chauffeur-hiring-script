function updateCandidateRowInterviewStatusByEmail(email, type, dateTime = null, 
  candidatePipelineOverride = null, 
  errorLogOverride = null
) {
  console.log("in updateCandidateRowInterviewStatusByEmail.....")
  const candidatePipeline = candidatePipelineOverride || CONFIG.sheets.candidatePipeline;
  const errorLog = errorLogOverride || CONFIG.sheets.errorLog;
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
  console.log("dateTime", dateTime)
  console.log("formatInChicagoTime(dateTime)", formatInChicagoTime(dateTime))
  if (type === "created" && dateTime) {
    candidatePipeline.getRange(targetRow, targetCol).setValue(dateTime);
  } else if (type === "canceled") {
    candidatePipeline.getRange(targetRow, targetCol).setValue("Cancelled");
  }

  Logger.log(`Updated interview status for email ${email} to ${type}`);
}
