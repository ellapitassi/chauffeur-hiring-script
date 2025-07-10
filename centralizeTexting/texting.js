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
// function findSendTextRow() {
//     logError("in findSendTextRow")
//     const props = PropertiesService.getScriptProperties();
//     props.setProperty('startTime', new Date().toISOString());
//     // Create a time-based trigger to run every minute
//     ScriptApp.newTrigger('markTextedInGeorgeSheet')
//         .timeBased()
//         .everyMinutes(1)
//         .create();
// }

function deleteTimeBasedTriggersOnly() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getEventType() === ScriptApp.EventType.CLOCK) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  Logger.log("Time-based triggers deleted!");
}


function processSentTexts(textGeorge = CONFIG.sheets.textGeorge, sentTexts = CONFIG.sheets.sentTexts, pipelineOverride) {
  // 1️⃣ Remove *only* matched rows from TEXT GEORGE, get those driver IDs
  const confirmedDriverIds = markTextedInGeorgeSheetOnce(textGeorge, sentTexts);
  if (!confirmedDriverIds || confirmedDriverIds.length === 0) {
    logError("No new sent texts to process");
    return;
  }

  // 2️⃣ Update Candidate Pipeline *only* for these newly sent drivers
  for (const driverId of confirmedDriverIds) {
    updateOutreachDatesAndPrescreen(driverId, pipelineOverride);
  }

  logError(`processSentTexts complete. Updated ${confirmedDriverIds.length} driver(s).`);
}