import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SearchIcon, CheckIcon } from "lucide-react"

function Command({ className, ...props }) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn("flex size-full flex-col overflow-hidden rounded-xl bg-[rgb(var(--surface-2))] text-[rgb(var(--ink))]", className)}
      {...props}
    />
  )
}

function CommandDialog({ title = "Command Palette", description = "Search...", children, className, showCloseButton = false, ...props }) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent className={cn("top-1/3 translate-y-0 overflow-hidden rounded-xl p-0", className)} showCloseButton={showCloseButton}>
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({ className, ...props }) {
  return (
    <div className="flex items-center border-b border-[rgb(var(--hairline))] bg-[rgb(var(--surface-2))] px-3 h-10">
      <SearchIcon className="size-4 shrink-0 text-[rgb(var(--ink-tertiary))] mr-2" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "flex h-10 w-full bg-transparent py-3 text-[13px] text-[rgb(var(--ink))] outline-none placeholder:text-[rgb(var(--ink-tertiary))] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CommandList({ className, ...props }) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn("no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none", className)}
      {...props}
    />
  )
}

function CommandEmpty({ className, ...props }) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-6 text-center text-[13px] text-[rgb(var(--ink-tertiary))]", className)}
      {...props}
    />
  )
}

function CommandGroup({ className, ...props }) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden p-1 text-[rgb(var(--ink))] **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-[10px] **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-wider **:[[cmdk-group-heading]]:text-[rgb(var(--ink-tertiary))]",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({ className, ...props }) {
  return <CommandPrimitive.Separator data-slot="command-separator" className={cn("-mx-1 h-px bg-[rgb(var(--hairline))]", className)} {...props} />
}

function CommandItem({ className, children, ...props }) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[rgb(var(--ink-muted))] outline-none select-none",
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40",
        "data-selected:bg-[rgb(var(--surface-3))] data-selected:text-[rgb(var(--ink))]",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <CheckIcon className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100 size-4 text-[rgb(var(--primary-hover))]" />
    </CommandPrimitive.Item>
  )
}

function CommandShortcut({ className, ...props }) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn("ml-auto text-[11px] tracking-widest text-[rgb(var(--ink-tertiary))]", className)}
      {...props}
    />
  )
}

export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator }
