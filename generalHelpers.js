function getBaseConvo(name) {
    if (typeof name !== "string") return undefined;
    const parts = name.split('_');
    return parts.slice(0, -1).join('_'); // all but the last part
}


/**
 * Ensures a date is safe for Google Sheets by setting time to noon.
 * Prevents timezone drift issues when formatting.
 * @param {Date} baseDate
 * @return {Date}
 */
function makeSafeSheetDate(baseDate) {
    const d = new Date(baseDate);
    d.setHours(12, 0, 0, 0);
    return d;
  }