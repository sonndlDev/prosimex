import * as React from "react"
import { cn } from "@/lib/utils"

function Label({ className, ...props }) {
  return (
    <label
      data-slot="label"
      className={cn("flex items-center gap-1.5 text-[12px] font-medium text-[rgb(var(--text-2))] select-none leading-none peer-disabled:opacity-50", className)}
      {...props}
    />
  )
}

export { Label }
