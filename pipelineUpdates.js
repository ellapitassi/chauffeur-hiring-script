function writeToTextGeorge(driverIds, message, convoName, textSheetOverride = null) {
  const sheet = textSheetOverride || CONFIG.sheets.textGeorge;
  const unique = [...new Set(driverIds)];
  unique.forEach(driverId => {
    sheet.appendRow([driverId, message, convoName]);
  });
  Logger.log(`✍️ Wrote ${unique.length} messages to textGeorge for convo: ${convoName}`);
}

function testProcessNewCandidates() {
  logError(`IN testProcessNewCandidate`);
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

  Logger.log("Prescreen follow-up run complete.");
}

