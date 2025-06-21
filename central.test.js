function runSafeTestSuite() {
    Logger.log("🧪 Starting full test suite");
    FLAGS.ENABLE_TEXTING = false;
  
    // 🧼 Assert we're in safe mode
    if (FLAGS.ENABLE_TEXTING) throw new Error("❌ Texting is ON — aborting safe test suite");
  
    // 🔬 Core logic tests
    // test_processNewCandidates_queueingCorrectTexts();
    test_preventDuplicateTexts();
  
    // ✅ Sanity check old test helpers still run
    // testProcessNewCandidates();
    // testProcessRow1329();
  
    Logger.log("✅ All safe tests complete. Review logs + sheets.");
  }

  function runRealTextTests() {
    Logger.log("⚠️ RUNNING REAL TEXT TESTS — texting is ENABLED");
    FLAGS.ENABLE_TEXTING = true;
  
    test_sendRealTextToSelfPass();
    test_sendRealTextToSelfFail();
  
    Logger.log("✅ Real text tests complete");
  }