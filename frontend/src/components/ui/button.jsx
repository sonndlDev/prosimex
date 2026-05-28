import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--blue)/0.4)] disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:     "bg-[rgb(var(--blue))] text-white hover:bg-[rgb(var(--blue-hover))]",
        secondary:   "bg-[rgb(var(--surface-2))] text-[rgb(var(--text-2))] border border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-3))]",
        outline:     "bg-transparent text-[rgb(var(--text-2))] border border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-2))]",
        ghost:       "bg-transparent text-[rgb(var(--text-3))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text))]",
        destructive: "bg-[rgb(var(--red-light))] text-[rgb(var(--red))] border border-[rgb(var(--red-border))] hover:bg-[rgb(var(--red)/0.15)]",
        link:        "bg-transparent text-[rgb(var(--blue))] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default:   "h-8 px-3.5",
        sm:        "h-7 px-3 text-[12px] rounded",
        lg:        "h-9 px-4 text-[14px]",
        icon:      "h-8 w-8 p-0",
        "icon-sm": "h-7 w-7 p-0 rounded",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({ className, variant, size, children, ...props }) {
  return (
    <button data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props}>
      {children}
    </button>
  )
}

export { Button, buttonVariants }
