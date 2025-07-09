function test_doPost_createsCalendlyLog() {
    Logger.log("Running test_doPost_createsCalendlyLog");

    const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText)
    const tempCalendlySheet = ss.insertSheet("Temp_CalendlyLog");
    tempCalendlySheet.appendRow([
        "Timestamp", "Note", "Name", "Email", "EventName", "StartTime",
        "Location", "EventType", "Full JSON", "Payload JSON", "UniqueKey"
    ]);

    const testPayload = {
      event: "invitee.created",
      payload: {
        email: "testuser@example.com",
        name: "Test User",
        scheduled_event: {
          name: "Interview",
          start_time: "2025-07-10T14:00:00Z",
          location: {
            location: "Zoom Link"
          }
        }
      }
    };
  
    const testEvent = {
      postData: {
        contents: JSON.stringify(testPayload)
      }
    };
  
    // Call your actual webhook handler
    doPost(testEvent, tempCalendlySheet);
    SpreadsheetApp.flush();
  
    const lastRow = tempCalendlySheet.getLastRow();
    Logger.log("Rows in TEMP CALENDLY log: " + lastRow);
  
    ss.deleteSheet(tempCalendlySheet);
  
    Logger.log("test_doPost_createsCalendlyLog COMPLETED!");
}

function test_canAccessCalendlySheet() {
    Logger.log("Running test_canAccessCalendlySheet");
  
    try {
      const sheetsObj = getSheets ? getSheets() : {};
      const calendly = sheetsObj?.calendly;
      if (!calendly) {
        throw new Error("❌ CONFIG.sheets.calendly is undefined or null");
      }
  
      Logger.log("CALENDLY sheet found. Name: " + calendly.getName());
      Logger.log("CALENDLY sheet ID: " + calendly.getSheetId());
      Logger.log("Last row in CALENDLY: " + calendly.getLastRow());
  
      Logger.log("test_canAccessCalendlySheet PASSED!");
    } catch (err) {
      Logger.log("test_canAccessCalendlySheet FAILED: " + err);
      throw err;
    }
}

function test_doPost_savesCalendlyEvent() {
    Logger.log("Running test_doPost_savesCalendlyEvent");
  
    const ss = SpreadsheetApp.openById(CONFIG.sheetIds.formResponses);
    // Create temp sheets
    const tempCalendlySheet = ss.insertSheet("Temp_CALENDLY_Test");
    const tempCandidatePipeline = ss.insertSheet("Temp_CandidatePipeline_Test");
    const tempErrorLog = ss.insertSheet("Temp_ErrorLog_Test");  
    try {
        // Add calendly header row
        tempCalendlySheet.getRange(1, 1, 1, 11).setValues([[
            "TIMESTAMP", "NOTE", "NAME", "EMAIL", "EVENT NAME", "START TIME", "LOCATION", "EVENT TYPE",
            "JSON.stringify(data)", "JSON.stringify(payload)", "uniqueKey"
        ]]);

        // 2️Add CANDIDATE PIPELINE header + test user row
        const pipelineHeaders = new Array(25).fill("HEADER");
        tempCandidatePipeline.getRange(1, 1, 1, 25).setValues([pipelineHeaders]);
        const testEmail = "testuser@example.com";
        const testPipelineRow = new Array(25).fill("");
        testPipelineRow[6] = testEmail; // Column G
        tempCandidatePipeline.getRange(2, 1, 1, 25).setValues([testPipelineRow]);

        // 3️Add ERROR LOG header
        tempErrorLog.getRange(1, 1, 1, 4).setValues([["TIMESTAMP", "MESSAGE", "TYPE", "DETAIL"]]);

        SpreadsheetApp.flush();
    
        // Simulated Calendly webhook payload
        const simulatedPayload = {
            event: "invitee.created",
            payload: {
            email: "testuser@example.com",
            name: "Test User",
            scheduled_event: {
                name: "Drive SALLY Fleet Chauffeur Group Interview",
                start_time: "2025-07-22T19:00:00.000000Z",
                location: {
                location: "1270 S Kostner Ave, Chicago, IL 60623"
                }
            }
            }
        };
    
        // Wrap as a fake e.postData
        const fakeEvent = {
            postData: {
            contents: JSON.stringify(simulatedPayload)
            }
        };
  
        // Call doPost, injecting our temp sheet
        doPost(fakeEvent, tempCalendlySheet, tempCandidatePipeline, tempErrorLog);
        SpreadsheetApp.flush();

        // Verify: check last row for our test email
        const lastRow = tempCalendlySheet.getLastRow();
        const lastRowData = tempCalendlySheet.getRange(lastRow, 1, 1, tempCalendlySheet.getLastColumn()).getValues()[0];
        Logger.log("Last row data: " + JSON.stringify(lastRowData));
  
        const foundEmail = lastRowData[3]; // EMAIL col
        if (foundEmail !== "testuser@example.com") {
            throw new Error(`❌ Expected email testuser@example.com, got ${foundEmail}`);
        }

        const newPipelineRow = tempCandidatePipeline.getLastRow()
        const newPipelineData = tempCandidatePipeline.getRange(newPipelineRow, 1, 1, tempCandidatePipeline.getLastColumn()).getValues()[0];
        const interviewVal = newPipelineData[24];
        const formattedVal = Utilities.formatDate(interviewVal, 'America/Chicago', 'MM/dd/yyyy h:mm a');
        Logger.log("Formatted interview column value: " + formattedVal);
        expectEqual(formattedVal, "07/22/2025 1:00 PM", "Interview date should be updated");

        Logger.log("test_doPost_savesCalendlyEvent PASSED!");
    } finally {
        ss.deleteSheet(tempCalendlySheet);
        ss.deleteSheet(tempCandidatePipeline);
        ss.deleteSheet(tempErrorLog);
    }
}