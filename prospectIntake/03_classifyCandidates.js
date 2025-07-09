function classifyCandidateRow(row, COL, checkDriverStatsFn) {
    const driverId = row[COL.DRIVER_ID];
    if (!driverId || driverId.toString().trim() === "") {
        return { classification: "SKIP" };
    }

    const passFail = row[COL.PASS_FAIL];
    const override = row[COL.OVERRIDE];
    const existingNotes = row[COL.NOTES] || "";
    const statusNote = checkDriverStatsFn(driverId);
    const isOverrideFail = String(override || "").toLowerCase().includes("fail");

    if (isBlacklisted(statusNote)) {
        return {
        classification: "BLACKLISTED",
        text: CONFIG.texts.blacklistReject,
        convoName: CONFIG.convoNames.blacklist_reject,
        statusToSet: "Rejected",
        noteToAppend: "BLACKLISTED"
        };
    }

    if (passFail === "Fail" || (passFail === "Pass" && isOverrideFail)) {
        return {
        classification: "FAIL",
        text: CONFIG.texts.baseCriteriaRejectText,
        convoName: CONFIG.convoNames.initial_criteria_reject,
        statusToSet: "Rejected",
        noteToAppend: ""
        };
    }

    if (passFail === "Pass" && !isOverrideFail) {
        return {
        classification: "PASS",
        text: CONFIG.texts.prescreenFormTextToSend,
        convoName: CONFIG.convoNames.prescreenFormText,
        statusToSet: "Pending",
        noteToAppend: ""
        };
    }

    return { classification: "SKIP" };
}

function isBlacklisted(statusNote) {
    return statusNote && statusNote.toLowerCase() === 'blacklisted';
}

function checkDailyDriverStats(driverId) {
    const UberSheet = SpreadsheetApp.openById('1Y_STyBMkrjny5XXUIfKx7T8BibTMvJJGyF5BeBMujmA');
    const driverStatsSheet = UberSheet.getSheetByName('daily_driver_stats');
    const statsData = driverStatsSheet.getDataRange().getValues();
  
    const matchRow = statsData.find(row => row[1] && row[1].toString().trim() === driverId.trim());
  
    if (!matchRow) {
      return 'PROSPECT';
    } else if (matchRow[2] && matchRow[2].toString().toLowerCase() === 'blacklisted') {
      return 'BLACKLISTED';
    }
  
    return ''; // No special status
}