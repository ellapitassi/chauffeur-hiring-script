// Purpose: Copies valid P–AA data from Prospects → Candidate Pipeline, then calls processNewCandidatesFromRows.
function appendToCandidatePipelineFromProspects(
    rows, 
    candidatePipelineOverride = null,
    textGeorgeOverride = null,
    sentTextsOverride = null
  ) {
  const candidatePipeline = candidatePipelineOverride || getSheets().candidatePipeline;

  // 1️⃣ Slice P–AA columns from PROSPECTS
  const startCol = 16;
  const endCol = 27;
  const slicedRows = rows.map(row => row.slice(startCol - 1, endCol + 1));

  // 2️⃣ Validate: must have driverId in Column X (index 8)
  const validRows = [];
  let skippedCount = 0;

  slicedRows.forEach((row, i) => {
    const driverId = row[8];
    if (driverId && driverId.toString().trim() !== "") {
      validRows.push(row);
    } else {
      skippedCount++;
      logError(`⏭️ Skipped row ${i + 1} — missing driverId in Prospects col X`);
    }
  });

  if (validRows.length === 0) {
    logError(`❌ No valid rows to append — all rows missing driverId.`);
    return;
  }

  // 3️⃣A Remove duplicates within this Prospects batch itself
  const seenInBatch = new Set();
  const dedupedRows = validRows.filter(row => {
    const driverId = row[8]?.toString().trim();
    if (seenInBatch.has(driverId)) {
      logError(`⚠️ Duplicate driverId in Prospects import: ${driverId}. Skipping.`);
      return false;
    }
    seenInBatch.add(driverId);
    return true;
  });

  if (dedupedRows.length === 0) {
    logError(`❌ All rows in Prospects were duplicates of each other.`);
    return;
  }

  // 3️⃣B Remove rows already in Candidate Pipeline
  const existingCount = candidatePipeline.getLastRow() - 3;
  let existingIds = [];
  if (existingCount > 0) {
    existingIds = candidatePipeline
      .getRange(4, 10, existingCount)
      .getValues()
      .flat()
      .map(id => id?.toString().trim());
  }

  const trulyUniqueRows = dedupedRows.filter(row => {
    const driverId = row[8]?.toString().trim();
    return !existingIds.includes(driverId);
  });

  if (trulyUniqueRows.length === 0) {
    logError(`All Prospects rows already exist in Candidate Pipeline. Nothing new to add.`);
    return;
  }

  // 4️⃣ Find next empty row to append
  // Check STATUS (B) and Sally ID (D) from row 4 down
  const lastRow = candidatePipeline.getLastRow();
  let pipelineStartRow;

  if (lastRow <= 3) {
    // Sheet is empty (only header rows) — first data row is 4
    pipelineStartRow = 4;
  } else {
    const range = candidatePipeline.getRange(4, 2, lastRow - 3, 3); // Columns B–D
    const values = range.getValues();

    // Find first row where both B and D are empty
    let firstEmptyIndex = values.findIndex(r => 
      (!r[0] || r[0].toString().trim() === "") && 
      (!r[2] || r[2].toString().trim() === "")
    );

    pipelineStartRow = firstEmptyIndex !== -1
      ? firstEmptyIndex + 4
      : lastRow + 1;
  }

  // 5️⃣ Write only unique new rows
  candidatePipeline.getRange(pipelineStartRow, 2, trulyUniqueRows.length, trulyUniqueRows[0].length)
    .setValues(trulyUniqueRows);

  logError(`Appended ${trulyUniqueRows.length} new row(s) to Candidate Pipeline from PROSPECTS.`);
  if (skippedCount > 0) logError(`⏭️ Skipped ${skippedCount} row(s) due to missing driverId.`);

  // 6️⃣ Process only these new rows
  processNewCandidatesFromRows(
    pipelineStartRow,
    trulyUniqueRows.length,
    candidatePipeline,
    textGeorgeOverride,
    sentTextsOverride
  );
}