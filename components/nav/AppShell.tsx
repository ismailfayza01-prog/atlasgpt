"use client";

import Link from "next/link";
import React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { userId, email, profile, signOut } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="no-underline">
              <div className="font-semibold tracking-tight">Atlas Parcel Europe</div>
              <div className="text-xs text-zinc-500 -mt-0.5">Supabase MVP</div>
            </Link>
            <nav className="hidden md:flex items-center gap-3 text-sm">
              <Link href="/shipments">Shipments</Link>
              <Link href="/track">Track</Link>
              {(profile?.role === "admin" || profile?.role === "agent") && <Link href="/dispatch">Dispatch</Link>}
              {profile?.role === "admin" && <Link href="/admin">Admin</Link>}
              {profile?.role === "rider" && <Link href="/rider">Rider</Link>}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {!userId ? (
              <div className="flex items-center gap-2">
                <Link className="text-sm" href="/login">Login</Link>
                <Link className="text-sm" href="/signup">Sign up</Link>
              </div>
            ) : (
              <>
                <div className="hidden sm:flex flex-col items-end">
                  <div className="text-sm">{email}</div>
                  {profile?.role && <div className="text-xs text-zinc-600">Role: <Badge className="ml-1" variant="default">{profile.role}</Badge></div>}
                </div>
                <Button variant="secondary" onClick={() => signOut()}>Sign out</Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="border-t border-zinc-200 py-6">
        <div className="mx-auto max-w-6xl px-4 text-xs text-zinc-500">
          MVP scaffold — extend to production by tightening RLS, private storage, audit logs, and server-side PDF generation.
        </div>
      </footer>
    </div>
  );
}
