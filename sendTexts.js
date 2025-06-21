function sendText(driverId) {
    Logger.log(`in sentText with ${driverId}`)
    const sheet = CONFIG.sheets.textGeorge;

    // 1. Ensure sheet has committed recent changes (from appendRow)
    SpreadsheetApp.flush(); // Force write any pending changes
    Utilities.sleep(3000);  // Buffer to ensure George picks it up

    const existingRows = sheet.getRange("A4:C").getValues();
    const rowToTextExists = existingRows.some(row => row[0] === driverId);
    if (!rowToTextExists) {
        Logger.log(`Skipping text for ${driverId} — no matching row found in TEXT GEORGE. Row must be pre-filled to know what to send.`);
        return false;
    }

    // 2. Pre-calculate the row index in case we need to delete after success
    let rowIndexToDelete = null;
    for (let i = 0; i < existingRows.length; i++) {
        if (existingRows[i][0] === driverId) {
            rowIndexToDelete = i + 4; // A4 offset
            break;
        }
    }

    if (FLAGS.ENABLE_TEXTING) {
        try {
            const url = `https://george-api-production.drivesally.com/api/reports/run_report/?report=text_lucid_driver_report&key=george`;
            Logger.log("Calling George report endpoint..")
            const options = { muteHttpExceptions: true };
            const response = UrlFetchApp.fetch(url, options);
            findSendTextRow();

            const responseCode = response.getResponseCode();

            if (responseCode === 200) {
                Logger.log(`200 received for ${driverId}`);
                return true;
            } else {
                logError(driverId, `Failed to send text, responseCode: ${responseCode}`);
                return false;
            }
        } catch (error) {
            logError(driverId, `Error sending text, error: ${error}`);
            return false;
        }
    } else {
        logError("Flags.Enable_texting is set to false")
    }
}

// checks for successfully sent texts and removes them from the queue
function markTextedInGeorgeSheet() {
    Logger.log("in markTextedInGeorgeSheet")
    // ⏱️ Check if 5 minutes have passed since start
    const props = PropertiesService.getScriptProperties();
    let callCount = parseInt(props.getProperty('callCount') || '0', 5);
    callCount++;
    props.setProperty('callCount', callCount.toString());
    Logger.log(`markTextedInGeorgeSheet called ${callCount} time(s)`);
    const startTimeStr = props.getProperty('startTime');
    if (startTimeStr) {
        const startTime = new Date(startTimeStr);
        const now = new Date();
        const elapsedMinutes = (now - startTime) / 60000;

        if (elapsedMinutes > 5) {
        Logger.log("⏱️ 5 minutes passed. No match found. Stopping trigger.");
        const triggers = ScriptApp.getProjectTriggers();
        triggers.forEach(trigger => {
            if (trigger.getHandlerFunction() === 'markTextedInGeorgeSheet') {
            ScriptApp.deleteTrigger(trigger);
            }
        });
        props.deleteProperty('startTime');
        return; // exit the function
        }
    }

    const textGeorgeSheet = CONFIG.sheets.textGeorge;
    const sentTextsSheet = CONFIG.sheets.sentTexts;
  
    const toTextData = textGeorgeSheet.getDataRange().getValues();
    const sentTextsData = sentTextsSheet.getDataRange().getValues();
  
    let anyMatchFound = false;
    // Start from row 4 to skip headers
    for (let i = 3; i < toTextData.length; i++) {
        const georgeDriverId = toTextData[i][0]?.toString().trim(); // Column A
        const georgeText = toTextData[i][2]?.toString().replace(/\s+/g, ' ').trim(); // Column C
        let matchFound = false;
      
        for (let j = 3; j < sentTextsData.length; j++) { // also starts at row 4
          const sentDriverId = sentTextsData[j][1]?.toString().trim(); // Column B
          const sentText = sentTextsData[j][2]?.toString().replace(/\s+/g, ' ').trim(); // Column C
      
          if (georgeDriverId === sentDriverId && georgeText === sentText) {
            Logger.log(`✅ Match found for ${i + 1}`);
            textGeorgeSheet.getRange(i + 1, 4).setValue("TO BE REMOVED"); // Column D
            textGeorgeSheet.deleteRow(i + 1);
            matchFound = true;
            anyMatchFound = true;
            break;
          }
        }
      
        if (!matchFound) Logger.log(`❌ No match for row ${i + 1}`);
    }
        // If any match was found, remove the trigger
    if (anyMatchFound) {
        Logger.log("✅ Match found. Removing time trigger.");
        const triggers = ScriptApp.getProjectTriggers();
        triggers.forEach(trigger => {
        if (trigger.getHandlerFunction() === 'markTextedInGeorgeSheet') {
            ScriptApp.deleteTrigger(trigger);
        }
        });
    }
}

// background job that checks if messages in textGeorge have been sent (by comparing to sentTexts).
function findSendTextRow() {
    Logger.log("in findSendTextRow")
    const props = PropertiesService.getScriptProperties();
    props.setProperty('startTime', new Date().toISOString());
    // Create a time-based trigger to run every minute
    ScriptApp.newTrigger('markTextedInGeorgeSheet')
        .timeBased()
        .everyMinutes(1)
        .create();
}

function queueText(driverId, message, convoName) {
    if (!FLAGS.ENABLE_TEXTING) {
        Logger.log(`🧪 [DISABLED] Would queue text for ${driverId}: "${text}" (${convoName})`);
        return;
      }
    const textGeorgeSheet = CONFIG.sheets.textGeorge;
  
    if (!driverId || !message) {
      logDetailedError({
        message: "Missing driverId or message for queuing text",
        context: "queueText",
        details: `driverId: ${driverId}, message: ${message}`
      });
      return;
    }
    const existingRows = textGeorgeSheet.getRange("A4:A").getValues().flat();
    if (existingRows.includes(driverId)) {
        logDetailedError({
            driverId,
            message: "Duplicate entry — driverId already exists in TEXT GEORGE",
            context: "queueText",
            details: `Skipped queuing for convo: ${convoName}`
        });
        return;
    }
    
    textGeorgeSheet.appendRow([driverId, message, convoName]);
    Logger.log(`📨 Queued text for ${driverId} — ${convoName}`);
}

function sendAllTexts() {
    const sheet = CONFIG.sheets.textGeorge;
  
    if (!FLAGS.ENABLE_TEXTING) {
      Logger.log("🧪 Texting disabled — simulating send");
  
      const lastRow = sheet.getLastRow();
      if (lastRow > 3) {
        const range = sheet.getRange(4, 4, lastRow - 3); // Col D
        const toBeRemovedValues = range.getValues().map(() => ["TO BE REMOVED"]);
        range.setValues(toBeRemovedValues);
  
        for (let i = lastRow; i >= 4; i--) {
          sheet.deleteRow(i);
        }
      }
  
      return;
    }
  
    // ✅ Real texting logic
    const url = `https://george-api-production.drivesally.com/api/reports/run_report/?report=text_lucid_driver_report&key=george`;
    const options = { muteHttpExceptions: true };
  
    try {
      const response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() === 200) {
        Logger.log("📤 George text API triggered successfully.");
      } else {
        logError("system", `George API failed with status: ${response.getResponseCode()}`);
      }
    } catch (error) {
      logError("system", `George API error: ${error}`);
    }
}
