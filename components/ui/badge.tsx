import * as React from "react";
import { cn } from "./cn";

type Props = React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "success" | "warn" | "danger" };
const styles: Record<NonNullable<Props["variant"]>, string> = {
  default: "bg-zinc-100 text-zinc-900",
  success: "bg-emerald-100 text-emerald-800",
  warn: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
};

export function Badge({ className, variant = "default", ...props }: Props) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", styles[variant], className)} {...props} />
  );
}
