function setOutreachDates(sheet, rowIdx, colFirst, colLast, date) {
  sheet.getRange(rowIdx, colFirst + 1).setValue(makeSafeSheetDate(date));
  sheet.getRange(rowIdx, colLast + 1).setValue(makeSafeSheetDate(date));
}
