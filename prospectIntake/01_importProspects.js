function handleNewProspects(
    prospectsOverride = null,
    candidatePipelineOverride = null,
    textGeorgeOverride = null,
    sentTextsOverride = null
  ) {
    const { prospects, candidatePipeline, textGeorge, sentTexts } = getSheets();
  
    const prospectsSheet = prospectsOverride || prospects;
    const candidatePipelineSheet = candidatePipelineOverride || candidatePipeline;
    const textGeorgeSheet = textGeorgeOverride || textGeorge;
    const sentTextsSheet = sentTextsOverride || sentTexts;
  
    // Define these once for BOTH modes
    let completeRows = [];
    let prospectRowsToDelete = [];
  
    // --------------------------------
    // NORMAL (non-test) enrichment path
    // --------------------------------
    if (!FLAGS.IN_TEST_MODE) {
      const lastRow = prospectsSheet.getLastRow();
      const lastCol = prospectsSheet.getLastColumn();
      const data = prospectsSheet.getRange(4, 1, lastRow - 3, lastCol).getValues();
      const rowsToCheck = [];
  
      // Step 1: Mark missing IDs
      data.forEach((row, idx) => {
        const driverId = row[13];
        if (!driverId) {
          const rowNum = idx + 4;
          rowsToCheck.push(rowNum);
          prospectsSheet.getRange(rowNum, 13).setValue("CHI");
        }
      });
  
      if (rowsToCheck.length === 0) {
        Logger.log("No new rows to process. Exiting.");
        return;
      }
  
      // Step 2-3: External enrichment
      triggerGeorgeReport();
      waitForDriverIDs(prospectsSheet, rowsToCheck);
  
      // Step 4: Re-fetch enriched
      const refreshedData = prospectsSheet.getRange(4, 1, lastRow - 3, lastCol).getValues();
  
      // Step 5: Filter valid enriched rows
      refreshedData.forEach((row, idx) => {
        const driverId = row[13];
        const colX = row[23];
        if (driverId && String(driverId).trim() !== "" && colX && String(colX).trim() !== "") {
          if (isValidDriverId(colX)) {
            completeRows.push(row);
            prospectRowsToDelete.push(idx + 4);
          } else {
            logDetailedError({
              driverId: driverId || "Unknown",
              message: "Skipped row: invalid Driver ID in column X",
              context: "handleNewProspects",
              details: `Invalid colX="${colX}"`
            });
          }
        }
      });
  
    } else {
      Logger.log("⚠️ IN TEST MODE: Skipping enrichment / waitForDriverIDs");
      // In test mode, expect test sheet already has usable rows in place:
      const lastRow = prospectsSheet.getLastRow();
      const lastCol = prospectsSheet.getLastColumn();
      completeRows = prospectsSheet.getRange(4, 1, lastRow - 3, lastCol).getValues();
      // Just delete all of them after
      prospectRowsToDelete = completeRows.map((_, idx) => idx + 4);
    }
  
    // --------------------------------
    // Append and process
    // --------------------------------
    try {
      appendToCandidatePipelineFromProspects(completeRows, candidatePipelineSheet);
      sendAllTexts(textGeorgeSheet);
      if (!FLAGS.IN_TEST_MODE) {
        Utilities.sleep(10000);
      }
      processSentTexts(textGeorgeSheet, sentTextsSheet);
  
      if (!FLAGS.ENABLE_TEXTING) {
        logError("didn't process SENT TEXTS since FLAGS.ENABLE_TEXTING = false");
      }
  
      logError(`Deleting these rows from PROSPECTS: ${prospectRowsToDelete}`);
      deleteProspectsRows(prospectRowsToDelete);
  
      logError("DONE RUNNING handleNewProspects");
  
    } catch (e) {
      logDetailedError({
        message: "Unhandled error in handleNewProspects",
        context: "handleNewProspects",
        details: e.stack || e.message
      });
    }
  }

// getting driverIds
function triggerGeorgeReport() {
    const url = "https://george-api-production.drivesally.com/api/reports/run_report?report=create_prospects_report&key=george";
    try {
        const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        const code = response.getResponseCode();
        
        if (code !== 200) {
            Logger.log("George report call failed. Status: " + code + " | Response: " + response.getContentText());
        } else {
            Logger.log("George report successfully triggered.");
        }
    } catch (error) {
        logDetailedError({
            message: "Error triggering George report",
            context: "triggerGeorgeReport",
            details: error.stack || ""
        });
    }
}

function waitForDriverIDs(prospectsSheet, rowsToCheck, timeoutMs = 3 * 60 * 1000, checkIntervalMs = 5000) {
    const startTime = new Date().getTime();
  
    while (true) {
      const now = new Date().getTime();
      if (now - startTime > timeoutMs) {
        logDetailedError({
          message: "Timeout: DRIVER ID and column X did not populate within 5 minutes.",
          context: "waitForDriverIDs",
          details: `Rows still waiting: ${rowsToCheck.join(", ")}`
        });
        break;
      }
  
      SpreadsheetApp.flush();
  
      const allFilled = rowsToCheck.every(rowNum => {
        const driverId = prospectsSheet.getRange(rowNum, 14).getValue();  // Column N
        const colX = prospectsSheet.getRange(rowNum, 24).getValue();      // Column X
  
        Logger.log(`Row ${rowNum} — Driver ID: "${driverId}", Column X: "${colX}"`);
  
        return (
          driverId && String(driverId).trim() !== "" &&
          colX && String(colX).trim() !== ""
        );
      });
  
      if (allFilled) {
        Logger.log("All rows have Driver ID and column X filled. Proceeding.");
        break;
      }
  
      Logger.log("⏳ Waiting for both Driver ID and column X to populate...");
      Utilities.sleep(checkIntervalMs);
    }
}

function deleteProspectsRows(rowsToCheck, tempProspectsSheet = null) {
    logError("in deleteProspectsRows")
      const { prospects } = getSheets()
      const prospectsSheet = tempProspectsSheet || prospects
    
      // Delete bottom-to-top
      for (let i = rowsToCheck.length - 1; i >= 0; i--) {
        prospectsSheet.deleteRow(rowsToCheck[i]);
      }
    
      Logger.log(`🗑️ Deleted ${rowsToCheck.length} rows from PROSPECTS.`);
}