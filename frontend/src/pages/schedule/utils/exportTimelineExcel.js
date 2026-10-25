import ExcelJS from "exceljs";
import { DateTime } from "luxon";
import {
  isMachineDayOverCapacity,
  parseOvertimeFlag,
} from "../../planning/components/shared";

// Logic and colors mirror CustomSchedule.jsx so the export matches the on-screen timeline.

const WEEKDAY_LABEL = { 1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7", 7: "CN" };
const DATE_FMT = "dd/MM/yyyy";
const COLORS = {
  header: "FF2563EB",
  headerText: "FFFFFFFF",
  white: "FFFFFFFF",
  zebra: "FFF4F4F5",
  sunday: "FFA1A1AA",
  countRow: "FFEFF6FF",
  totalRow: "FFDBEAFE",
  over: "FFEF4444", // CustomSchedule: over-capacity block
  stopped: "FF94A3B8", // CustomSchedule: stopped block
  eventDefault: "FF2563EB", // CustomSchedule: default block color
  textMuted: "FF9CA3AF",
  border: "FFD4D4D8",
};

const toNumber = (v) => parseFloat(v) || 0;
const round3 = (n) => Math.round(n * 1000) / 1000;
const solid = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const thinBorder = {
  top: { style: "thin", color: { argb: COLORS.border } },
  bottom: { style: "thin", color: { argb: COLORS.border } },
  left: { style: "thin", color: { argb: COLORS.border } },
  right: { style: "thin", color: { argb: COLORS.border } },
};

// "#rgb" / "#rrggbb" (with or without #) -> "FFRRGGBB". Returns null for anything else.
const hexToArgb = (color) => {
  if (typeof color !== "string") return null;
  let hex = color.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
  return `FF${hex.toUpperCase()}`;
};

// Blend a color with white. ratio = share of the original color.
const tintArgb = (argb, ratio) => {
  if (!argb) return null;
  const hex = argb.slice(2);
  const mix = (i) =>
    Math.round(255 - (255 - parseInt(hex.slice(i, i + 2), 16)) * ratio)
      .toString(16)
      .padStart(2, "0");
  return `FF${mix(0)}${mix(2)}${mix(4)}`.toUpperCase();
};

// Same precedence as CustomSchedule: stopped > over capacity > event color
const blockArgb = ({ stopped, over, backgroundColor }) => {
  if (stopped) return COLORS.stopped;
  if (over) return COLORS.over;
  return hexToArgb(backgroundColor) || COLORS.eventDefault;
};

const whiteBoldFont = { bold: true, color: { argb: COLORS.white }, size: 10 };

// Event is counted unless it starts after the machine was stopped (same rule as CustomSchedule)
const isCounted = (event) => {
  if (!event.stopped_at) return true;
  return (
    DateTime.fromISO(event.start).startOf("day") <=
    DateTime.fromISO(event.stopped_at).startOf("day")
  );
};

const buildDays = (dateRange) => {
  const days = [];
  const end = DateTime.fromISO(dateRange.end).startOf("day");
  let cur = DateTime.fromISO(dateRange.start).startOf("day");
  while (cur <= end) {
    days.push(cur);
    cur = cur.plus({ days: 1 });
  }
  return days;
};

const sortMachines = (machines) =>
  [...machines].sort((a, b) =>
    (a.title || "").localeCompare(b.title || "", undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );

// usage[dateStr][machineId] = { totalHours, hasOvertime, color }  (counted events only)
//   color = backgroundColor of the first counted event that day (what the cell shows)
// stopped[dateStr][machineId] = hours of events after stop (display only)
function buildUsage(events, machineIds) {
  const usage = {};
  const stopped = {};
  events.forEach((e) => {
    const rid = String(e.resourceId);
    if (!machineIds.has(rid)) return;
    const dateStr = DateTime.fromISO(e.start).toISODate();
    const hours = toNumber(e.planned_work_quantity);

    if (!isCounted(e)) {
      if (!stopped[dateStr]) stopped[dateStr] = {};
      stopped[dateStr][rid] = (stopped[dateStr][rid] || 0) + hours;
      return;
    }

    if (!usage[dateStr]) usage[dateStr] = {};
    if (!usage[dateStr][rid]) {
      usage[dateStr][rid] = { totalHours: 0, hasOvertime: false, color: e.backgroundColor };
    }
    usage[dateStr][rid].totalHours += hours;
    if (parseOvertimeFlag(e.is_overtime)) usage[dateStr][rid].hasOvertime = true;
  });
  return { usage, stopped };
}

function styleHeaderCell(cell) {
  cell.font = { bold: true, color: { argb: COLORS.headerText }, size: 10 };
  cell.fill = solid(COLORS.header);
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.border = thinBorder;
}

function buildOverviewSheet(workbook, { machines, days, usage, stopped, dateRange, factoryName, tabLabel, exportedBy }) {
  const ws = workbook.addWorksheet("Tổng quan");
  const colCount = days.length + 2; // machine label + days + color code
  const lastCol = ws.getColumn(colCount).letter;
  const colorCol = colCount;
  const HEADER_ROW = 5;

  ws.getColumn(1).width = 24;
  days.forEach((_, i) => {
    ws.getColumn(i + 2).width = 11;
  });
  ws.getColumn(colorCol).width = 12;

  ws.mergeCells(`A1:${lastCol}1`);
  ws.getCell("A1").value = "LỊCH SẢN XUẤT (TIMELINE)";
  ws.getCell("A1").font = { bold: true, size: 14 };

  ws.mergeCells(`A2:${lastCol}2`);
  ws.getCell("A2").value =
    `Nhà máy: ${factoryName} | Nhóm: ${tabLabel} | Từ ${DateTime.fromISO(dateRange.start).toFormat(DATE_FMT)} đến ${DateTime.fromISO(dateRange.end).toFormat(DATE_FMT)}`;

  ws.mergeCells(`A3:${lastCol}3`);
  ws.getCell("A3").value = `Xuất lúc ${DateTime.now().toFormat("dd/MM/yyyy HH:mm")} bởi ${exportedBy || "—"}`;
  ws.getCell("A3").font = { italic: true, color: { argb: "FF71717A" } };

  // Header row: machine label + day columns
  const header = ws.getRow(HEADER_ROW);
  header.values = [
    "MÁY",
    ...days.map((d) => `${WEEKDAY_LABEL[d.weekday]}\n${d.toFormat("dd/MM")}`),
    "MÃ MÀU",
  ];
  header.height = 32;
  header.eachCell((cell) => styleHeaderCell(cell));
  days.forEach((d, i) => {
    if (d.weekday === 7) header.getCell(i + 2).fill = solid(COLORS.sunday);
  });

  // Row: number of machines with work per day (matches the header value on screen)
  const countRow = ws.getRow(HEADER_ROW + 1);
  countRow.getCell(1).value = "Số máy có việc";
  days.forEach((d, i) => {
    countRow.getCell(i + 2).value = Object.keys(usage[d.toISODate()] || {}).length;
  });
  countRow.eachCell((cell) => {
    cell.font = { italic: true, bold: true, size: 10 };
    cell.fill = solid(COLORS.countRow);
    cell.alignment = { horizontal: "center" };
    cell.border = thinBorder;
  });
  countRow.getCell(1).alignment = { horizontal: "left" };

  // Machine rows
  const totalsPerDay = days.map(() => 0);
  let rowIdx = HEADER_ROW + 2;
  machines.forEach((m, mIdx) => {
    const rid = String(m.id);
    const machineArgb = hexToArgb(m.color);
    const row = ws.getRow(rowIdx);

    // Label cell: machine color (white text) or zebra like the screen
    const labelCell = row.getCell(1);
    labelCell.value = m.title || "";
    labelCell.border = thinBorder;
    if (machineArgb) {
      labelCell.fill = solid(machineArgb);
      labelCell.font = whiteBoldFont;
    } else {
      labelCell.fill = solid(mIdx % 2 === 0 ? COLORS.white : COLORS.zebra);
      labelCell.font = { bold: true, size: 10 };
    }

    // Machine color code from data (hex text, e.g. #4ADE80)
    const codeCell = row.getCell(colorCol);
    codeCell.value = machineArgb ? `#${machineArgb.slice(2)}` : (m.color || "");
    codeCell.border = thinBorder;
    codeCell.alignment = { horizontal: "center" };
    codeCell.font = { size: 10, bold: true };

    days.forEach((d, i) => {
      const cell = row.getCell(i + 2);
      cell.border = thinBorder;
      cell.alignment = { horizontal: "center" };
      const dateStr = d.toISODate();
      const u = usage[dateStr]?.[rid];

      if (u) {
        cell.value = round3(u.totalHours);
        totalsPerDay[i] += u.totalHours;
        const over = isMachineDayOverCapacity(u.totalHours, u.hasOvertime);
        cell.fill = solid(blockArgb({ stopped: false, over, backgroundColor: u.color }));
        cell.font = whiteBoldFont;
      } else if (stopped[dateStr]?.[rid]) {
        // Only stopped events on this day: greyed, not counted in totals
        cell.value = round3(stopped[dateStr][rid]);
        cell.fill = solid(COLORS.stopped);
        cell.font = { italic: true, bold: true, color: { argb: COLORS.white }, size: 10 };
      } else if (machineArgb) {
        // Empty cell on a colored row: light tint of the machine color
        cell.fill = solid(tintArgb(machineArgb, 0.3));
      }
    });
    rowIdx += 1;
  });

  // Totals row
  const totalRow = ws.getRow(rowIdx);
  totalRow.getCell(1).value = "Tổng công";
  days.forEach((_, i) => {
    totalRow.getCell(i + 2).value = round3(totalsPerDay[i]);
  });
  totalRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10 };
    cell.fill = solid(COLORS.totalRow);
    cell.alignment = { horizontal: "center" };
    cell.border = thinBorder;
  });
  totalRow.getCell(1).alignment = { horizontal: "left" };

  // Legend
  rowIdx += 2;
  ws.mergeCells(`A${rowIdx}:${lastCol}${rowIdx}`);
  ws.getCell(`A${rowIdx}`).value =
    "Màu ô theo màu trên lịch: đỏ = vượt công suất (chuẩn 1 công/ngày, tăng ca 1.43 công); xám = sự kiện đã dừng (không tính vào tổng); màu khác = màu sự kiện/máy.";
  ws.getCell(`A${rowIdx}`).font = { italic: true, size: 9, color: { argb: "FF71717A" } };

  ws.views = [{ state: "frozen", xSplit: 1, ySplit: HEADER_ROW }];
}

function buildDetailSheet(workbook, { events, machines, usage }) {
  const ws = workbook.addWorksheet("Chi tiết");
  const columns = [
    { header: "STT", key: "stt", width: 7 },
    { header: "Máy", key: "machine", width: 14 },
    { header: "Ngày", key: "date", width: 12 },
    { header: "Thứ", key: "weekday", width: 8 },
    { header: "Đơn hàng", key: "order", width: 18 },
    { header: "PO khách", key: "po", width: 16 },
    { header: "Mã hàng", key: "product", width: 22 },
    { header: "Công đoạn", key: "operation", width: 24 },
    { header: "Số công KH", key: "hours", width: 13 },
    { header: "Tăng ca", key: "overtime", width: 10 },
    { header: "Trạng thái", key: "status", width: 22 },
    { header: "Vượt công suất", key: "over", width: 15 },
  ];
  ws.columns = columns;

  const header = ws.getRow(1);
  header.height = 24;
  header.eachCell((cell) => styleHeaderCell(cell));

  const order = new Map(machines.map((m, i) => [String(m.id), i]));
  const machineById = new Map(machines.map((m) => [String(m.id), m]));
  const sorted = events
    .filter((e) => order.has(String(e.resourceId)))
    .sort(
      (a, b) =>
        order.get(String(a.resourceId)) - order.get(String(b.resourceId)) ||
        DateTime.fromISO(a.start).toMillis() - DateTime.fromISO(b.start).toMillis(),
    );

  sorted.forEach((e, idx) => {
    const rid = String(e.resourceId);
    const machine = machineById.get(rid);
    const start = DateTime.fromISO(e.start);
    const counted = isCounted(e);
    const u = usage[start.toISODate()]?.[rid];
    const over = counted && !!u && isMachineDayOverCapacity(u.totalHours, u.hasOvertime);

    const statusText =
      e.stopped_at && !counted
        ? `Đã dừng từ ${DateTime.fromISO(e.stopped_at).toFormat("dd/MM")}`
        : "Đang chạy";
    let overText = "—";
    if (counted) overText = over ? "Có" : "Không";

    const row = ws.addRow({
      stt: idx + 1,
      machine: machine?.title || "",
      date: start.toFormat(DATE_FMT),
      weekday: WEEKDAY_LABEL[start.weekday],
      order: e.order_code || "",
      po: e.po_customer || "",
      product: e.product_name || e.title || "",
      operation: e.operation_name || "",
      hours: round3(toNumber(e.planned_work_quantity)),
      overtime: parseOvertimeFlag(e.is_overtime) ? "Có" : "Không",
      status: statusText,
      over: overText,
    });

    row.eachCell((cell) => {
      cell.border = thinBorder;
      cell.font = { size: 10, color: { argb: counted ? "FF18181B" : COLORS.textMuted }, italic: !counted };
    });

    // Machine name in the machine color (same as the label on screen)
    const machineArgb = hexToArgb(machine?.color);
    if (machineArgb) {
      const cell = row.getCell("machine");
      cell.fill = solid(machineArgb);
      cell.font = whiteBoldFont;
    }

    // Quantity in the block color shown on screen
    const qtyCell = row.getCell("hours");
    qtyCell.fill = solid(blockArgb({ stopped: !counted, over, backgroundColor: e.backgroundColor }));
    qtyCell.font = whiteBoldFont;

    if (over) {
      row.getCell("over").fill = solid(COLORS.over);
      row.getCell("over").font = whiteBoldFont;
    }
  });

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];
}

function downloadWorkbook(buffer, fileName) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export the timeline exactly as currently displayed (no refetch), including colors.
 */
export async function exportTimelineExcel({
  machines = [],
  events = [],
  dateRange,
  factoryName = "",
  tabLabel = "",
  exportedBy = "",
}) {
  const sortedMachines = sortMachines(machines);
  const machineIds = new Set(sortedMachines.map((m) => String(m.id)));
  const days = buildDays(dateRange);
  const { usage, stopped } = buildUsage(events, machineIds);

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  buildOverviewSheet(workbook, {
    machines: sortedMachines,
    days,
    usage,
    stopped,
    dateRange,
    factoryName,
    tabLabel,
    exportedBy,
  });
  buildDetailSheet(workbook, { events, machines: sortedMachines, usage });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadWorkbook(buffer, `Timeline_SanXuat_${DateTime.now().toFormat("yyyyMMdd_HHmm")}.xlsx`);
}
