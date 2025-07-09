function runFirstSectionTests() {
  Logger.log("🧪 🧪 🧪 RUNNING FIRST SECTION TESTS 🧪 🧪 🧪");

  // --- Core Unit Tests (safe to always run)
  Logger.log("Running UNIT TESTS...");
  test_isSafeToQueueText();
  test_queueTextRow();
  test_classifyCandidateRow();
  test_updateCandidateBeforeText();
  test_updateOutreachDatesPrescreenAndLicense();

  // --- Sheet / Integration Tests
  Logger.log("Running SHEET / INTEGRATION TESTS...");
  test_appendToCandidatePipelineFromProspects_dedupes();
  test_processNewCandidatesFromRows();
  test_markTextedInGeorgeSheetOnce_removesMatchingRow();

  Logger.log("FIRST SECTION TESTS FINISHED ");
}

function runAllTextingSystemTests() {
  Logger.log("🧪🧪🧪 RUNNING ALL SYSTEM TESTS 🧪🧪🧪");

  // Call First Section Tests gb
  runFirstSectionTests();

  // Add these for second section / post-text sending / misc
  test_isGeorgeQueueEmpty();
  test_1processSentTexts_ENABLE_TEXTING_FALSE();
  test_2processSentTexts_ENABLE_TEXTING_FALSE_failed();
  test_3processSentTexts_ENABLE_TEXTING_true();
  test_4processSentTexts_ENABLE_TEXTING_true_failed();
  test_sendAllTexts_unit();
  test_deleteThisTrigger_cleansUp();
  test_findSendTextRow_createsTriggerAndSetsStartTime();

  Logger.log("⚠️ To run live texting integration, uncomment carefully:");
  Logger.log("// test_sendREALAndCleanupIntegration();");
}
