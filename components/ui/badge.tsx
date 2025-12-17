"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "secondary" | "success" | "warn" | "danger";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  const styles: Record<BadgeVariant, string> = {
    default: "bg-zinc-900 text-white",
    secondary: "bg-zinc-100 text-zinc-900 border border-zinc-200",
    success: "bg-emerald-600 text-white",
    warn: "bg-amber-500 text-white",
    danger: "bg-red-600 text-white",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
