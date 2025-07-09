function sendAllTexts(sheet = CONFIG.sheets.textGeorge) {
    if (!FLAGS.ENABLE_TEXTING) {
      logError("🧪 Texting disabled — simulating send");
  
      // const lastRow = sheet.getLastRow();
      // const numRows = lastRow - 3;
  
      // if (numRows <= 0) {
      //   Logger.log("Nothing to simulate — no rows to process.");
      //   return;
      // }
      // // simulating markTextedInGeorgeSheet/findSendTextRow
      // const range = sheet.getRange(4, 4, numRows); // Col D
      // const toBeRemovedValues = range.getValues().map(() => ["TO BE REMOVED"]);
      // range.setValues(toBeRemovedValues);
  
      // for (let i = lastRow; i >= 4; i--) {
      //   sheet.deleteRow(i);
      // }
  
      return;
    }
  
    // Real texting logic
    const url = `https://george-api-production.drivesally.com/api/reports/run_report/?report=text_lucid_driver_report&key=george`;
    const options = { muteHttpExceptions: true };
  
    try {
      const response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() === 200) {
        logError("📤 George text API triggered successfully.");
        // findSendTextRow(); // This starts the post-send cleanup NEW
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
  logError("Running markTextedInGeorgeSheet cleanup");

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
    
      logError(`Simulated removing all rows from TEXT GEORGE: ${simulatedDriverIds.join(", ")}`);
      return simulatedDriverIds;
  } else {
      const matchedDriverIds = [];

      for (let i = toTextData.length - 1; i >= 3; i--) {
        const georgeDriverId = toTextData[i][0]?.toString().trim();
        const georgeConvo = toTextData[i][2]?.toString().trim();
    
        const georgeBaseConvo = getBaseConvo(georgeConvo);
    
        for (let j = 3; j < sentTextsData.length; j++) {
          const sentDriverId = sentTextsData[j][1]?.toString().trim();
          const sentConvo = sentTextsData[j][2]?.toString().trim();
    
          const sentBaseConvo = getBaseConvo(sentConvo);
    
          if (georgeDriverId === sentDriverId && georgeBaseConvo === sentBaseConvo) {
            textGeorgeSheet.deleteRow(i + 1);
            matchedDriverIds.push(georgeDriverId);
            break;
          }
        }
      }

      if (matchedDriverIds.length > 0) {
        logError(`Removed matched rows from TEXT GEORGE: ${matchedDriverIds.join(", ")}`);
      } else {
        logError("⚠️ No matches found to remove");
      }

      return matchedDriverIds;
  }
}