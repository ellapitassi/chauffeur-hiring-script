// Looks in TEXT GEORGE & SENT TEXT, if text exists in either, we log error, return false else return true
function isSafeToQueueText(driverId, text, convoName, textSheetOverride = null, sentTextsSheetOverride = null) {
    if (!driverId || !text || !convoName) {
        logDetailedError({
          driverId,
          message: "ERROR: Missing data for queuing text",
          context: "isSafeToQueueText",
          details: `driverId: ${driverId}, text: ${text}, convoName: ${convoName}`
        });
        return false;
    }
      
    const textGeorgeSheet = textSheetOverride || CONFIG.sheets.textGeorge;
    const sentTextsSheet = sentTextsSheetOverride || CONFIG.sheets.sentTexts;
  
    // 1. Look through queued (unsent) texts in George
    const georgeLastRow = textGeorgeSheet.getLastRow();
    // returns a 2D array of all values, // A: driverId, B: text, C: convoName
    const georgeRows = georgeLastRow > 3
    ? textGeorgeSheet.getRange(4, 1, textGeorgeSheet.getLastRow() - 3, 3).getValues()
    : [];
  
    // 2. Look through sent texts
    const sentLastRow = sentTextsSheet.getLastRow();
    const sentRows = sentLastRow > 3
    ? sentTextsSheet.getRange(4, 2, sentTextsSheet.getLastRow() - 3, 2).getValues() // B (driver), C (convo)
    : []; 
    
    const baseConvo = getBaseConvo(convoName); // Extracts 'Chauffeur_form'
    const inGeorge = georgeRows.some(row =>
        row[0]?.toString().trim() === driverId.toString().trim() &&
        getBaseConvo(row[2]) === baseConvo
      );
      const inSent = sentRows.some(row =>
        row[0]?.toString().trim() === driverId.toString().trim() &&
        getBaseConvo(row[1]) === baseConvo
      );
  
    // 3. If duplicate found, log and skip
    if (inGeorge || inSent) {
        const source = inGeorge ? "TEXT GEORGE" : "SENT TEXT";
        logDetailedError({
            driverId,
            message: "ERROR: Duplicate text detected",
            context: "isSafeToQueueText",
            details: `Already found in ${source}. Text: ${text}, Convo: ${convoName}`
        });
        return false;
    }
  
    // 4. Not a duplicate — return true so the caller can queue it in a group
    Logger.log(`Safe to queue text for ${driverId} — ${convoName}`);
    return true;
}

function setOutreachDates(sheet, rowIdx, colFirst, colLast, date) {
  sheet.getRange(rowIdx, colFirst + 1).setValue(makeSafeSheetDate(date));
  sheet.getRange(rowIdx, colLast + 1).setValue(makeSafeSheetDate(date));
}

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
    logError(`statusToSet in updateCandidateBeforeText: ${statusToSet}`)
    sheet.getRange(rowIdx, COL.STATUS + 1).setValue(statusToSet);
  }

  // 2️⃣ Append to NOTES
  if (noteToAppend) {
    const existingNotes = sheet.getRange(rowIdx, COL.NOTES + 1).getValue() || "";
    sheet.getRange(rowIdx, COL.NOTES + 1).setValue((noteToAppend + " " + existingNotes).trim());
  }
  return true;
}