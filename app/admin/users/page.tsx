"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type User = { id: string; email: string; name: string; role: string; active: boolean; createdAt: string };

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("customer");
  const [password, setPassword] = useState("");

  async function load() {
    const r = await fetch("/api/users");
    const d = await r.json().catch(() => []);
    if (!r.ok) setErr(d?.error || "Failed");
    else { setErr(null); setUsers(d); }
  }

  useEffect(() => { load(); }, []);

  async function create() {
    try {
      const r = await fetch("/api/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name, role, password })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "Create failed");
      setEmail(""); setName(""); setPassword("");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Create failed");
    }
  }

  async function toggle(id: string, active: boolean) {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active })
    });
    await load();
  }

  async function resetPassword(id: string) {
    const pw = prompt("New password (min 6 chars):");
    if (!pw) return;
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: pw })
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Users</h1>
      {err && <div className="text-sm text-red-600">{err}</div>}

      <Card>
        <CardHeader><CardTitle>Create user</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-3">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <select className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="admin">admin</option>
            <option value="agent">agent</option>
            <option value="customer">customer</option>
          </select>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temporary password" />
          <div className="md:col-span-4">
            <Button onClick={create} disabled={!email || !password || password.length < 6}>Create</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All users</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white p-3">
              <div>
                <div className="font-medium">{u.name} <span className="text-sm text-zinc-500">({u.email})</span></div>
                <div className="flex gap-2 items-center mt-1">
                  <Badge variant="secondary">{u.role}</Badge>
                  <Badge variant={u.active ? "success" : "danger"}>{u.active ? "active" : "disabled"}</Badge>
                </div>
                <div className="text-xs text-zinc-500 mt-1">Created: {new Date(u.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => resetPassword(u.id)}>Reset password</Button>
                <Button variant={u.active ? "destructive" : "default"} onClick={() => toggle(u.id, !u.active)}>
                  {u.active ? "Disable" : "Enable"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
