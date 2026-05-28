import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold border whitespace-nowrap",
  {
    variants: {
      variant: {
        default:     "bg-[rgb(var(--blue-light))] text-[rgb(var(--blue))] border-[rgb(var(--blue-border))]",
        secondary:   "bg-[rgb(var(--surface-2))] text-[rgb(var(--text-3))] border-[rgb(var(--border))]",
        destructive: "bg-[rgb(var(--red-light))] text-[rgb(var(--red))] border-[rgb(var(--red-border))]",
        outline:     "bg-transparent text-[rgb(var(--text-2))] border-[rgb(var(--border-strong))]",
        success:     "bg-[rgb(var(--green-light))] text-[rgb(var(--green))] border-[rgb(var(--green-border))]",
        warning:     "bg-[rgb(var(--amber-light))] text-[rgb(var(--amber))] border-[rgb(var(--amber-border))]",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Badge({ className, variant, ...props }) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
