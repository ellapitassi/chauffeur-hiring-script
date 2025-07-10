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

function getSheets() {
  return CONFIG.sheets;
}

/**
 * Ensures a date is safe for Google Sheets by setting time to noon.
 * Prevents timezone drift issues when formatting.
 * @param {Date} baseDate
 * @return {Date}
 */
function makeSafeSheetDate(baseDate) {
  const d = new Date(baseDate);
  d.setHours(12, 0, 0, 0);
  return d;
}

function makeSafeSheetDateChi(input) {
  let baseDate;
  if (Object.prototype.toString.call(input) === "[object Date]") {
    baseDate = input;
  } else {
    baseDate = new Date(input);
  }

  if (isNaN(baseDate.getTime())) {
    throw new Error(`Invalid date passed to makeSafeSheetDate: ${input}`);
  }

  // Force it to noon local time to avoid DST boundary errors
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 12, 0, 0, 0);
}