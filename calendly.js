function doPost(e) {
  let output = ContentService.createTextOutput("OK"); // capture for end return
  const sheet = CONFIG.sheets.calendly;
  const timestamp = new Date();

  try {
    const data = JSON.parse(e.postData.contents);
    // TEMP: Log the full incoming structure
    Logger.log("Full webhook payload:\n" + JSON.stringify(data, null, 2))

    const payload = data.payload || {};
    const eventType = data.event || '';
    const email = payload.email?.trim();

    const name = payload.name || '';
    const scheduledEvent = payload.scheduled_event || {};
    const eventName = scheduledEvent.name || '';
    const startTime = formatInChicagoTime(scheduledEvent.start_time) || '';
    const location = scheduledEvent.location?.location || '';
    const uniqueKey = `${eventType}|${email?.toLowerCase()}|${eventName}|${startTime}`;
    let note = "OK"

    // Check for duplicates based on event type, email, event name, and start time
    const existingKeys = sheet.getRange(2, 12, sheet.getLastRow() - 1, 1).getValues().flat();
    if (existingKeys.includes(uniqueKey)) {
      sheet.appendRow([
        JSON.stringify(data, null, 2),
        email,
        "DUP"
            ]);
      return ContentService.createTextOutput("DUPLICATE");
    }

    if (eventType === "invitee.canceled") {
      note = "CANCELLED"
    }

    // candidate pipeline sheet updates
    if (email) {
      if (eventType === "invitee.created" && startTime) {
        updateCandidateRowInterviewStatusByEmail(email, "created", startTime);
      } else if (eventType === "invitee.canceled") {
        updateCandidateRowInterviewStatusByEmail(email, "canceled");
      }
    }

    // Log unhandled events
    if (eventType !== "invitee.created" && eventType !== "invitee.canceled") {
      const errorLog = CONFIG.sheets.errorLog;
      sheet.appendRow([
        timestamp,
        `Unhandled event type: ${eventType}`,
        email || "No email",
        JSON.stringify(payload).slice(0, 500)
      ]);
      Logger.log(`❌ Unhandled event type: ${eventType}`);
    }

    sheet.appendRow([
      timestamp,
      note,
      name,
      email,
      eventName,
      startTime,
      location,
      eventType,
      JSON.stringify(data),
      JSON.stringify(payload),
      uniqueKey
    ]);

    return output;
  } catch (err) {
    sheet.appendRow([timestamp, '❌ ERROR', '', '', '', '', '', '', '', err.toString(), JSON.stringify(data, null, 2), data]);
    logError(email, `Error processing calendly webhook, error: ${err}`)
    return ContentService.createTextOutput("FAIL");
  }
}
