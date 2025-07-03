function getSheets() {
    return CONFIG.sheets;
}
  
function handleNewProspects() {
    const { prospects } = getSheets();

    // Get the last row and column with data
    const lastRow = prospects.getLastRow();       
    const lastCol = prospects.getLastColumn();    

    // Get all data starting from row 4 to the bottom of the sheet
    const dataRange = prospects.getRange(4, 1, lastRow - 3, lastCol);
    const data = dataRange.getValues(); 
    const rowsToCheck = []; // Track row numbers that need to be monitored for Driver ID + Col X
  
    // Step 1: Identify rows missing a Driver ID (Column N, index 13)
    data.forEach((row, idx) => {
    const driverId = row[13]; // Column N
      if (!driverId) {
        const rowNum = idx + 4;
        rowsToCheck.push(rowNum);
        prospects.getRange(rowNum, 13).setValue("CHI"); // Set column M = CHI
      }
    });
  
    if (rowsToCheck.length === 0) {
        Logger.log("No new rows to process. Exiting.");
        return;
    }

    // Step 2: Trigger external script (George) to populate missing data
    triggerGeorgeReport();

    // Step 3: Wait until Driver ID (col N) AND Col X (col 24) are populated
    waitForDriverIDs(prospects, rowsToCheck);
  
    // Step 4: Re-fetch the data after updates
    const refreshedData = prospects.getRange(4, 1, lastRow - 3, lastCol).getValues();

    // Step 5: Filter to rows that now have both required fields filled
    // if driver_id isnt valid do not add to pipeline, log error instead
    const completeRows = [];
    refreshedData.forEach((row, idx) => {
    const driverId = row[13]; // Column N (14)
    const colX = row[23];     // Column X (24)

    if (
        driverId && String(driverId).trim() !== "" &&
        colX && String(colX).trim() !== ""
    ) {
        if (isValidDriverId(colX)) {
            completeRows.push(row);
        } else {
            logDetailedError({
                driverId: driverId || "Unknown",
                message: "Skipped row: invalid Driver ID in column X",
                context: "handleNewProspects",
                details: `Wasn't able to add to Candidate Pipeline from PROSPECTS because colX="${colX}" is not a valid Driver ID.`
            });
        }
    }
    });

    try {
        // Step 6: Copy selected columns (P–AA) to Candidate Pipeline
        // takes enriched Prospects rows and inserts them as structured rows into Candidate Pipeline, ready for tracking.
        appendToCandidatePipelineFromProspects(completeRows);

        // Step 7: Send all queued texts
        sendAllTexts();
        Utilities.sleep(10000);  // wait 10 seconds (adjust if needed)

        // Step 8: Post-send cleanup
        processSentTexts();
        if (!FLAGS.ENABLE_TEXTING) {
          logError("didnt process SENT TEXTS since FLAGS.ENABLE_TEXTING = false")
        }
        
        // Step 9: Delete the processed rows from PROSPECTS
        logError(`deleting..., ${rowsToCheck}` )
        deleteProspectsRows(rowsToCheck);
        logError("DONE RUNNING handleNewProspects")
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
        Logger.log("✅ All rows have Driver ID and column X filled. Proceeding.");
        break;
      }
  
      Logger.log("⏳ Waiting for both Driver ID and column X to populate...");
      Utilities.sleep(checkIntervalMs);
    }
  }

// Purpose: Copies valid P–AA data from Prospects → Candidate Pipeline, then calls processNewCandidatesFromRows.
function appendToCandidatePipelineFromProspects(rows, candidatePipelineOverride = null) {
  const candidatePipeline = candidatePipelineOverride || getSheets().candidatePipeline;

  // 1️⃣ Slice P–AA columns from PROSPECTS
  const startCol = 16;
  const endCol = 27;
  const slicedRows = rows.map(row => row.slice(startCol - 1, endCol + 1));

  // 2️⃣ Validate: must have driverId in Column X (index 8)
  const validRows = [];
  let skippedCount = 0;

  slicedRows.forEach((row, i) => {
    const driverId = row[8];
    if (driverId && driverId.toString().trim() !== "") {
      validRows.push(row);
    } else {
      skippedCount++;
      logError(`⏭️ Skipped row ${i + 1} — missing driverId in Prospects col X`);
    }
  });

  if (validRows.length === 0) {
    logError(`❌ No valid rows to append — all rows missing driverId.`);
    return;
  }

  // 3️⃣A Remove duplicates within this Prospects batch itself
  const seenInBatch = new Set();
  const dedupedRows = validRows.filter(row => {
    const driverId = row[8]?.toString().trim();
    if (seenInBatch.has(driverId)) {
      logError(`⚠️ Duplicate driverId in Prospects import: ${driverId}. Skipping.`);
      return false;
    }
    seenInBatch.add(driverId);
    return true;
  });

  if (dedupedRows.length === 0) {
    logError(`❌ All rows in Prospects were duplicates of each other.`);
    return;
  }

  // 3️⃣B Remove rows already in Candidate Pipeline
  const existingCount = candidatePipeline.getLastRow() - 3;
  let existingIds = [];
  if (existingCount > 0) {
    existingIds = candidatePipeline
      .getRange(4, 10, existingCount)
      .getValues()
      .flat()
      .map(id => id?.toString().trim());
  }

  const trulyUniqueRows = dedupedRows.filter(row => {
    const driverId = row[8]?.toString().trim();
    return !existingIds.includes(driverId);
  });

  if (trulyUniqueRows.length === 0) {
    logError(`✅ All Prospects rows already exist in Candidate Pipeline. Nothing new to add.`);
    return;
  }

  // 4️⃣ Find next empty row to append
  // Check STATUS (B) and Sally ID (D) from row 4 down
  const lastRow = candidatePipeline.getLastRow();
  const range = candidatePipeline.getRange(4, 2, lastRow - 3, 3); // Columns B–D
  const values = range.getValues();

  // Find first row where both B and D are empty
  let firstEmptyIndex = values.findIndex(r => 
    (!r[0] || r[0].toString().trim() === "") && 
    (!r[2] || r[2].toString().trim() === "")
  );

  const pipelineStartRow = firstEmptyIndex !== -1
    ? firstEmptyIndex + 4
    : lastRow + 1;

  // 5️⃣ Write only unique new rows
  candidatePipeline.getRange(pipelineStartRow, 2, trulyUniqueRows.length, trulyUniqueRows[0].length)
    .setValues(trulyUniqueRows);

  logError(`✅ Appended ${trulyUniqueRows.length} new row(s) to Candidate Pipeline from PROSPECTS.`);
  if (skippedCount > 0) logError(`⏭️ Skipped ${skippedCount} row(s) due to missing driverId.`);

  // 6️⃣ Process only these new rows
  processNewCandidatesFromRows(pipelineStartRow, trulyUniqueRows.length);
}

function deleteProspectsRows(rowsToCheck) {
  logError("in deleteProspectsRows")
    const { prospects } = getSheets()
  
    // Delete bottom-to-top
    for (let i = rowsToCheck.length - 1; i >= 0; i--) {
        prospects.deleteRow(rowsToCheck[i]);
    }
  
    Logger.log(`🗑️ Deleted ${rowsToCheck.length} rows from PROSPECTS.`);
}

function doGet() {
    try {
      const output = handleNewProspects();
      return ContentService.createTextOutput(output);
    } catch (e) {
      return ContentService.createTextOutput("❌ Error: " + e.message);
    }
}