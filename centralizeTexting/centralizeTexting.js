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

// modifying the original map, not a copy!
// Map {
//     "someText|||someConvoName" => ["driverId1", "driverId2", ...],
//     "yo|||Prescreen_2024-07-01": ["789"]
//     ...
//   }
function addToGroupedQueue(queueMap, driverId, text, convoName) {
    const key = `${text}|||${convoName}`;
    if (!queueMap.has(key)) queueMap.set(key, []);
    queueMap.get(key).push(driverId);
}

// loops through each map, and transforms it into rows for the TEXT GEORGE sheet
// adds convo and text just to row 4
function flushGroupedQueue(queueMap, textGeorgeSheetOverride = null) {
    const sheet = textGeorgeSheetOverride || CONFIG.sheets.textGeorge;
  
    queueMap.forEach((driverIds, key) => {
      const [text, convoName] = key.split("|||");
  
      const rows = driverIds.map((id, idx) =>
        idx === 0 ? [id, text, convoName] : [id, "", ""]
      );
  
      Logger.log(`📦 Preparing to write ${driverIds.length} driver(s) for key: ${key}`);
      Logger.log(`📝 Rows to write: ${JSON.stringify(rows)}`);
  
      if (rows.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 3).setValues(rows);
        Logger.log(`📤 Queued ${driverIds.length} driver(s) for ${convoName}`);
      }
    });
  
    queueMap.clear();
}