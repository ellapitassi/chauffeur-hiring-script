function processNewCandidatesFromRows(startRow, rowCount, sheetOverride = null, textSheetOverride = null, sentTextsSheetOverride = null) {
  const candidatePipeline = sheetOverride || getSheets().candidatePipeline;
  const sentTextRows = getSentTextRows(sentTextsSheetOverride);
  const today = Utilities.formatDate(new Date(), "America/Chicago", "MM/dd/yyyy");
  const rows = candidatePipeline.getRange(startRow, 1, rowCount, candidatePipeline.getLastColumn()).getValues();

  const COL = {
    STATUS: 1,              // B
    DRIVER_ID: 9,           // J
    OVERRIDE: 14,           // O
    PASS_FAIL: 15,          // P
    FIRST_OUTREACH: 16,     // Q
    LATEST_OUTREACH: 17,    // R
    PRESCREEN_RESULTS: 22,  // W
    NOTES: 27               // AA
  };

  const groupedQueue = new Map();

  rows.forEach((row, i) => {
    const offset = startRow + i;
    const driverId = row[COL.DRIVER_ID];
    Logger.log(`driverId: ${driverId}`)
    if (!driverId || driverId.toString().trim() === "") return;
    const passFail = row[COL.PASS_FAIL];
    const override = row[COL.OVERRIDE];
    const existingNotes = row[COL.NOTES] || "";
    const statusNote = checkDailyDriverStats(driverId);

    if (isBlacklisted(statusNote)) {
      candidatePipeline.getRange(offset, COL.STATUS + 1).setValue("Rejected");
      candidatePipeline.getRange(offset, COL.NOTES + 1).setValue("BLACKLISTED. " + existingNotes);
      setOutreachDates(candidatePipeline, offset, COL.FIRST_OUTREACH, COL.LATEST_OUTREACH, today)
      if (isSafeToQueueText(driverId, CONFIG.texts.blacklistReject, CONFIG.convoNames.blacklist_reject, textSheetOverride, sentTextsSheetOverride)) {
        addToGroupedQueue(groupedQueue, driverId, CONFIG.texts.blacklistReject, CONFIG.convoNames.blacklist_reject);
      }
      return;
    }

    if (passFail === "Fail") {
      candidatePipeline.getRange(offset, COL.STATUS + 1).setValue("Rejected");
      setOutreachDates(candidatePipeline, offset, COL.FIRST_OUTREACH, COL.LATEST_OUTREACH, today)
      if (isSafeToQueueText(driverId, CONFIG.texts.baseCriteriaRejectText, CONFIG.convoNames.initial_criteria_reject, textSheetOverride, sentTextsSheetOverride)) {
        addToGroupedQueue(groupedQueue, driverId, CONFIG.texts.baseCriteriaRejectText, CONFIG.convoNames.initial_criteria_reject);
      }
      return;
    }

    const isOverrideFail = String(override || "").toLowerCase().includes("fail");

    if (passFail === "Pass" && isOverrideFail) {
      // Treat override fail as rejection
      candidatePipeline.getRange(offset, COL.STATUS + 1).setValue("Rejected");
      setOutreachDates(candidatePipeline, offset, COL.FIRST_OUTREACH, COL.LATEST_OUTREACH, today)
      if (isSafeToQueueText(driverId, CONFIG.texts.baseCriteriaRejectText, CONFIG.convoNames.initial_criteria_reject, textSheetOverride, sentTextsSheetOverride)) {
        addToGroupedQueue(groupedQueue, driverId, CONFIG.texts.baseCriteriaRejectText, CONFIG.convoNames.initial_criteria_reject);
      }
      return;
    }

    if (passFail === "Pass" && !isOverrideFail) {
      candidatePipeline.getRange(offset, COL.STATUS + 1).setValue("Pending");
      setOutreachDates(candidatePipeline, offset, COL.FIRST_OUTREACH, COL.LATEST_OUTREACH, today)
      candidatePipeline.getRange(offset, COL.PRESCREEN_RESULTS + 1).setValue("Pending");
      if (isSafeToQueueText(driverId, CONFIG.texts.prescreenFormTextToSend, CONFIG.convoNames.prescreenFormText, textSheetOverride, sentTextsSheetOverride)) {
        addToGroupedQueue(groupedQueue, driverId, CONFIG.texts.prescreenFormTextToSend, CONFIG.convoNames.prescreenFormText);
      }
      return;
    }
  });

  SpreadsheetApp.flush();
  flushGroupedQueue(groupedQueue, textSheetOverride);
  Logger.log(`Finished processing ${rowCount} candidate(s) from row ${startRow}`);
}

function isGeorgeQueueEmpty(textSheetOverride = null) {
  const sheet = textSheetOverride || CONFIG.sheets.textGeorge;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 3) return true;

  const data = sheet.getRange(4, 1, lastRow - 3, 4).getValues();
  return data.every(row => !row[0] || row[3] === "TO BE REMOVED");
}

function writeToTextGeorge(driverIds, message, convoName, textSheetOverride = null) {
  const sheet = textSheetOverride || CONFIG.sheets.textGeorge;
  const unique = [...new Set(driverIds)];
  unique.forEach(driverId => {
    sheet.appendRow([driverId, message, convoName]);
  });
  Logger.log(`✍️ Wrote ${unique.length} messages to textGeorge for convo: ${convoName}`);
}

function testProcessNewCandidates() {
  console.log("3. testing testProcessNewCandidates")
  const startRow = 1312;
  const rowCount = 3;

  if (startRow < 2 || rowCount < 1) {
    Logger.log("⚠️ Invalid startRow or rowCount");
    return;
  }

  processNewCandidatesFromRows(startRow, rowCount);
}

function testProcessRow1329() {
  Logger.log("🧪 Manually testing processNewCandidatesFromRows on row 1329");
  processNewCandidatesFromRows(1329, 1);
}


function runPrescreenFollowUp(sheet = null) {
  const activeSheet = sheet || CONFIG.sheets.candidatePipeline;
  const lastRow = activeSheet.getLastRow();
  const data = activeSheet.getRange(4, 1, lastRow - 3, 39).getValues(); // A–AM

  const today = new Date();
  const todayFormatted = Utilities.formatDate(today, "America/Chicago", "MM/dd/yyyy");
  const daysSinceLastOutreach = 4;

  data.forEach((row, idx) => {
    const rowNum = idx + 4;
    const status = row[22];        // Col W
    const lastOutreach = row[17];  // Col R
    const rawAttempts = row[38];   // Col AM
    const extraAttempts = typeof rawAttempts === "number" ? rawAttempts : 0;
    const driverId = row[9];       // Col J
    const statusNote = row[26];    // Col AA

    if (isBlacklisted(statusNote)) {
      Logger.log(`[Row ${rowNum}] 🚫 Skipping ${driverId} — blacklisted`);
      return;
    }

    const tooOld = lastOutreach && new Date(lastOutreach).getTime() < today.getTime() - daysSinceLastOutreach * 86400000;

    if (status === "Pending" && driverId && lastOutreach && tooOld) {
      if (extraAttempts === 0) {
        queueText(driverId, CONFIG.texts.prescreenSecondOutreach, CONFIG.convoNames.prescreenSecondOutreach);
        activeSheet.getRange(rowNum, 18).setValue(todayFormatted);      // Col R
        activeSheet.getRange(rowNum, 39).setValue(1);                   // Col AM
        Logger.log(`[Row ${rowNum}] 📨 Sent 2nd message (1st follow-up) to ${driverId}`);
      } else if (extraAttempts === 1) {
        queueText(driverId, CONFIG.texts.prescreenThirdOutreach, CONFIG.convoNames.prescreenThirdOutreach);
        activeSheet.getRange(rowNum, 18).setValue(todayFormatted);      // Col R
        activeSheet.getRange(rowNum, 39).setValue(2);                   // Col AM
        activeSheet.getRange(rowNum, 23).setValue("Abandoned");         // Col W
        Logger.log(`[Row ${rowNum}] 📨 Sent final message and marked ${driverId} as Abandoned`);
      } else if (extraAttempts >= 2) {
        Logger.log(`[Row ${rowNum}] 🚫 Skipping ${driverId} — already sent final message (AM = ${extraAttempts})`);
      }
    } else {
      Logger.log(`[Row ${rowNum}] ⛔ Skipping — Reasons:`);
      if (status !== "Pending") Logger.log(`   ❌ Status is not 'Pending': ${status}`);
      if (!driverId) Logger.log(`   ❌ Missing driverId`);
      if (!lastOutreach) Logger.log(`   ❌ Missing lastOutreach`);
      if (!tooOld) Logger.log(`   ❌ lastOutreach not older than ${daysSinceLastOutreach} days`);
    }
  });

  Logger.log("✅ Prescreen follow-up run complete.");
}