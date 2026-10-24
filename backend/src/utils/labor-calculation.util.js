// Cac khoang nghi tinh theo phut tu nua dem (0:00)
const BREAK_PERIODS = [
  { start: 11 * 60 + 30, end: 13 * 60 },   // 11:30-13:00 (90 phut nghi trua)
  { start: 16 * 60 + 30, end: 17 * 60 },   // 16:30-17:00 (30 phut nghi tang ca)
];

function toMinutesFromMidnight(date) {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

function calcBreakOverlap(workStartMin, workEndMin) {
  return BREAK_PERIODS.reduce((total, bp) => {
    const overlapStart = Math.max(workStartMin, bp.start);
    const overlapEnd = Math.min(workEndMin, bp.end);
    return total + Math.max(0, overlapEnd - overlapStart);
  }, 0);
}

/**
 * Tinh so phut lam viec hop le sau khi tru khoang nghi.
 * @param {string|Date} startTime
 * @param {string|Date} endTime
 * @returns {number} so phut hop le (float)
 */
export function calculateValidWorkMinutes(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const totalMinutes = (end.getTime() - start.getTime()) / 60000;
  if (totalMinutes <= 0) return 0;
  const breakMinutes = calcBreakOverlap(
    toMinutesFromMidnight(start),
    toMinutesFromMidnight(end),
  );
  return Math.max(0, totalMinutes - breakMinutes);
}

/**
 * Tinh so cong thuc te. 1 cong = 8 gio = 480 phut.
 * @param {number} validWorkMinutes
 * @param {number} workerCount
 * @returns {number} so cong (float)
 */
export function calculateActualLabor(validWorkMinutes, workerCount) {
  if (!validWorkMinutes || !workerCount || workerCount <= 0) return 0;
  return (validWorkMinutes * workerCount) / 480;
}
