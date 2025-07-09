// function test_handleNewProspects_largeBatch() {
//     Logger.log("Running test_handleNewProspects_largeBatch");
  
//     const ss = SpreadsheetApp.openById(CONFIG.sheetIds.massText);
//     const tempProspects = ss.insertSheet("Temp_Prospects_LargeBatch");
//     const tempPipeline = ss.insertSheet("Temp_CandidatePipeline_LargeBatch");
//     const tempTextGeorge = ss.insertSheet("Temp_TextGeorge_LargeBatch");
//     const tempSentTexts = ss.insertSheet("Temp_SentTexts_LargeBatch");
//     FLAGS.IN_TEST_MODE = true;

//     try {
//       // 1️⃣ Setup headers
//       tempProspects.getRange(3, 1, 1, 27).setValues([new Array(27).fill("HEADER")]);
//       test_helper_get_pipeline_headers(tempPipeline);
//       tempTextGeorge.getRange(3, 1, 1, 3).setValues([["Driver ID", "Message", "Convo"]]);
//       tempSentTexts.getRange(3, 1, 1, 4).setValues([["Date", "Driver ID", "Convo", "Message"]]);
  
//       // 2️⃣ Add 50 fake, valid rows to PROSPECTS
//       const fakeProspects = [];
//       for (let i = 0; i < 50; i++) {
//         const row = new Array(27).fill("");
//         row[13] = `CHI_TEST_${i}`;   // Column N = CHI driver ID
//         row[23] = `DRV_IMPORT_${i}`; // Column X = driver ID (valid)
//         // const fakeProspectRow = new Array(27).fill("");
//         // fakeProspectRow[5] = "Test Phone";
//         // fakeProspectRow[13] = "";   // Column N blank
//         // fakeProspectRow[23] = "";   // Column X blank
//         fakeProspects.push(row);
//       }
//       tempProspects.getRange(4, 1, 50, 27).setValues(fakeProspects);
//       SpreadsheetApp.flush();
  
//       // 3️⃣ Call your real function
//       handleNewProspects(
//         tempProspects,
//         tempPipeline,
//         tempTextGeorge,
//         tempSentTexts
//       );
//       SpreadsheetApp.flush();
  
//       // 4️⃣ Check Candidate Pipeline has new rows
//       const pipelineData = tempPipeline.getRange(4, 10, tempPipeline.getLastRow() - 3).getValues().flat().filter(Boolean);
//       expectTrue(pipelineData.length >= 45, "Candidate Pipeline has new driver IDs");
  
//       // 5️⃣ Check PROSPECTS is cleared
//       const prospectsRows = tempProspects.getLastRow() - 3;
//       expectEqual(prospectsRows, 0, "PROSPECTS sheet cleared");
  
//       // 6️⃣ Check TEXT GEORGE queue
//       const textGeorgeCount = tempTextGeorge.getLastRow() - 3;
//       expectTrue(textGeorgeCount >= 45, "TEXT GEORGE queued messages for drivers");
  
//       Logger.log("test_handleNewProspects_largeBatch PASSED!");
  
//     } finally {
//       ss.deleteSheet(tempProspects);
//       ss.deleteSheet(tempPipeline);
//       ss.deleteSheet(tempTextGeorge);
//       ss.deleteSheet(tempSentTexts);
//     }
//   }