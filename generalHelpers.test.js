function test_getBaseConvo() {
    Logger.log("🧪 Running test_getBaseConvo");
  
    expectEqual(getBaseConvo("Chauffeur_form_2024-01-01"), "Chauffeur_form", "Should return 'Chauffeur_form'");
    expectEqual(getBaseConvo("Prescreen_2024-01-01"), "Prescreen", "Should return 'Prescreen'");
    expectEqual(getBaseConvo("Intro_form_2024-06-03"), "Intro_form", "Should return 'Intro_form'");
    expectEqual(getBaseConvo(""), "", "Should return empty string for empty input");
    expectEqual(getBaseConvo(null), undefined, "Should return undefined for null input");
  
    Logger.log("test_getBaseConvo passed");
}