import React from "react";
import { DateTime } from "luxon";
import { Input } from "@/components/ui/input";

// Constants
export const NORMAL_CAPACITY = 1;
export const OVERTIME_CAPACITY = 1.43;

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

  let i = 0;
  while (remaining > 0.001) {
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
          mh[id] = mWork.toFixed(2);
          mRem -= mWork;
       });
    }

    result.push({
      date: currentDate.toISODate(),
      hours: workToday.toFixed(2),
      is_overtime: isOvertime,
      machineHours: mh,
    });

    remaining -= workToday;
    currentDate = currentDate.plus({ days: 1 });
    i++;
  }
  return result;
}

export function rebalanceDays(daysArray, changedIndex, newValRaw, targetTotal, machineIds = []) {
  const newVal = parseFloat(newValRaw) || 0;
  const updated = [...daysArray];
  
  // Auto-toggle overtime if hours > capacity of all machines
  const machineCount = Math.max(1, machineIds.length);
  let isOvertime = updated[changedIndex]?.is_overtime;
  if (newVal > machineCount * NORMAL_CAPACITY) {
    isOvertime = true;
  } else if (newVal <= machineCount * NORMAL_CAPACITY && newVal > 0 && updated[changedIndex].hours > (machineCount * NORMAL_CAPACITY)) {
     isOvertime = false;
  }

  updated[changedIndex] = {
    ...updated[changedIndex],
    hours: newVal.toFixed(2),
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
