
// 2 Figure out if it’s PASS / FAIL / BLACKLIST / OVERRIDE_FAIL / SKIP 
// Decide text, convoName, statusToSet, noteToAppend.
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
        noteToAppend: "BLACKLISTED."
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

// 3 add one row to TEXT GEORGE
function queueTextRow(textGeorgeSheet, driverId, text, convoName) {
    textGeorgeSheet.appendRow([driverId, text, convoName]);
    SpreadsheetApp.flush();
    const lastRow = textGeorgeSheet.getLastRow();
    const newValues = textGeorgeSheet.getRange(lastRow, 1, 1, 3).getValues();
    logError(`Added Row: ${JSON.stringify(newValues)} to TEXT GEORGE`);
}

// 4 handle one row using helpers
function processSingleCandidateRow({
    row,
    rowIdx,
    textGeorgeSheet,
    sentTextsSheet,
    candidatePipeline,
    COL,
    today,
    checkDriverStatsFn
}) {
    const driverId = row[COL.DRIVER_ID];
    if (!driverId) return;

    const classificationResult = classifyCandidateRow(row, COL, checkDriverStatsFn);
    if (classificationResult.classification === "SKIP") return;

    const {
        text,
        convoName,
        statusToSet,
        noteToAppend
    } = classificationResult;

    if (!isSafeToQueueText(driverId, text, convoName, textGeorgeSheet, sentTextsSheet)) {
        logError(`❌ Duplicate detected for driver ${driverId}. Skipping queue.`);
        return;
    } else {

    queueTextRow(textGeorgeSheet, driverId, text, convoName);
    SpreadsheetApp.flush();

    updateCandidateBeforeText({
        driverId,
        COL,
        date: today,
        rowIdx,
        sheet: candidatePipeline,
        statusToSet,
        noteToAppend
    });
}
}

// 5 loop over all rows
function processNewCandidatesFromRows(
    startRow,
    rowCount,
    sheetOverride = null,
    textSheetOverride = null,
    sentTextsSheetOverride = null,
    checkDriverStatsFn = checkDailyDriverStats
) {
    const candidatePipeline = sheetOverride || CONFIG.sheets.candidatePipeline;
    const textGeorgeSheet = textSheetOverride || CONFIG.sheets.textGeorge;
    const sentTextsSheet = sentTextsSheetOverride || CONFIG.sheets.sentTexts;
    const outreachDate = makeSafeSheetDate(new Date());

    const COL = {
        STATUS: 1,              
        DRIVER_ID: 9,           
        OVERRIDE: 14,           
        PASS_FAIL: 15,          
        FIRST_OUTREACH: 16,     
        LATEST_OUTREACH: 17,    
        PRESCREEN_RESULTS: 22,  
        NOTES: 27               
    };
    // get candidate rows
    const rows = sheet.getRange(startRow, 1, rowCount, sheet.getLastColumn()).getValues();

    rows.forEach((row, i) => {
        const rowIdx = startRow + i;
        processSingleCandidateRow({
            row,
            rowIdx,
            textGeorgeSheet,
            sentTextsSheet,
            candidatePipeline,
            COL,
            today: outreachDate,
            checkDriverStatsFn
        });
    });

    Logger.log(`✅ Finished processing ${rowCount} candidate(s) from row ${startRow}`);
}