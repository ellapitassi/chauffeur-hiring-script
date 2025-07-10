function doPost(e, calendlySheetOverride = null, candidatePipelineOverride = null, errorLogOverride = null) {
  const sheetsObj = getSheets ? getSheets() : {};
  const calendly = sheetsObj?.calendly;
  const sheet = calendlySheetOverride || calendly;
  let output = ContentService.createTextOutput("OK");
  const pipelineSheet = candidatePipelineOverride || CONFIG.sheets.candidatePipeline;
  const errorLogSheet = errorLogOverride || CONFIG.sheets.errors;

  const timestamp = new Date();

  if (!sheet) {
    logError("❌ No CALENDLY sheet found! Aborting.");
    return ContentService.createTextOutput("FAIL - No CALENDLY sheet found");
  }

  let data = {}
  let email = '';  // define upfront

  try {
    data = JSON.parse(e.postData.contents);
    const payload = data.payload || {};
    const eventType = data.event || '';
    email = payload.email?.trim();

    const name = payload.name || '';
    const scheduledEvent = payload.scheduled_event || {};
    const eventName = scheduledEvent.name || '';
    const startTime = formatInChicagoTime(scheduledEvent.start_time) || '';
    const location = scheduledEvent.location?.location || '';
    const uniqueKey = payload.uri;
    let note = "OK"

    // Check for duplicates based on event type, email, event name, and start time
    const lastRow = sheet.getLastRow();
    let existingKeys = [];
    if (lastRow > 1) {
      existingKeys = sheet.getRange(2, 11, lastRow - 1, 1).getValues().flat();
    }

    if (existingKeys.includes(uniqueKey)) {
      return ContentService.createTextOutput("DUPLICATE — skipping save");
    }

    if (eventType === "invitee.canceled") {
      note = "CANCELLED"
    }

    // candidate pipeline sheet updates
    if (email) {
      if (eventType === "invitee.created" && startTime) {
        updateCandidateRowInterviewStatusByEmail(email, "created", startTime, pipelineSheet, errorLogSheet);
      } else if (eventType === "invitee.canceled") {
        updateCandidateRowInterviewStatusByEmail(email, "canceled", null, pipelineSheet, errorLogSheet);
      }
    }

    // Log unhandled events
    if (eventType !== "invitee.created" && eventType !== "invitee.canceled") {
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
    if (sheet) {
      const cols = sheet.getLastColumn();
      const errorRow = new Array(cols).fill('');
      errorRow[0] = timestamp;
      errorRow[1] = 'ERROR';
      errorRow[cols - 3] = err.toString();
      errorRow[cols - 2] = JSON.stringify(data, null, 2);
      errorRow[cols - 1] = JSON.stringify(data || {});
      sheet.appendRow(errorRow);
    }
    logError(email, `Calendly - Error processing calendly webhook, error: ${err}`)
    return ContentService.createTextOutput("FAIL");
  }
}
