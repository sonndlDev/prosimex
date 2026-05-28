import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({ ...props }) { return <DialogPrimitive.Root data-slot="dialog" {...props} />; }
function DialogTrigger({ asChild, children, ...props }) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" render={asChild ? children : undefined} {...props}>{asChild ? undefined : children}</DialogPrimitive.Trigger>;
}
function DialogPortal({ ...props }) { return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />; }
function DialogClose({ asChild, children, ...props }) {
  return <DialogPrimitive.Close data-slot="dialog-close" render={asChild ? children : undefined} {...props}>{asChild ? undefined : children}</DialogPrimitive.Close>;
}
function DialogOverlay({ className, ...props }) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn("fixed inset-0 isolate z-50 bg-black/30 backdrop-blur-[2px] duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0", className)}
      {...props}
    />
  );
}
function DialogContent({ className, children, showCloseButton = true, ...props }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg p-5 text-sm outline-none",
          "bg-[rgb(var(--surface))] border border-[rgb(var(--border))] text-[rgb(var(--text))]",
          "shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
          "duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          "max-h-[95vh] overflow-y-auto",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}>
            <XIcon className="w-3.5 h-3.5" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}
function DialogHeader({ className, ...props }) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-1 pb-2", className)} {...props} />;
}
function DialogFooter({ className, showCloseButton = false, children, ...props }) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("-mx-5 -mb-5 flex flex-col-reverse gap-2 rounded-b-lg border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-5 py-3 sm:flex-row sm:justify-end", className)}
      {...props}
    >
      {children}
      {showCloseButton && <DialogPrimitive.Close render={<Button variant="outline" />}>Đóng</DialogPrimitive.Close>}
    </div>
  );
}
function DialogTitle({ className, ...props }) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-[15px] font-semibold text-[rgb(var(--text))] tracking-tight", className)} {...props} />;
}
function DialogDescription({ className, ...props }) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-[13px] text-[rgb(var(--text-3))]", className)} {...props} />;
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger }
