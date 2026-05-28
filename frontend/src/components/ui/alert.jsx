import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative grid w-full gap-1 rounded-lg border px-3.5 py-3 text-[13px] has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:size-4 *:[svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        default:     "bg-[rgb(var(--surface-2))] border-[rgb(var(--border-strong))] text-[rgb(var(--text-2))]",
        destructive: "bg-[rgb(var(--red-light))] border-[rgb(var(--red-border))] text-[rgb(var(--red))]",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Alert({ className, variant, ...props }) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}
function AlertTitle({ className, ...props }) {
  return <div data-slot="alert-title" className={cn("font-semibold text-[rgb(var(--text))] leading-snug", className)} {...props} />
}
function AlertDescription({ className, ...props }) {
  return <div data-slot="alert-description" className={cn("text-[13px]", className)} {...props} />
}
function AlertAction({ className, ...props }) {
  return <div data-slot="alert-action" className={cn("absolute top-2 right-2", className)} {...props} />
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
