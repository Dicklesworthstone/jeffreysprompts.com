"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";

// Module-level counter to track open sheets for proper overflow management
let openSheetCount = 0;

const CloseIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Spring physics for natural feel
const springConfig = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: BottomSheetProps) {
  const [isMounted, setIsMounted] = React.useState(false);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  // Motion value for drag-to-dismiss
  const y = useMotionValue(0);
  const backdropOpacity = useTransform(y, [0, 300], [1, 0]);

  // Handle escape key and body scroll lock
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      // Only lock scroll on first open sheet
      if (openSheetCount === 0) {
        document.body.style.overflow = "hidden";
      }
      openSheetCount++;
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (open) {
        openSheetCount--;
        // Only restore scroll when all sheets are closed
        if (openSheetCount === 0) {
          document.body.style.overflow = "";
        }
      }
    };
  }, [open, onClose]);

  // Portal mounting
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset y position when opening
  React.useEffect(() => {
    if (open) {
      y.set(0);
    }
  }, [open, y]);

  // Handle drag start
  const handleDragStart = React.useCallback(() => {
    setIsDragging(true);
  }, []);

  // Handle drag end - close if dragged down enough or with velocity
  const handleDragEnd = React.useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      // Close if dragged down more than 80px or with velocity > 300
      if (info.offset.y > 80 || info.velocity.y > 300) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          key="bottom-sheet-overlay"
          className="fixed inset-0 z-[9998]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            style={{ opacity: backdropOpacity }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "bottom-sheet-title" : undefined}
            className={cn(
              "fixed left-0 right-0 bottom-0 max-h-[85vh] flex flex-col",
              "rounded-t-2xl bg-card shadow-2xl",
              "pb-[env(safe-area-inset-bottom)]",
              className
            )}
            style={{ y }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={springConfig}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 500 }}
            dragElastic={{ top: 0.1, bottom: 0.6 }}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* Drag handle - larger touch target for iOS */}
            <div
              className="flex justify-center py-4 cursor-grab active:cursor-grabbing"
              style={{ touchAction: "none" }}
            >
              <div className="h-1.5 w-12 rounded-full bg-muted-foreground/40" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-5 pb-3 border-b border-border/30">
                <h2 id="bottom-sheet-title" className="text-lg font-semibold text-foreground">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="size-11 -mr-2 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted transition-colors touch-manipulation"
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>
            )}

            {/* Content - disable drag when scrolling content */}
            <div
              ref={contentRef}
              className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-2"
              style={{ touchAction: isDragging ? "none" : "pan-y" }}
              onPointerDown={(e) => {
                // Prevent drag from starting when touching scrollable content
                if (contentRef.current && contentRef.current.scrollHeight > contentRef.current.clientHeight) {
                  e.stopPropagation();
                }
              }}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// Helper hook to manage bottom sheet state
export function useBottomSheet() {
  const [isOpen, setIsOpen] = React.useState(false);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

// Context for bottom sheet actions
interface BottomSheetAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

export function BottomSheetActions({
  actions,
  onClose,
}: {
  actions: BottomSheetAction[];
  onClose: () => void;
}) {
  return (
    <div className="space-y-1">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => {
            action.onClick();
            onClose();
          }}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left",
            "hover:bg-muted active:bg-muted/70 active:scale-[0.98] transition-all touch-manipulation",
            action.destructive && "text-destructive hover:bg-destructive/10"
          )}
        >
          {action.icon && (
            <span className="size-5 text-muted-foreground">{action.icon}</span>
          )}
          <span className="font-medium">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
