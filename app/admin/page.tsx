"use client";

import React from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import type { Profile, Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function AdminPage() {
  return (
    <RequireAuth roles={["admin"]}>
      <AdminInner />
    </RequireAuth>
  );
}

function AdminInner() {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<Profile[]>([]);
  const [q, setQ] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null); setMsg(null);
    const query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(2000);
    const { data, error } = q.trim()
      ? await query.ilike("email", `%${q.trim()}%`)
      : await query;
    if (error) setErr(error.message);
    else setRows((data ?? []) as any);
    setLoading(false);
  }

  React.useEffect(() => { load(); }, []);

  async function setRole(id: string, role: Role) {
    setErr(null); setMsg(null);
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) setErr(error.message);
    else { setMsg("Updated."); await load(); }
  }

  async function setDisabled(id: string, is_disabled: boolean) {
    setErr(null); setMsg(null);
    const { error } = await supabase.from("profiles").update({ is_disabled }).eq("id", id);
    if (error) setErr(error.message);
    else { setMsg("Updated."); await load(); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="text-sm text-zinc-600">User management and role control (via RLS).</p>
        </div>
        <div className="flex gap-2 items-center">
          <Input className="w-72" placeholder="Search email…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant="secondary" onClick={load}>Search</Button>
        </div>
      </div>

      {msg && <div className="text-sm text-emerald-700">{msg}</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}

      <Card>
        <CardHeader>
          <div className="text-sm font-medium">Users</div>
          <div className="text-xs text-zinc-500">{loading ? "Loading…" : `${rows.length} visible users`}</div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-zinc-100">
            {rows.map(u => (
              <div key={u.id} className="py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{u.email ?? u.id}</div>
                  <div className="text-xs text-zinc-600">{u.full_name ?? "—"}</div>
                  <div className="text-xs text-zinc-500">{new Date(u.created_at).toLocaleString()}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{u.role}</Badge>
                  {u.is_disabled && <Badge variant="danger">disabled</Badge>}
                  <select className="h-9 rounded-xl border border-zinc-200 bg-white px-2 text-sm" value={u.role} onChange={(e) => setRole(u.id, e.target.value as any)}>
                    {["admin","agent","customer","rider"].map(r => (<option key={r} value={r}>{r}</option>))}
                  </select>
                  <Button size="sm" variant="secondary" onClick={() => setDisabled(u.id, !u.is_disabled)}>
                    {u.is_disabled ? "Enable" : "Disable"}
                  </Button>
                </div>
              </div>
            ))}
            {!loading && rows.length === 0 && <div className="py-8 text-sm text-zinc-600">No users visible.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
