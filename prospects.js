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
        appendToCandidatePipelineFromProspects(completeRows);
        
        // Step 7: Delete the processed rows from PROSPECTS
        deleteProspectsRows(rowsToCheck);
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

function appendToCandidatePipelineFromProspects(rows) {
    const { candidatePipeline } = getSheets();

    // Adjust indices as needed: get columns P–AA from the prospects data
    const startCol = 16; // Column P
    const endCol = 27;   // Column AA
    const slicedRows = rows.map(row => row.slice(startCol - 1, endCol + 1)); // inclusive of P to AA

    // Find first empty row in column B
    const colBValues = candidatePipeline.getRange(2, 2, candidatePipeline.getLastRow() - 1).getValues();
    let pipelineStartRow = colBValues.findIndex(row => !row[0] || row[0].toString().trim() === "");
    pipelineStartRow = pipelineStartRow === -1 ? candidatePipeline.getLastRow() + 1 : pipelineStartRow + 2;

    Logger.log("First row to paste: " + JSON.stringify(slicedRows[0]));
    Logger.log("Number of columns: " + slicedRows[0].length);

    // Write into columns B to M
    candidatePipeline.getRange(pipelineStartRow, 2, slicedRows.length, slicedRows[0].length).setValues(slicedRows);
    Logger.log(`✅ Appended ${slicedRows.length} rows to Candidate Pipeline from PROSPECTS.`);

    // Process the new candidates immediately after adding
    processNewCandidatesFromRows(pipelineStartRow, slicedRows.length);
}

function deleteProspectsRows(rowsToCheck) {
    const { prospects } = getSheets()
  
    // Delete bottom-to-top
    for (let i = rowsToCheck.length - 1; i >= 0; i--) {
        prospects.deleteRow(rowsToCheck[i]);
    }
  
    Logger.log(`🗑️ Deleted ${rowsToCheck.length} rows from PROSPECTS.`);
}

function testHandleNewProspects() {
    Logger.log("=== Running testHandleNewProspects ===");

    try {
        handleNewProspects(); // Call your real function
        Logger.log("✅ testHandleNewProspects ran without crashing.");
    } catch (e) {
        Logger.log("❌ testHandleNewProspects failed: " + e.message);
    }

    Logger.log("=== Done ===");
}

function doGet() {
    try {
      const output = handleNewProspects();
      return ContentService.createTextOutput(output);
    } catch (e) {
      return ContentService.createTextOutput("❌ Error: " + e.message);
    }
  }

  function testAppendToCandidatePipelineFromProspects() {
    const { candidatePipeline } = getSheets();
  
    // Fake data representing one row from PROSPECTS, columns A to AA (1–27)
    const fakeProspectsRow = [
      "UUID-1234", "2025-06-18T02:29:28.358Z", "Ella", "Pitassi", "ella@example.com", "1234567890",
      4.88, 270, "11 years", "UBER_PRO_STATUS_BLUE", false, false,
      "", "", "", "PENDING", "", "2025-06-18T02:29:28.358Z", "Ella", "Pitassi", "ella@example.com",
      "1234567890", "", "", 4.88, 270, 11
    ];
  
    const testRows = [fakeProspectsRow];
  
    // Run the real function
    appendToCandidatePipelineFromProspects(testRows);
  }