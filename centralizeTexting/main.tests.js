function runAllQueueingandTextingTests() {
    Logger.log("🧪 Running all unit tests...");
  
    // ✅ Safe tests
    test_isSafeToQueueText();
    test_addToGroupedQueue();
    // test_flushGroupedQueue(); // Optional — uncomment if used
    test_flushSingleGroup();
    test_sendAllTexts_unit();
    test_markTextedInGeorgeSheet();
  
    Logger.log("✅ All safe tests completed.");
  
    // ⚠️ Real tests are skipped by default — uncomment if you want to run them
    Logger.log("⚠️ Skipping real tests by default to avoid hitting live systems.");
    Logger.log("⚠️ If you want to run them, uncomment the lines below:");
  
    Logger.log("  // test_sendAllTexts_real();");
    // test_sendAllTexts_real(); // 🔴 LIVE texting — enable with caution
  
    Logger.log("✅ runAllTests() completed.");
  }