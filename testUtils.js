function expectEqual(actual, expected, message, context = "test") {
    if (actual !== expected) {
      logDetailedError({
        driverId: "TEST",
        message: `Test failed: ${message}`,
        context,
        details: `Got: '${actual}', Expected: '${expected}'`
      });
      throw new Error(`❌ ${message}`);
    } else {
      Logger.log(`pass: ${message}`);
    }
  }
  
  function expectTrue(condition, message, context = "test") {
    if (!condition) {
      logDetailedError({
        driverId: "TEST",
        message: `Test failed: ${message}`,
        context,
        details: `Condition evaluated to false`
      });
      throw new Error(`❌ ${message}`);
    } else {
      Logger.log(`pass: ${message}`);
    }
  }

  function expectFalse(value, message) {
    if (value) {
      throw new Error(`❌ ${message}`);
    } else {
      Logger.log(`pass: ${message}`);
    }
  }

  