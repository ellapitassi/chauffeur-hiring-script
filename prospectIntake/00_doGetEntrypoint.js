function doGet() {
    try {
      const output = handleNewProspects();
      return ContentService.createTextOutput(output);
    } catch (e) {
      return ContentService.createTextOutput("❌ Error: " + e.message);
    }
}

// TODO //
// tests/
// ├── unit/
// │   ├── test_classifyCandidateRow.gs
// │   ├── test_queueTextRow.gs
// │   ├── test_isSafeToQueueText.gs
// │   ├── test_updateCandidateBeforeText.gs
// │   ├── test_updateOutreachDatesPrescreenAndLicense.gs
// │
// ├── integration/
// │   ├── test_appendToCandidatePipelineFromProspects_dedupes.gs
// │   ├── test_processNewCandidatesFromRows.gs
// │   ├── test_markTextedInGeorgeSheet_removesMatchingRow.gs
// │
// └── runAllFirstSectionTests.gs