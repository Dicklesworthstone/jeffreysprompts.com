"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Icons
const CheckIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const XIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const InfoIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
  </svg>
);

const WarningIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    // Return a no-op implementation if context is not available
    return {
      toast: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {},
    };
  }

  return {
    toast: context.addToast,
    success: (title: string, message?: string, duration?: number) =>
      context.addToast({ type: "success", title, message, duration }),
    error: (title: string, message?: string, duration?: number) =>
      context.addToast({ type: "error", title, message, duration }),
    info: (title: string, message?: string, duration?: number) =>
      context.addToast({ type: "info", title, message, duration }),
    warning: (title: string, message?: string, duration?: number) =>
      context.addToast({ type: "warning", title, message, duration }),
  };
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: () => void;
}) {
  const [exiting, setExiting] = React.useState(false);

  React.useEffect(() => {
    const duration = toast.duration ?? 5000;
    // Guard against durations < 300ms to prevent negative timeout
    const exitDelay = Math.max(0, duration - 300);
    const exitTimer = setTimeout(() => {
      setExiting(true);
    }, exitDelay);

    const removeTimer = setTimeout(() => {
      onRemove();
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.duration, onRemove]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(onRemove, 300);
  };

  const icons = {
    success: <CheckIcon />,
    error: <XIcon />,
    info: <InfoIcon />,
    warning: <WarningIcon />,
  };

  return (
    <div
      className={cn(
        "toast relative",
        `toast-${toast.type}`,
        exiting && "toast-exit"
      )}
      role="alert"
    >
      <span className="toast-icon">{icons[toast.type]}</span>
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        {toast.message && (
          <div className="toast-message">{toast.message}</div>
        )}
      </div>
      <button
        onClick={handleClose}
        className="toast-close"
        aria-label="Close notification"
      >
        <CloseIcon />
      </button>
      <div className="toast-progress" style={{ animationDuration: `${toast.duration ?? 5000}ms` }} />
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
    let id = "";
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      id = crypto.randomUUID();
    } else {
      id = Math.random().toString(36).slice(2, 9);
    }
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Standalone toaster that works without context
export function Toaster() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Listen for custom toast events
  React.useEffect(() => {
    const handleToast = (event: CustomEvent<Omit<Toast, "id">>) => {
      let id = "";
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        id = crypto.randomUUID();
      } else {
        id = Math.random().toString(36).slice(2, 9);
      }
      setToasts((prev) => [...prev, { ...event.detail, id }]);
    };

    window.addEventListener("toast" as string, handleToast as EventListener);
    return () => {
      window.removeEventListener("toast" as string, handleToast as EventListener);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

// Helper function to show toast from anywhere (dispatches custom event)
export function showToast(toast: Omit<Toast, "id">) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("toast", { detail: toast }));
  }
}

// Convenience functions
export const toast = {
  success: (title: string, message?: string, duration?: number) =>
    showToast({ type: "success", title, message, duration }),
  error: (title: string, message?: string, duration?: number) =>
    showToast({ type: "error", title, message, duration }),
  info: (title: string, message?: string, duration?: number) =>
    showToast({ type: "info", title, message, duration }),
  warning: (title: string, message?: string, duration?: number) =>
    showToast({ type: "warning", title, message, duration }),
};
