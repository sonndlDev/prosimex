import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[72px] w-full rounded-md border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] px-3 py-2 text-[13px] text-[rgb(var(--text))] placeholder:text-[rgb(var(--text-4))] outline-none resize-none transition-colors",
        "focus-visible:border-[rgb(var(--blue))] focus-visible:ring-2 focus-visible:ring-[rgb(var(--blue)/0.12)]",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
