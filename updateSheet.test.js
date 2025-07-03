function test_updateOutreachDatesPrescreenAndLicense() {
    Logger.log("✅ Running test_updateOutreachDatesPrescreenAndLicense");
  
    const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
    const tempSheet = ss.insertSheet("Temp_Pipeline_Test");
  
    try {
      // 1️⃣ Setup headers (row 3)
      const headers = new Array(52).fill("");
      headers[1] = "Master Status";     // B
      headers[9] = "Sally ID";          // J
      headers[16] = "First Outreach";   // Q
      headers[17] = "Latest Outreach";  // R
      headers[22] = "Prescreen Result"; // W
      headers[23] = "Interview Status"; // X
      headers[24] = "Source";           // Y
      headers[26] = "Notes";            // AA
  
      tempSheet.getRange(3, 1, 1, headers.length).setValues([headers]);
  
    // 2️⃣ Setup initial row (row 4) — blank X, Y, AA
    const driverId = "DRV_TEST_XYZ";
    const row = new Array(52).fill("");
    row[9] = driverId; // Sally ID (col J)
  
      tempSheet.getRange(4, 1, 1, 52).setValues([row]);
      SpreadsheetApp.flush();
  
      // 3️⃣ Call function
      updateOutreachDatesAndPrescreen(driverId, tempSheet);
      SpreadsheetApp.flush();
  
      // 4️⃣ Check results
      const updated = tempSheet.getRange(4, 1, 1, 52).getValues()[0];
  
      // Outreach dates
      const todaySafe = makeSafeSheetDate(new Date());
      const firstOutreach = makeSafeSheetDate(new Date(updated[16]));
      const latestOutreach = makeSafeSheetDate(new Date(updated[17]));
        
      expectEqual(
        firstOutreach.toDateString(),
        todaySafe.toDateString(),
        "✅ First Outreach set to today"
      );
      expectEqual(
        latestOutreach.toDateString(),
        todaySafe.toDateString(),
        "✅ Latest Outreach set to today"
      );
  
      // Prescreen Result
      expectEqual(updated[22], "Pending", "Prescreen Result set to Pending");
  
      // Should *not* change these
      expectEqual(updated[23], "", "Interview Status blank");
      expectEqual(updated[24], "", "Source (Y) unchanged");
      expectEqual(updated[26], "", "Notes (AA) unchanged");
      expectEqual(updated[1], row[1], "Master Status (B) should stay unchanged");
  
      Logger.log("✅ test_updateOutreachDatesPrescreenAndLicense passed!");
    } finally {
      ss.deleteSheet(tempSheet);
    }
  }


  function test_helper_get_pipeline_headers(tempPipeline) {
    const headers = new Array(52).fill("");
    headers[1] = "Master Status";
    headers[9] = "Sally ID";              // DRIVER_ID (col J)
    headers[14] = "Override";
    headers[15] = "Master Criteria Check"; // PASS_FAIL
    headers[16] = "First Outreach";
    headers[17] = "Latest Outreach Date";
    headers[22] = "Prescreen Results";
    headers[26] = "Notes";                 // for blacklist tag
    tempPipeline.getRange(3, 1, 1, headers.length).setValues([headers]);
    return tempPipeline
  }