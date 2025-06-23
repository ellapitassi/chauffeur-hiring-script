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
//   "Hello!|||Intro_form" => [
//     { driverId: "123", rowIdx: undefined },
//     { driverId: "456", rowIdx: undefined }
//   ],
//   "Different message|||Reject_form" => [
//     { driverId: "789", rowIdx: undefined }
//   ]
// }
function addToGroupedQueue(queue, driverId, text, convoName, rowIdx) {
  const key = `${text}|||${convoName}`;
  const entry = { driverId, rowIdx };

  if (!queue.has(key)) {
    queue.set(key, []);
  }
  queue.get(key).push(entry);
}

// loops through each map, and transforms it into rows for the TEXT GEORGE sheet
// adds convo and text just to row 4
// adds all groups so not sure this is useful!!!!!
// function flushGroupedQueue(queueMap, textGeorgeSheetOverride = null) {
//     const sheet = textGeorgeSheetOverride || CONFIG.sheets.textGeorge;
  
//     queueMap.forEach((driverIds, key) => {
//       const [text, convoName] = key.split("|||");
  
//       const rows = driverIds.map((id, idx) =>
//         idx === 0 ? [id, text, convoName] : [id, "", ""]
//       );
  
//       Logger.log(`📦 Preparing to write ${driverIds.length} driver(s) for key: ${key}`);
//       Logger.log(`📝 Rows to write: ${JSON.stringify(rows)}`);
  
//       if (rows.length > 0) {
//         sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 3).setValues(rows);
//         Logger.log(`📤 Queued ${driverIds.length} driver(s) for ${convoName}`);
//       }
//     });
  
//     queueMap.clear();
// }

// Purpose: Writes one group to textGeorge and removes it from the map
function flushSingleGroup(queueMap, textGeorgeSheetOverride = null) {
  Logger.log("****in flushSingleGroup")
  const sheet = textGeorgeSheetOverride || CONFIG.sheets.textGeorge;
  const keys = Array.from(queueMap.keys());

  if (keys.length === 0) {
    logError("❌ No groups left to flush.");
    return null;
  }

  const key = keys[0];
  const [text, convoName] = key.split("|||");
  const entries = queueMap.get(key); // entries = array of driverId strings

  Logger.log(`🧪 flushSingleGroup keys: ${JSON.stringify(keys)}`);
  Logger.log(`🧪 flushSingleGroup entries: ${JSON.stringify(entries)}`);

  if (!entries || entries.length === 0) {
    logError(`⚠️ No entries found for key: ${key}`);
    queueMap.delete(key);
    return null;
  }

  // Format rows for TEXT GEORGE
  const rows = entries.map((entry, idx) =>
    idx === 0 ? [entry.driverId, text, convoName] : [entry.driverId, "", ""]
  );

  const startRow = Math.max(4, sheet.getLastRow() + 1);
  sheet.getRange(startRow, 1, rows.length, 3).setValues(rows);
  logError(`📤 Flushed ${entries.length} driver(s) to TEXT GEORGE for "${convoName}"`);

  // Clean up
  queueMap.delete(key);

  return {
    convoKey: key,
    convoName,
    text,
    entries // array of { driverId, rowIdx }
  };
}

// Purpose: Go through one group at a time → write → wait for cleanup → repeat
function flushQueueOneAtATime(
  queueMap,
  textGeorge = CONFIG.sheets.textGeorge,
  testCleanupHook = null,
  COL,
  today,
  sheet = getSheets().candidatePipeline
) {
  // 🔹 Always log the full queue up front if texting is disabled
  if (!FLAGS.ENABLE_TEXTING) {
    Logger.log("🧪 Texting is disabled. Here is the full queued message map:");
    [...queueMap.entries()].forEach(([key, entries]) => {
      Logger.log(`🔹 ${key} — ${entries.length} recipient(s)`);
      entries.forEach(e => Logger.log(`   • ${e.driverId}`));
    });

    // ⬇️ Also log to the error sheet
    const errorSheet = CONFIG.sheets.errors;
    const timestamp = new Date();
    const logRows = [];

    [...queueMap.entries()].forEach(([key, entries]) => {
      entries.forEach(entry => {
        logRows.push([
          timestamp,
          "🧪 TEST QUEUE",
          `Driver ID: ${entry.driverId}`,
          `Message Key: ${key}`,
          `Row: ${entry.rowIdx}`
        ]);
      });
    });

    if (logRows.length > 0) {
      errorSheet.getRange(errorSheet.getLastRow() + 1, 1, logRows.length, logRows[0].length).setValues(logRows);
    }
  }

  function processNextGroup() {
    const result = flushSingleGroup(queueMap, textGeorge);
    if (!result) {
      Logger.log("✅ All groups processed.");
      return;
    }

    const { convoKey, entries } = result;
    Logger.log(`🚚 Processing group: ${convoKey} — ${entries.length} entries`);

    SpreadsheetApp.flush();

    if (FLAGS.IN_TEST_MODE && testCleanupHook) {
      testCleanupHook(textGeorge);
    } else if (!FLAGS.IN_TEST_MODE && FLAGS.ENABLE_TEXTING) {
      sendAllTexts();
    }

    // Wait for George sheet to be cleared
    let attempts = 0;
    const maxAttempts = 10;
    const interval = 3000;

    const waitAndCheck = () => {
      SpreadsheetApp.flush();
      const numRows = textGeorge.getLastRow() - 3;
      if (numRows <= 0) {
        afterFlushUpdate(entries);
        return processNextGroup();
      }

      const rows = textGeorge.getRange(4, 1, numRows, 4).getValues();
      const anyStillExist = entries.some(entry =>
        rows.some(row => row[0] === entry.driverId)
      );

      if (!anyStillExist) {
        Logger.log(`✅ Group ${convoKey} cleared.`);
        afterFlushUpdate(entries);
        processNextGroup();
      } else if (attempts++ < maxAttempts) {
        Utilities.sleep(interval);
        waitAndCheck();
      } else {
        Logger.log(`❌ Timeout waiting for ${convoKey} to send. Aborting.`);
        logDetailedError({
          message: "Aborted processing — text(s) failed to send.",
          context: convoKey,
          details: `Driver IDs: ${entries.map(e => e.driverId).join(", ")}`
        });
        return;
      }
    };

    waitAndCheck();
  }

  function afterFlushUpdate(entries) {
    entries.forEach(entry => {
      updateCandidateAfterText(entry.driverId, COL, today, entry.rowIdx, sheet);
    });
  }

  processNextGroup();
}

function setOutreachDates(sheet, rowIdx, colFirst, colLast, date) {
  sheet.getRange(rowIdx, colFirst + 1).setValue(date);
  sheet.getRange(rowIdx, colLast + 1).setValue(date);
}

function updateCandidateAfterText(driverId, COL, today, rowIdx, sheet = getSheets().candidatePipeline) {
  if (!rowIdx) {
    logError(`⚠️ updateCandidateAfterText: Missing rowIdx for Driver ID ${driverId}`);
    return false;
  }

  const firstOutreachVal = sheet.getRange(rowIdx, COL.FIRST_OUTREACH + 1).getValue();
  if (!firstOutreachVal || firstOutreachVal.toString().trim() === "") {
    sheet.getRange(rowIdx, COL.FIRST_OUTREACH + 1).setValue(today);
  }

  sheet.getRange(rowIdx, COL.LATEST_OUTREACH + 1).setValue(today);
  return true;
}