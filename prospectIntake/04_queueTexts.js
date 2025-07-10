function queueTextRow(textGeorgeSheet, driverId, text, convoName) {
    textGeorgeSheet.appendRow([driverId, text, convoName]);
    SpreadsheetApp.flush();
    const lastRow = textGeorgeSheet.getLastRow();
    const newValues = textGeorgeSheet.getRange(lastRow, 1, 1, 3).getValues();
}

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

function hasSentSimilarConvo(driverId, convoName, rows) {
    const baseConvo = convoName.split('_').slice(0, -1).join('_');
    return rows.some(row => {
      const existingId = row[0]?.toString().trim();
      const existingConvo = row[2]?.toString().trim();
      const existingBase = existingConvo?.split('_').slice(0, -1).join('_');
      return existingId === driverId && existingBase === baseConvo;
    });
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

function getBaseConvo(name) {
    if (typeof name !== "string") return "";
    const parts = name.split('_');
    return parts.slice(0, -1).join('_'); // all but the last part
}

function isGeorgeQueueEmpty(textSheetOverride = null) {
    const sheet = textSheetOverride || CONFIG.sheets.textGeorge;
    const lastRow = sheet.getLastRow();
    if (lastRow <= 3) return true;
  
    const data = sheet.getRange(4, 1, lastRow - 3, 4).getValues();
    return data.every(row => !row[0] || row[3] === "TO BE REMOVED");
  }
  