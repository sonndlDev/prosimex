import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }) {
  return <div data-slot="skeleton" className={cn("animate-pulse rounded bg-[rgb(var(--surface-2))]", className)} {...props} />
}

export { Skeleton }
