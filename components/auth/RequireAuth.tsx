"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import type { Role } from "@/lib/types";

export function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const router = useRouter();
  const { loading, userId, profile } = useAuth();

  React.useEffect(() => {
    if (loading) return;
    if (!userId) router.replace("/login");
    else if (roles && profile && !roles.includes(profile.role)) router.replace("/");
  }, [loading, userId, profile, roles, router]);

  if (loading) return <div className="p-6 text-sm text-zinc-600">Loading…</div>;
  if (!userId) return null;
  if (roles && profile && !roles.includes(profile.role)) return null;
  return <>{children}</>;
}
