function test_markTextedInGeorgeSheet_findsMatch_inMassTextFile() {
    Logger.log("Running test in massText spreadsheet...");
  
    // 1. Open the spreadsheet by ID
    const massTextSpreadsheet = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
  
    // 2. Insert mock sheets
    const mockGeorgeSheet = massTextSpreadsheet.insertSheet('MockGeorge');
    const mockSentTextsSheet = massTextSpreadsheet.insertSheet('MockSentTexts');
  
    // 3. Temporarily override CONFIG
    CONFIG.sheets.textGeorge = mockGeorgeSheet;
    CONFIG.sheets.sentTexts = mockSentTextsSheet;
  
    // 4. Add mock headers and data
    mockGeorgeSheet.getRange("A3:D3").setValues([["Driver ID", "", "Message", ""]]);
    mockGeorgeSheet.getRange("A4:C4").setValues([["TEST_DRIVER", "", "Hello world"]]);
  
    mockSentTextsSheet.getRange("A3:D3").setValues([["", "Driver ID", "Message", "Status"]]);
    mockSentTextsSheet.getRange("B4:C4").setValues([["TEST_DRIVER", "Hello world"]]);
  
    // 5. Set properties
    const props = PropertiesService.getScriptProperties();
    props.setProperty('startTime', new Date().toISOString());
    props.setProperty('callCount', '0');
  
    // 6. Run the function
    markTextedInGeorgeSheet();
  
    // 7. Check the result
    const result = mockGeorgeSheet.getRange("D4").getValue();
    if (result === "TEXTED!") {
      Logger.log("✅ Test passed: 'TEXTED!' was written to MockGeorge");
    } else {
      Logger.log("❌ Test failed: Expected 'TEXTED!' but got: " + result);
    }
  
    // 8. Clean up
    // massTextSpreadsheet.deleteSheet(mockGeorgeSheet);
    // massTextSpreadsheet.deleteSheet(mockSentTextsSheet);
}

function testRejectedFormSubmit() {
  const formSheet = CONFIG.sheets.formResponses;
  const row = formSheet.getRange(2, 1, 1, formSheet.getLastColumn()); // Change row index as needed

  const mockEvent = {
    range: row,
    source: formSheet.getParent(),
    values: row.getValues()[0],
  };

  handleFormSubmission(mockEvent);
}