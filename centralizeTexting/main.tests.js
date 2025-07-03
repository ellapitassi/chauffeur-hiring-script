function runAllQueueingAndTextingTests() {
  Logger.log("🧪 🧪 🧪 RUNNING ALL QUEUEING & TEXTING TESTS 🧪 🧪 🧪");

  // --- ✅ Core Unit Tests (safe to always run)
  Logger.log("✅ Running CORE UNIT TESTS...");
  test_isSafeToQueueText();
  test_isGeorgeQueueEmpty();
  test_queueTextRow();
  test_classifyCandidateRow();
  // test_processSingleCandidateRow(); // old
  test_updateCandidateBeforeText();
  test_updateCandidateAfterText(); // replaced by updateOutreachDatesAndPrescreen
  test_1processSentTexts_ENABLE_TEXTING_FALSE()
  test_2processSentTexts_ENABLE_TEXTING_FALSE_failed()
  test_3processSentTexts_ENABLE_TEXTING_true()
  test_4processSentTexts_ENABLE_TEXTING_true_failed()
  test_updateOutreachDatesPrescreenAndLicense()

  // --- ✅ Sheet / Integration Tests (no texting)
  Logger.log("✅ Running SHEET / INTEGRATION TESTS...");
  test_sendAllTexts_unit();
  test_markTextedInGeorgeSheet_removesMatchingRow();
  test_deleteThisTrigger_cleansUp();
  test_findSendTextRow_createsTriggerAndSetsStartTime();
  test_processNewCandidatesFromRows();
  // test_processSentTexts();

  // --- ⚠️ Live texting test (real send)
  Logger.log("⚠️ Skipping LIVE texting test by default!");
  Logger.log("⚠️ To run, uncomment the line below carefully:");
  Logger.log("// test_sendAndCleanupIntegration();");
  // test_sendREALAndCleanupIntegration();

  Logger.log("✅✅✅ ALL TESTS FINISHED ✅✅✅");
}