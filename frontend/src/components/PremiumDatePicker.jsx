"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function PremiumDatePicker({ 
  date, 
  onSelect, 
  placeholder = "Chọn ngày",
  className,
  disabled = false,
  label = ""
}) {
  // Convert string date to Date object if needed
  const selectedDate = React.useMemo(() => {
    if (!date) return undefined;
    if (date instanceof Date) return date;
    const d = new Date(date);
    return isNaN(d.getTime()) ? undefined : d;
  }, [date]);

  const handleSelect = (newDate) => {
    if (onSelect) {
      if (!newDate) {
        onSelect("");
        return;
      }
      // Format to YYYY-MM-DD for backend compatibility
      const year = newDate.getFullYear();
      const month = String(newDate.getMonth() + 1).padStart(2, '0');
      const day = String(newDate.getDate()).padStart(2, '0');
      onSelect(`${year}-${month}-${day}`);
    }
  };

  return (
    <div className={cn("grid gap-1.5", className)}>
      {label && <label className="text-xs font-bold uppercase text-zinc-400 tracking-widest">{label}</label>}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            disabled={disabled}
            className={cn(
              "w-full h-10 justify-between text-left font-bold border-zinc-200 bg-white hover:bg-zinc-50 transition-all shadow-sm rounded-lg px-3 group",
              !date && "text-zinc-400 font-medium"
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <CalendarIcon className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                date ? "text-indigo-600" : "text-zinc-300 group-hover:text-zinc-400"
              )} />
              <span className="truncate">
                {selectedDate ? format(selectedDate, "dd/MM/yyyy") : placeholder}
              </span>
            </div>
            
            {date && !disabled ? (
                <div 
                    onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(undefined);
                    }}
                    className="p-1 hover:bg-zinc-100 rounded-full transition-colors mr-[-4px]"
                >
                    <X className="h-3 w-3 text-zinc-400 hover:text-red-500" />
                </div>
            ) : (
                <div className="w-4 h-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 shadow-2xl border-indigo-50 rounded-2xl overflow-hidden bg-white" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            initialFocus
            className="p-4"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
