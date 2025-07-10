function testProcessNewCandidates() {
  logError(`IN testProcessNewCandidate`);
  const startRow = 1312;
  const rowCount = 3;

  if (startRow < 2 || rowCount < 1) {
    Logger.log("⚠️ Invalid startRow or rowCount");
    return;
  }

  processNewCandidatesFromRows(startRow, rowCount);
}

function testProcessRow1329() {
  Logger.log("Manually testing processNewCandidatesFromRows on row 1329");
  processNewCandidatesFromRows(1329, 1);
}