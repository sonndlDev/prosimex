import * as React from "react"
import { cn } from "@/lib/utils"

function Card({ className, ...props }) {
  return <div data-slot="card" className={cn("bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-lg text-[rgb(var(--text))]", className)} {...props} />
}
function CardHeader({ className, ...props }) {
  return <div data-slot="card-header" className={cn("flex flex-col gap-1 px-5 py-4 border-b border-[rgb(var(--border))]", className)} {...props} />
}
function CardTitle({ className, ...props }) {
  return <div data-slot="card-title" className={cn("text-[14px] font-semibold text-[rgb(var(--text))] tracking-tight", className)} {...props} />
}
function CardDescription({ className, ...props }) {
  return <div data-slot="card-description" className={cn("text-[12px] text-[rgb(var(--text-3))]", className)} {...props} />
}
function CardContent({ className, ...props }) {
  return <div data-slot="card-content" className={cn("px-5 py-4", className)} {...props} />
}
function CardFooter({ className, ...props }) {
  return <div data-slot="card-footer" className={cn("flex items-center px-5 py-3 border-t border-[rgb(var(--border))]", className)} {...props} />
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
