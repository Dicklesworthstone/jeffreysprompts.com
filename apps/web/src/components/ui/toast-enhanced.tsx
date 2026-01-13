"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Enhanced Toast System - Stripe-level polish with:
 * - Spring-based enter/exit animations
 * - Swipe-to-dismiss on mobile
 * - Progress bar with smooth animation
 * - Undo action support
 * - Glass-morphism styling
 * - Stacked toast animation
 */

// ============================================================================
// Icons
// ============================================================================

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={cn("size-5", className)} viewBox="0 0 24 24" fill="none">
    <motion.circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    />
    <motion.path
      d="M8 12l2.5 2.5L16 9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    />
  </svg>
);

const XCircleIcon = ({ className }: { className?: string }) => (
  <svg className={cn("size-5", className)} viewBox="0 0 24 24" fill="none">
    <motion.circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    />
    <motion.path
      d="M15 9l-6 6M9 9l6 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    />
  </svg>
);

const InfoCircleIcon = ({ className }: { className?: string }) => (
  <svg className={cn("size-5", className)} viewBox="0 0 24 24" fill="none">
    <motion.circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    />
    <motion.path
      d="M12 8h.01M12 12v4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    />
  </svg>
);

const WarningIcon = ({ className }: { className?: string }) => (
  <svg className={cn("size-5", className)} viewBox="0 0 24 24" fill="none">
    <motion.path
      d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    />
  </svg>
);

const CloseIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ============================================================================
// Types
// ============================================================================

type ToastType = "success" | "error" | "info" | "warning";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: ToastAction;
  dismissible?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Omit<Toast, "id">>) => void;
}

// ============================================================================
// Context
// ============================================================================

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function useEnhancedToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    return {
      toast: () => "",
      success: () => "",
      error: () => "",
      info: () => "",
      warning: () => "",
      dismiss: () => {},
      update: () => {},
    };
  }

  return {
    toast: context.addToast,
    success: (title: string, message?: string, options?: Partial<Toast>) =>
      context.addToast({ type: "success", title, message, ...options }),
    error: (title: string, message?: string, options?: Partial<Toast>) =>
      context.addToast({ type: "error", title, message, ...options }),
    info: (title: string, message?: string, options?: Partial<Toast>) =>
      context.addToast({ type: "info", title, message, ...options }),
    warning: (title: string, message?: string, options?: Partial<Toast>) =>
      context.addToast({ type: "warning", title, message, ...options }),
    dismiss: context.removeToast,
    update: context.updateToast,
  };
}

// ============================================================================
// Toast Item Component
// ============================================================================

const springConfig = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

const typeStyles: Record<ToastType, { icon: React.FC<{ className?: string }>; colors: string }> = {
  success: {
    icon: CheckCircleIcon,
    colors: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  error: {
    icon: XCircleIcon,
    colors: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  },
  info: {
    icon: InfoCircleIcon,
    colors: "text-sky-500 bg-sky-500/10 border-sky-500/20",
  },
  warning: {
    icon: WarningIcon,
    colors: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
};

interface ToastItemProps {
  toast: Toast;
  index: number;
  onRemove: () => void;
}

function ToastItem({ toast, index, onRemove }: ToastItemProps) {
  const [progress, setProgress] = React.useState(100);
  const [isPaused, setIsPaused] = React.useState(false);
  const duration = toast.duration ?? 5000;
  const dismissible = toast.dismissible !== false;

  const { icon: Icon, colors } = typeStyles[toast.type];

  // Progress animation
  React.useEffect(() => {
    if (isPaused) return;

    const startTime = Date.now();
    const startProgress = progress;
    const interval = 16; // ~60fps

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPercent = startProgress - (elapsed / duration) * 100;
      
      if (remainingPercent <= 0) {
        setProgress(0);
        clearInterval(timer);
      } else {
        setProgress(remainingPercent);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [duration, isPaused]); // Re-binds when paused state changes, capturing new 'progress' as start point

  // Auto-dismiss when progress reaches 0
  React.useEffect(() => {
    if (progress <= 0) {
      onRemove();
    }
  }, [progress, onRemove]);

  // Swipe-to-dismiss handler
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 500) {
      onRemove();
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{
        opacity: 1,
        x: 0,
        scale: 1,
        y: index * -8, // Stacking effect
      }}
      exit={{
        opacity: 0,
        x: 100,
        scale: 0.9,
        transition: { duration: 0.2 },
      }}
      transition={springConfig}
      drag={dismissible ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={cn(
        "relative w-full max-w-sm overflow-hidden",
        "rounded-xl border shadow-lg",
        "bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl",
        "border-neutral-200/50 dark:border-neutral-800/50",
        index > 0 && "pointer-events-none"
      )}
      style={{
        zIndex: 100 - index,
        transformOrigin: "top right",
      }}
      role="alert"
      aria-live="polite"
    >
      {/* Accent bar */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-0.5",
          toast.type === "success" && "bg-gradient-to-r from-emerald-400 to-emerald-600",
          toast.type === "error" && "bg-gradient-to-r from-rose-400 to-rose-600",
          toast.type === "info" && "bg-gradient-to-r from-sky-400 to-sky-600",
          toast.type === "warning" && "bg-gradient-to-r from-amber-400 to-amber-600"
        )}
      />

      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.1 }}
          className={cn("shrink-0 size-9 rounded-full flex items-center justify-center", colors)}
        >
          <Icon className="size-5" />
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {toast.title}
          </p>
          {toast.message && (
            <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
              {toast.message}
            </p>
          )}
          {toast.action && (
            <motion.button
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={toast.action.onClick}
              className={cn(
                "mt-2 text-sm font-medium",
                "text-indigo-600 dark:text-indigo-400",
                "hover:text-indigo-700 dark:hover:text-indigo-300",
                "transition-colors"
              )}
            >
              {toast.action.label}
            </motion.button>
          )}
        </div>

        {/* Close button */}
        {dismissible && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={onRemove}
            className={cn(
              "shrink-0 size-7 rounded-full",
              "flex items-center justify-center",
              "text-neutral-400 hover:text-neutral-600",
              "dark:text-neutral-500 dark:hover:text-neutral-300",
              "hover:bg-neutral-100 dark:hover:bg-neutral-800",
              "transition-colors"
            )}
            aria-label="Dismiss"
          >
            <CloseIcon />
          </motion.button>
        )}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-100 dark:bg-neutral-800">
        <motion.div
          className={cn(
            "h-full origin-left",
            toast.type === "success" && "bg-emerald-500",
            toast.type === "error" && "bg-rose-500",
            toast.type === "info" && "bg-sky-500",
            toast.type === "warning" && "bg-amber-500"
          )}
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>
    </motion.div>
  );
}

// ============================================================================
// Toast Container
// ============================================================================

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed z-[9999] pointer-events-none",
        "top-4 right-4 sm:top-6 sm:right-6",
        "flex flex-col items-end gap-2",
        "max-h-[calc(100vh-2rem)]"
      )}
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.slice(0, 5).map((toast, index) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem
              toast={toast}
              index={index}
              onRemove={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

// ============================================================================
// Provider
// ============================================================================

export function EnhancedToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, "id">): string => {
    const id = crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [{ ...toast, id }, ...prev]);
    return id;
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = React.useCallback((id: string, updates: Partial<Omit<Toast, "id">>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const contextValue = React.useMemo(
    () => ({ toasts, addToast, removeToast, updateToast }),
    [toasts, addToast, removeToast, updateToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

// ============================================================================
// Standalone API (event-based)
// ============================================================================

export function showEnhancedToast(toast: Omit<Toast, "id">): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("enhanced-toast", { detail: toast }));
  }
}

export const enhancedToast = {
  success: (title: string, message?: string, options?: Partial<Toast>) =>
    showEnhancedToast({ type: "success", title, message, ...options }),
  error: (title: string, message?: string, options?: Partial<Toast>) =>
    showEnhancedToast({ type: "error", title, message, ...options }),
  info: (title: string, message?: string, options?: Partial<Toast>) =>
    showEnhancedToast({ type: "info", title, message, ...options }),
  warning: (title: string, message?: string, options?: Partial<Toast>) =>
    showEnhancedToast({ type: "warning", title, message, ...options }),
};

// Standalone toaster that listens for events
export function EnhancedToaster() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  React.useEffect(() => {
    const handleToast = (event: CustomEvent<Omit<Toast, "id">>) => {
      const id = crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 9);
      setToasts((prev) => [{ ...event.detail, id }, ...prev]);
    };

    window.addEventListener("enhanced-toast" as string, handleToast as EventListener);
    return () => {
      window.removeEventListener("enhanced-toast" as string, handleToast as EventListener);
    };
  }, []);

  return <ToastContainer toasts={toasts} removeToast={removeToast} />;
}
