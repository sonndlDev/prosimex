import React from "react";
import { DateTime } from "luxon";
import { Input } from "@/components/ui/input";

// Constants
export const NORMAL_CAPACITY = 1;
export const OVERTIME_CAPACITY = 1.43;

export function getCapacityLimit(hasOvertime) {
  return hasOvertime ? OVERTIME_CAPACITY : NORMAL_CAPACITY;
}

/** Chuẩn hóa cờ tăng ca từ DB/API (boolean, 0/1, chuỗi) */
export function parseOvertimeFlag(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s === "true" || s === "t" || s === "1") return true;
    if (s === "false" || s === "f" || s === "0" || s === "") return false;
  }
  return Boolean(value);
}

/** Hiển thị số công: 1, 1.43, làm tròn 2 chữ số thập phân */
export function formatShiftHours(hours) {
  const n = parseFloat(hours);
  if (!Number.isFinite(n) || n === 0) return "0";
  if (Math.abs(n - OVERTIME_CAPACITY) < 0.001) return "1.43";
  if (Math.abs(n - NORMAL_CAPACITY) < 0.001) return "1";
  const rounded = Math.round(n * 100) / 100;
  const s = rounded.toFixed(2);
  return s.replace(/\.?0+$/, "") || "0";
}

// Trong PlanningFormDialog, khi replaceDays:
// autoCalculateSchedule → trả về hours với .toFixed(10) → OK
// normalizePlannedDay cắt về 2 decimal → MẤT PRECISION

// FIX: bỏ formatShiftHours khỏi normalizePlannedDay,
// chỉ dùng nó khi render UI (ManagedTextField value=)
export function normalizePlannedDay(day) {
  if (!day) return day;
  return {
    ...day,
    is_overtime: parseOvertimeFlag(day.is_overtime),
    // KHÔNG format hours ở đây — giữ nguyên precision
  };
}

/** Vượt 1 công (chuẩn) hoặc 1,43 công (tăng ca) */
export function isMachineDayOverCapacity(totalHours, hasOvertime) {
  return totalHours > getCapacityLimit(hasOvertime) + 0.001;
}

function addMachineDayHours(metrics, dateISO, machineId, hours, isOvertime) {
  if (!dateISO || !machineId || !hours) return;
  if (!metrics[dateISO]) metrics[dateISO] = {};
  if (!metrics[dateISO][machineId]) {
    metrics[dateISO][machineId] = { totalHours: 0, hasOvertime: false };
  }
  metrics[dateISO][machineId].totalHours += hours;
  if (isOvertime) metrics[dateISO][machineId].hasOvertime = true;
}

/** Tổng công theo máy/ngày từ danh sách kế hoạch */
export function buildDailyMachineMetrics(plans, options = {}) {
  const { excludePlanIds = [], inlineEditingId, inlineEditDays } = options;
  const excludeSet = new Set((excludePlanIds || []).map(String));
  const metrics = {};

  (plans || []).forEach((plan) => {
    if (excludeSet.has(String(plan.id))) return;

    const isStopped = plan.status === "STOPPED";
    const stoppedAt = plan.stopped_at ? DateTime.fromISO(plan.stopped_at) : null;
    const daysToUse =
      inlineEditingId === plan.id ? inlineEditDays : plan.days;

    daysToUse?.forEach((day) => {
      const dateISO = day.working_date
        ? DateTime.fromISO(day.working_date).toFormat("yyyy-MM-dd")
        : day.date;
      const currentDate = DateTime.fromISO(dateISO);

      if (isStopped && stoppedAt && currentDate.startOf("day") > stoppedAt.startOf("day")) {
        return;
      }

      const machineId = String(plan.machine_id || "unknown");
      const hours = day.hours
        ? parseFloat(day.hours)
        : parseFloat(day.planned_work_quantity) / 8;

      addMachineDayHours(metrics, dateISO, machineId, hours, day.is_overtime);
    });
  });

  return metrics;
}

/** Gộp công từ form đang nhập (preview) vào metrics */
export function mergeFormPreviewIntoMetrics(
  metrics,
  { plannedDays = [], selectedMachineIds = [] },
) {
  const merged = {};
  Object.keys(metrics).forEach((dateISO) => {
    merged[dateISO] = {};
    Object.keys(metrics[dateISO]).forEach((machineId) => {
      merged[dateISO][machineId] = { ...metrics[dateISO][machineId] };
    });
  });

  const add = (dateISO, machineId, hours, isOvertime) => {
    addMachineDayHours(merged, dateISO, String(machineId), hours, isOvertime);
  };

  plannedDays.forEach((day) => {
    if (!day?.date) return;
    if (selectedMachineIds.length > 1) {
      selectedMachineIds.forEach((mId) => {
        const h = parseFloat(day.machineHours?.[mId] || 0);
        if (h > 0) add(day.date, mId, h, day.is_overtime);
      });
    } else if (selectedMachineIds.length === 1) {
      const h = parseFloat(day.hours || 0);
      if (h > 0) add(day.date, selectedMachineIds[0], h, day.is_overtime);
    }
  });

  return merged;
}

export function getMachineDayUsage(metrics, dateISO, machineId) {
  return metrics?.[dateISO]?.[String(machineId)] || { totalHours: 0, hasOvertime: false };
}

/** Số lượng SP hiển thị trên lịch = (planned_work_quantity / 8) * định mức */
export function toDisplayQuantity(plannedWorkQty, dinhMuc) {
  const dm = parseFloat(dinhMuc) || 1;
  const hours = parseFloat(plannedWorkQty) / 8;
  const result = hours * dm;
  return result; // Return exact value, let caller handle rounding if needed
}

/** Chuyển số lượng SP nhập vào → giờ công (shifts) dùng cho rebalance/lưu */
export function displayQtyToHours(displayQty, dinhMuc) {
  const dm = parseFloat(dinhMuc) || 1;
  const result = (parseFloat(displayQty) || 0) / dm;
  // Return high precision number for calculations
  return parseFloat(result.toFixed(10));
}

export function hoursToDisplayQty(hours, dinhMuc) {
  const dm = parseFloat(dinhMuc) || 1;
  const result = (parseFloat(hours) || 0) * dm;
  // Return exact value, let caller handle rounding
  return result;
}

// Styled cell for the Excel look
export const ExcelHeaderCell = React.memo(
  ({ children, className = "", colSpan = 1, rowSpan = 1, style = {} }) => (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      style={style}
      className={`border border-zinc-300 bg-zinc-100 text-zinc-600 font-black text-[10px] sm:text-[11px] p-2 uppercase tracking-wider whitespace-nowrap text-center align-middle ${className}`}
    >
      {children}
    </th>
  ),
);
ExcelHeaderCell.displayName = "ExcelHeaderCell";

export const ExcelDataCell = React.memo(
  ({ children, className = "", style = {} }) => (
    <td
      style={style}
      className={`border border-zinc-200 p-2 text-xs sm:text-sm text-zinc-900 whitespace-nowrap h-12 text-center align-middle ${className}`}
    >
      {children}
    </td>
  ),
);
ExcelDataCell.displayName = "ExcelDataCell";

// Optimized sub-component for handling numeric inputs with local state to prevent lag
export const ManagedTextField = React.memo(({ value, onCommit, className = "", ...props }) => {
  const [localValue, setLocalValue] = React.useState(value);
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (!isFocused) {
      setLocalValue(value);
    }
  }, [value, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    if (localValue !== value) {
      onCommit(localValue);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.target.blur();
    }
  };

  return (
    <Input
      {...props}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`h-8 text-center font-bold px-1 ${className}`}
    />
  );
});
ManagedTextField.displayName = "ManagedTextField";

// Schedule calculation utilities
export function autoCalculateSchedule(totalNeeded, start, currentDays = [], machineIds = []) {
  if (!start || totalNeeded <= 0) return [];
  const machineCount = Math.max(1, machineIds.length);

  let result = [];
  let remaining = totalNeeded;
  let currentDate = DateTime.fromISO(start);
  let accumulatedHours = 0;

  let i = 0;
  while (remaining > 0.0001) { // Use smaller threshold to catch more precision
    if (currentDate.weekday === 7) {
      currentDate = currentDate.plus({ days: 1 });
      continue;
    }
    const isOvertime = currentDays[i]?.is_overtime || false;
    const capacityPerMachine = isOvertime ? OVERTIME_CAPACITY : NORMAL_CAPACITY;
    const workToday = Math.min(remaining, machineCount * capacityPerMachine);

    let mh = {};
    if (machineIds.length > 1) {
       let mRem = workToday;
       machineIds.forEach(id => {
          const mWork = Math.min(mRem, capacityPerMachine);
          mh[id] = mWork.toFixed(10);
          mRem -= mWork;
       });
    }

    accumulatedHours += workToday;
    result.push({
      date: currentDate.toISODate(),
      hours: workToday.toFixed(10),
      is_overtime: isOvertime,
      machineHours: mh,
    });

    remaining -= workToday;
    currentDate = currentDate.plus({ days: 1 });
    i++;
  }
  
  // Fix rounding errors: ensure ALL work is captured with high precision
  if (result.length > 0) {
    const totalDeclared = result.reduce((sum, d) => sum + parseFloat(d.hours), 0);
    const rounding = totalNeeded - totalDeclared;
    
    // Apply correction if there's any remaining work, no matter how small
    if (Math.abs(rounding) > 0.00001) {
      const lastIdx = result.length - 1;
      const lastVal = parseFloat(result[lastIdx].hours) + rounding;
      result[lastIdx].hours = Math.max(0, lastVal).toFixed(10); // Keep high precision
      
      // Update machineHours for multi-machine if needed
      if (result[lastIdx].machineHours && Object.keys(result[lastIdx].machineHours).length > 0) {
        const mIds = Object.keys(result[lastIdx].machineHours);
        const perMachine = rounding / mIds.length;
        mIds.forEach(id => {
          const val = parseFloat(result[lastIdx].machineHours[id]) + perMachine;
          result[lastIdx].machineHours[id] = Math.max(0, val).toFixed(10);
        });
      }
    }
  }
  
  return result;
}

export function rebalanceDays(daysArray, changedIndex, newValRaw, targetTotal, machineIds = []) {
  const newVal = parseFloat(newValRaw) || 0;
  const updated = [...daysArray];
  
  // Auto-toggle overtime if hours > capacity of all machines
  const machineCount = Math.max(1, machineIds.length);
  let isOvertime = updated[changedIndex]?.is_overtime;
  
  // Only force overtime ON if the value exceeds capacity
  if (newVal > machineCount * OVERTIME_CAPACITY + 0.001) {
    isOvertime = true;
  }
  // Don't force overtime OFF - let user control it explicitly

  updated[changedIndex] = {
    ...updated[changedIndex],
    hours: newVal.toFixed(10),
    is_overtime: isOvertime,
  };

  const sumSoFar = updated
    .slice(0, changedIndex + 1)
    .reduce((sum, d) => sum + parseFloat(d.hours || 0), 0);
  let remaining = Math.max(0, targetTotal - sumSoFar);

  const head = updated.slice(0, changedIndex + 1);
  if (remaining < 0.001) return head;

  const nextDateStr = DateTime.fromISO(updated[changedIndex].date)
    .plus({ days: 1 })
    .toISODate();
  const tailPrefs = updated.slice(changedIndex + 1);
  const newTail = autoCalculateSchedule(remaining, nextDateStr, tailPrefs, machineIds);

  return [...head, ...newTail];
}

/** Rebalance lịch theo số lượng SP; ngày cuối hấp thụ phần dư sau làm tròn */
export function rebalanceDaysAsQuantity(
  daysArray, changedIndex, qtyRaw, targetTotalHours, dinhMuc,
) {
  const hoursVal = displayQtyToHours(qtyRaw, dinhMuc);
  const rebalanced = rebalanceDays(daysArray, changedIndex, String(hoursVal), targetTotalHours);
  
  // FIX: tính targetTotalQty từ targetTotalHours với full precision,
  // KHÔNG qua formatShiftHours
  const exactTotalQty = (targetTotalHours * dinhMuc); // hours * dinhMuc = qty
  const targetTotalQty = Math.round(exactTotalQty);

  let allocated = 0;
  const withQty = rebalanced.map((d, i) => {
    const isLast = i === rebalanced.length - 1;
    let qty;
    if (isLast) {
      qty = targetTotalQty - allocated;
    } else {
      // FIX: dùng parseFloat(d.hours) trực tiếp thay vì qua formatShiftHours
      const exact = parseFloat(d.hours) * parseFloat(dinhMuc);
      qty = Math.round(exact);
      allocated += qty;
    }
    return {
      ...d,
      quantity: String(Math.max(0, qty)),
    };
  });

  return withQty;
}
