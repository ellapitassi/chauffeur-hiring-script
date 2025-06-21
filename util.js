function isBlacklisted(statusNote) {
    return statusNote && statusNote.toLowerCase() === 'blacklisted';
}

function isValidDriverId(id) {
    return (
        typeof id === 'string' &&
        id.trim() !== '' &&
        !id.includes('#N/A') &&
        id.includes('_')
    );
}

// adds error in ERROR tab in Uber sheet
function logError(driverIdOrMessage, maybeMessage) {
    const errorsSheet = CONFIG.sheets.errors;
    const timestamp = new Date();
  
    // If only one argument, treat it as a general error (no driver ID)
    const isGeneralError = maybeMessage === undefined;
    const driverId = isGeneralError ? "" : driverIdOrMessage;
    const message = isGeneralError ? driverIdOrMessage : maybeMessage;
  
    Logger.log(`Logged error${driverId ? ` for driverId: ${driverId}` : ""} — ${message}`);
  
    if (errorsSheet) {
      errorsSheet.appendRow([
        timestamp,
        driverId,
        message
      ]);
    }
}

function logDetailedError({ driverId = "", message, context = "", details = "" }) {
    const errorsSheet = CONFIG.sheets.errors;
    const timestamp = new Date();
  
    Logger.log(`⚠️ [${context}] ${message}${driverId ? ` (Driver ID: ${driverId})` : ""}`);
  
    if (errorsSheet) {
      errorsSheet.appendRow([
        timestamp,
        driverId,
        message,
        context,
        details
      ]);
    }
}

// in text sheet
function markTextSent(rowNumber) {
    CONFIG.sheets.textGeorge.getRange(rowNumber, 5).setValue(true);
}

function logDuplicateTextAttempt(driverId, convoName) {
  const sheet = CONFIG.sheets.errors; 
  const now = Utilities.formatDate(new Date(), "America/Chicago", "yyyy-MM-dd HH:mm");
  sheet.appendRow([now, driverId, convoName, "Duplicate text skipped"]);
}