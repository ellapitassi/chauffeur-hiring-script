function sendAllTexts(sheet = CONFIG.sheets.textGeorge) {
    if (!FLAGS.ENABLE_TEXTING) {
      logError("🧪 Texting disabled — simulating send");
  
      const lastRow = sheet.getLastRow();
      const numRows = lastRow - 3;
  
      if (numRows <= 0) {
        Logger.log("Nothing to simulate — no rows to process.");
        return;
      }
      // simulating markTextedInGeorgeSheet/findSendTextRow
      const range = sheet.getRange(4, 4, numRows); // Col D
      const toBeRemovedValues = range.getValues().map(() => ["TO BE REMOVED"]);
      range.setValues(toBeRemovedValues);
  
      for (let i = lastRow; i >= 4; i--) {
        sheet.deleteRow(i);
      }
  
      return;
    }
  
    // ✅ Real texting logic
    const url = `https://george-api-production.drivesally.com/api/reports/run_report/?report=text_lucid_driver_report&key=george`;
    const options = { muteHttpExceptions: true };
  
    try {
      const response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() === 200) {
        logError("📤 George text API triggered successfully.");
        // findSendTextRow(); // ✅ This starts the post-send cleanup NEW
      } else {
        logError("system", `ERROR: George API failed with status: ${response.getResponseCode()}`);
      }
    } catch (error) {
      logError("system", `ERROR: George API error: ${error}`);
    }
}



function markTextedInGeorgeSheetOnce(
  textGeorgeSheet = CONFIG.sheets.textGeorge,
  sentTextsSheet = CONFIG.sheets.sentTexts
) {
  logError("✅ Running markTextedInGeorgeSheet cleanup");

  const toTextData = textGeorgeSheet.getDataRange().getValues();
  const sentTextsData = sentTextsSheet.getDataRange().getValues();

  if (!FLAGS.ENABLE_TEXTING) {
      logError("⚠️ Texting is disabled — simulating all rows as sent");
      // ⚠️ SAFETY: Only allow deletion if sheet name includes "Temp" (test)
      if (!textGeorgeSheet.getName().includes("Temp")) {
        logError(`⚠️ Safety check FAILED — TEXT GEORGE sheet is not a test sheet! Name: ${textGeorgeSheet.getName()}`);
        return [];
      }

      const simulatedDriverIds = [];
    
      for (let i = toTextData.length - 1; i >= 3; i--) {
        const driverId = toTextData[i][0]?.toString().trim();
        if (driverId) simulatedDriverIds.push(driverId);
        textGeorgeSheet.deleteRow(i + 1);
      }
    
      logError(`✅ Simulated removing all rows from TEXT GEORGE: ${simulatedDriverIds.join(", ")}`);
      return simulatedDriverIds;
  } else {
      const matchedDriverIds = [];

      for (let i = toTextData.length - 1; i >= 3; i--) {
        const georgeDriverId = toTextData[i][0]?.toString().trim();
        const georgeText = toTextData[i][1]?.toString().replace(/\s+/g, ' ').trim();

        for (let j = 3; j < sentTextsData.length; j++) {
          const sentDriverId = sentTextsData[j][1]?.toString().trim();
          const sentText = sentTextsData[j][3]?.toString().replace(/\s+/g, ' ').trim();

          if (georgeDriverId === sentDriverId && georgeText === sentText) {
            textGeorgeSheet.deleteRow(i + 1);
            matchedDriverIds.push(georgeDriverId);
            break;
          }
        }
      }

      if (matchedDriverIds.length > 0) {
        logError(`✅ Removed matched rows from TEXT GEORGE: ${matchedDriverIds.join(", ")}`);
      } else {
        logError("⚠️ No matches found to remove");
      }

      return matchedDriverIds;
  }
}
// called by: findSendTextRow
// checks for successfully sent texts and removes them from the queue, if its already in sent it wont send
function markTextedInGeorgeSheet(
    textGeorgeSheet = CONFIG.sheets.textGeorge, 
    sentTextsSheet = CONFIG.sheets.sentTexts
) {   
    const props = PropertiesService.getScriptProperties();
    let callCount = parseInt(props.getProperty('callCount') || '0', 10);
    if (isNaN(callCount)) callCount = 0;
    callCount++;
    props.setProperty('callCount', callCount.toString());
    Logger.log(`markTextedInGeorgeSheet called ${callCount} time(s)`);
  
    const startTimeStr = props.getProperty('startTime');
    if (startTimeStr) {
      const elapsedMinutes = (new Date() - new Date(startTimeStr)) / 60000;
      if (elapsedMinutes > 5) {
        //stop the repeating trigger and remove the stored startTime. Then exit early.
        logError("5 minutes passed. No match found. Stopping trigger.");
        deleteThisTrigger('markTextedInGeorgeSheet');
        props.deleteProperty('startTime');
        return;
      }
    }
  
    const toTextData = textGeorgeSheet.getDataRange().getValues();
    const sentTextsData = sentTextsSheet.getDataRange().getValues();
  
    let anyMatchFound = false;
  
    for (let i = toTextData.length - 1; i >= 3; i--) {
      // Extract and trim the driver ID and message. matchFound tracks whether this row got deleted.
      const georgeDriverId = toTextData[i][0]?.toString().trim();
      const georgeText = toTextData[i][1]?.toString().replace(/\s+/g, ' ').trim();
      let matchFound = false;
  
      for (let j = 3; j < sentTextsData.length; j++) {
        const sentDriverId = sentTextsData[j][1]?.toString().trim();
        const sentText = sentTextsData[j][3]?.toString().replace(/\s+/g, ' ').trim();
  
        if (georgeDriverId === sentDriverId && georgeText === sentText) {
          // delete, mark flags and break from the inner loop (since match is found)
          textGeorgeSheet.deleteRow(i + 1);
          matchFound = true;
          anyMatchFound = true;
          break;
        }
      }
  
      if (!matchFound) Logger.log(`❌ No match for row ${i + 1}`);
    }
  
    if (anyMatchFound) {
      Logger.log("✅ Match found. Removing time trigger.");
      deleteThisTrigger('markTextedInGeorgeSheet');
    }
}

// Finds and deletes any time-based trigger associated with markTextedInGeorgeSheet
function deleteThisTrigger(name) {
    ScriptApp.getProjectTriggers().forEach(trigger => {
      if (trigger.getHandlerFunction() === name) {
        ScriptApp.deleteTrigger(trigger);
      }
    });
}

// assumes that everything in the sheet is OK to send
// background job that checks if messages in textGeorge have been sent (by comparing to sentTexts).
function findSendTextRow() {
    logError("in findSendTextRow")
    const props = PropertiesService.getScriptProperties();
    props.setProperty('startTime', new Date().toISOString());
    // Create a time-based trigger to run every minute
    ScriptApp.newTrigger('markTextedInGeorgeSheet')
        .timeBased()
        .everyMinutes(1)
        .create();
}


function processSentTexts(textGeorge = CONFIG.sheets.textGeorge, sentTexts = CONFIG.sheets.sentTexts, pipelineOverride) {
  logError("in processSentTexts")

  // 1️⃣ Remove *only* matched rows from TEXT GEORGE, get those driver IDs
  const confirmedDriverIds = markTextedInGeorgeSheetOnce(textGeorge, sentTexts);
  if (!confirmedDriverIds || confirmedDriverIds.length === 0) {
    logError("✅ No new sent texts to process");
    return;
  }

  // 2️⃣ Update Candidate Pipeline *only* for these newly sent drivers
  for (const driverId of confirmedDriverIds) {
    updateOutreachDatesAndPrescreen(driverId, pipelineOverride);
  }

  logError(`✅ processSentTexts complete. Updated ${confirmedDriverIds.length} driver(s).`);
}