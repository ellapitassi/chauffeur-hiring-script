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
    console.log("processSingleCandidateRow")
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

function processNewCandidatesFromRows(
    startRow,
    rowCount,
    sheetOverride = null,
    textSheetOverride = null,
    sentTextsSheetOverride = null,
    checkDriverStatsFn = checkDailyDriverStats
) {
    console.log("processNewCandidatesFromRows")
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
    const rows = candidatePipeline.getRange(startRow, 1, rowCount, candidatePipeline.getLastColumn()).getValues();

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

    Logger.log(`Finished processing ${rowCount} candidate(s) from row ${startRow}`);
}

