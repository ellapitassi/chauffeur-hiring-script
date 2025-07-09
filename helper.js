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

function getFormattedESTTimestamp() {
  const now = new Date();
  const formatted = Utilities.formatDate(now, "America/New_York", "yyyy-MM-dd HH:mm:ss");
  return `${formatted} EST`;
}