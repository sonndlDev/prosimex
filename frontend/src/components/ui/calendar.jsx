"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center mb-2",
        month_caption: "flex justify-center pt-1 relative items-center h-9",
        caption_label: "text-sm font-black text-zinc-900",
        nav: "flex items-center absolute right-3 top-4 gap-1.5",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-white p-0 opacity-50 hover:opacity-100 border-zinc-200 shadow-sm transition-all hover:bg-zinc-50 flex items-center justify-center rounded-lg"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-white p-0 opacity-50 hover:opacity-100 border-zinc-200 shadow-sm transition-all hover:bg-zinc-50 flex items-center justify-center rounded-lg"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex w-full mb-2",
        weekday: "text-zinc-400 rounded-md w-9 font-black text-[10px] uppercase tracking-widest flex-1 text-center h-9 items-center justify-center flex",
        weeks: "space-y-1",
        week: "flex w-full mt-1",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-bold aria-selected:opacity-100 hover:bg-zinc-100 rounded-lg transition-all flex items-center justify-center relative text-zinc-700"
        ),
        day_button: "h-full w-full flex items-center justify-center",
        range_end: "day-range-end",
        selected:
          "bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white rounded-lg shadow-lg shadow-indigo-100 !opacity-100",
        today: "bg-emerald-50 text-emerald-700 font-black ring-1 ring-emerald-200 rounded-lg",
        outside:
          "day-outside text-zinc-300 opacity-50 aria-selected:bg-zinc-50/30 aria-selected:text-zinc-300",
        disabled: "text-zinc-300 opacity-50",
        range_middle:
          "aria-selected:bg-indigo-50 aria-selected:text-indigo-900",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ ...props }) => {
          if (props.orientation === "left") return <ChevronLeft className="h-4 w-4" />;
          return <ChevronRight className="h-4 w-4" />;
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
