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

/**
 * Parse chuoi "HH:mm" thanh so phut tu nua dem. Tra ve null neu khong hop le.
 * @param {string} value
 * @returns {number|null}
 */
export function parseHHmmToMinutes(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Tinh so phut lam viec hop le tu so phut trong ngay (khong phu thuoc timezone).
 * @param {number} startMin so phut tu nua dem
 * @param {number} endMin so phut tu nua dem
 * @returns {number} so phut hop le
 */
export function calculateValidWorkMinutesFromMinutes(startMin, endMin) {
  if (startMin === null || endMin === null || startMin === undefined || endMin === undefined) return 0;
  const totalMinutes = endMin - startMin;
  if (totalMinutes <= 0) return 0;
  return Math.max(0, totalMinutes - calcBreakOverlap(startMin, endMin));
}

/**
 * Tinh cong cho nhieu khoang lam viec lech nhau (work_periods).
 * Moi khoang: {start:"HH:mm", end:"HH:mm", workers:int}.
 * @param {Array} periods
 * @returns {{validWorkMinutes: number, actualLabor: number}}
 */
export function calculatePeriodsLabor(periods) {
  let totalMinutes = 0;
  let weightedMinutes = 0;
  for (const p of periods || []) {
    const startMin = parseHHmmToMinutes(p && p.start);
    const endMin = parseHHmmToMinutes(p && p.end);
    const workers = parseInt(p && p.workers, 10);
    if (startMin === null || endMin === null || !workers || workers <= 0) continue;
    const mins = calculateValidWorkMinutesFromMinutes(startMin, endMin);
    totalMinutes += mins;
    weightedMinutes += mins * workers;
  }
  return { validWorkMinutes: totalMinutes, actualLabor: weightedMinutes / 480 };
}
