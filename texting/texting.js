function getSentMessages(sentTextsSheet) {
    const lastRow = sentTextsSheet.getLastRow();
    if (lastRow < 4) return [];
  
    const data = sentTextsSheet.getRange(4, 1, lastRow - 3, 4).getValues();
    return data.map(row => ({
      driverId: String(row[1]).trim(),
      convoName: String(row[2]).trim(),
      text: String(row[3]).trim()
    }));
  }
