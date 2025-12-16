"use client";

import React from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setMsg(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) setErr(error.message);
    else setMsg("Account created. If email confirmation is enabled, check your email, then login.");
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">Create account</h1>
          <p className="text-sm text-zinc-600">Customers default to role <b>customer</b>.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <div className="text-xs mb-1 text-zinc-600">Full name</div>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <div className="text-xs mb-1 text-zinc-600">Email</div>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
            <div>
              <div className="text-xs mb-1 text-zinc-600">Password</div>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} />
            </div>
            {err && <div className="text-sm text-red-600">{err}</div>}
            {msg && <div className="text-sm text-emerald-700">{msg}</div>}
            <Button disabled={busy} className="w-full" type="submit">{busy ? "Creating…" : "Create account"}</Button>
          </form>
          <div className="mt-4 text-sm text-zinc-700">
            Already have an account? <Link href="/login">Login</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
