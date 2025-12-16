"use client";

import React from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => { if (userId) router.replace("/"); }, [userId, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
    else router.replace("/");
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">Login</h1>
          <p className="text-sm text-zinc-600">Use your Supabase Auth account.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <div className="text-xs mb-1 text-zinc-600">Email</div>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
            <div>
              <div className="text-xs mb-1 text-zinc-600">Password</div>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </div>
            {err && <div className="text-sm text-red-600">{err}</div>}
            <Button disabled={busy} className="w-full" type="submit">{busy ? "Signing in…" : "Sign in"}</Button>
          </form>
          <div className="mt-4 text-sm text-zinc-700">
            No account? <Link href="/signup">Sign up</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
