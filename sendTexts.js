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

