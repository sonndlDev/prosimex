import * as React from "react"
import { cn } from "@/lib/utils"

function Table({ className, ...props }) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-[13px]", className)} {...props} />
    </div>
  )
}
function TableHeader({ className, ...props }) {
  return <thead className={cn("bg-[rgb(var(--surface-2))] [&_tr]:border-b [&_tr]:border-[rgb(var(--border))]", className)} {...props} />
}
function TableBody({ className, ...props }) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
}
function TableFooter({ className, ...props }) {
  return <tfoot className={cn("bg-[rgb(var(--surface-2))] border-t border-[rgb(var(--border))] font-medium", className)} {...props} />
}
function TableRow({ className, ...props }) {
  return (
    <tr
      className={cn("border-b border-[rgb(var(--border))] transition-colors hover:bg-[rgb(var(--surface-2))] data-[state=selected]:bg-[rgb(var(--blue-light))]", className)}
      {...props}
    />
  )
}
function TableHead({ className, ...props }) {
  return (
    <th
      className={cn("h-9 px-3 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[rgb(var(--text-3))] whitespace-nowrap", className)}
      {...props}
    />
  )
}
function TableCell({ className, ...props }) {
  return <td className={cn("px-3 py-2.5 align-middle text-[rgb(var(--text-2))]", className)} {...props} />
}
function TableCaption({ className, ...props }) {
  return <caption className={cn("mt-4 text-[12px] text-[rgb(var(--text-4))]", className)} {...props} />
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
