"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-3">
          Something went wrong
        </h1>

        <p className="text-muted-foreground mb-2">
          An unexpected error occurred. Don&apos;t worry, it&apos;s been logged.
        </p>

        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono mb-6">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>

          <Button variant="outline" asChild>
            <Link href="/" className="gap-2">
              <Home className="h-4 w-4" />
              Go home
            </Link>
          </Button>
        </div>

        <div className="pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">
            If this problem persists, please report it.
          </p>
          <a
            href="https://github.com/Dicklesworthstone/jeffreysprompts.com/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Bug className="h-3 w-3" />
            Report an issue
          </a>
        </div>
      </div>
    </div>
  );
}
