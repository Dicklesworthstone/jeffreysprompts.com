import type { HTMLAttributes } from "react"

import { cn } from "@/lib/utils"

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Use the sweep variant for a more premium shimmer effect */
  variant?: "default" | "sweep" | "pulse"
}

function Skeleton({
  className,
  variant = "default",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-lg",
        variant === "default" && "animate-shimmer",
        variant === "sweep" && "skeleton-shimmer",
        variant === "pulse" && "skeleton animate-pulse",
        className
      )}
      {...props}
    />
  )
}

function SkeletonText({
  className,
  lines = 3,
  ...props
}: HTMLAttributes<HTMLDivElement> & { lines?: number }) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 && "w-3/4" // Last line is shorter
          )}
        />
      ))}
    </div>
  )
}

function SkeletonCard({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-6 space-y-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  )
}

function SkeletonAvatar({
  className,
  size = "md",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  size?: "sm" | "md" | "lg"
}) {
  const sizeClasses = {
    sm: "size-8",
    md: "size-10",
    lg: "size-12",
  }

  return (
    <Skeleton
      className={cn(
        "rounded-full",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

function SkeletonButton({
  className,
  size = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  size?: "sm" | "default" | "lg"
}) {
  const sizeClasses = {
    sm: "h-8 w-20",
    default: "h-10 w-24",
    lg: "h-12 w-32",
  }

  return (
    <Skeleton
      className={cn(
        "rounded-lg",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

function SkeletonInput({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonInput,
}
