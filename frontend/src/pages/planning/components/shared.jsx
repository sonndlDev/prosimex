import React from "react";
import { TableCell, TextField } from "@mui/material";
import { DateTime } from "luxon";

// Constants
export const NORMAL_CAPACITY = 1;
export const OVERTIME_CAPACITY = 1.43;

// Styled cell for the Excel look
export const ExcelHeaderCell = React.memo(
  ({ children, sx = {}, colSpan = 1, rowSpan = 1 }) => (
    <TableCell
      colSpan={colSpan}
      rowSpan={rowSpan}
      align="center"
      sx={{
        border: "1px solid #cbd5e1",
        bgcolor: "#f1f5f9",
        color: "#475569",
        fontWeight: 800,
        fontSize: "max(0.75rem, 0.8vw)",
        p: "12px 6px",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
        ...sx,
      }}
    >
      {children}
    </TableCell>
  ),
);
ExcelHeaderCell.displayName = "ExcelHeaderCell";

export const ExcelDataCell = React.memo(
  ({ children, align = "center", sx = {} }) => (
    <TableCell
      align={align}
      sx={{
        border: "1px solid #e2e8f0",
        p: "10px 12px",
        fontSize: "max(0.8rem, 0.85vw)",
        color: "#1e293b",
        whiteSpace: "nowrap",
        height: "48px",
        ...sx,
      }}
    >
      {children}
    </TableCell>
  ),
);
ExcelDataCell.displayName = "ExcelDataCell";

// Optimized sub-component for handling numeric inputs with local state to prevent lag
export const ManagedTextField = React.memo(({ value, onCommit, ...props }) => {
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
    <TextField
      {...props}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
});
ManagedTextField.displayName = "ManagedTextField";

// Schedule calculation utilities
export function autoCalculateSchedule(totalNeeded, start, currentDays = []) {
  if (!start || totalNeeded <= 0) return [];

  let result = [];
  let remaining = totalNeeded;
  let currentDate = DateTime.fromISO(start);

  let i = 0;
  while (remaining > 0.001) {
    const isOvertime = currentDays[i]?.is_overtime || false;
    const capacity = isOvertime ? OVERTIME_CAPACITY : NORMAL_CAPACITY;
    const work = Math.min(remaining, capacity);

    result.push({
      date: currentDate.toISODate(),
      hours: work.toFixed(2),
      is_overtime: isOvertime,
    });

    remaining -= work;
    currentDate = currentDate.plus({ days: 1 });
    i++;
  }
  return result;
}

export function rebalanceDays(daysArray, changedIndex, newValRaw, targetTotal) {
  const newVal = parseFloat(newValRaw) || 0;
  const updated = [...daysArray];
  
  // Auto-toggle overtime if hours > 1.0
  let isOvertime = updated[changedIndex]?.is_overtime;
  if (newVal > NORMAL_CAPACITY) {
    isOvertime = true;
  } else if (newVal <= NORMAL_CAPACITY && newVal > 0 && updated[changedIndex].hours > NORMAL_CAPACITY) {
     // If reducing from >1.0 to <=1.0, we can optionally untick, 
     // but let's keep it if the user might still consider it overtime (e.g. weekend)
     // Actually, if it was auto-ticked, they'd expect it to untick.
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
  const newTail = autoCalculateSchedule(remaining, nextDateStr, tailPrefs);

  return [...head, ...newTail];
}
