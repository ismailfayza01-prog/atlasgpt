"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Shipment = {
  id: string;
  trackingNumber: string;
  customerName: string;
  customerEmail: string;
  origin: string;
  destination: string;
  status: string;
  updatedAt: string;
};

const statuses = ["created","received","in_transit","customs","out_for_delivery","delivered","exception"];

export default function AdminShipments() {
  const [items, setItems] = useState<Shipment[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [newCust, setNewCust] = useState("Walk-in Customer");
  const [newEmail, setNewEmail] = useState("customer@atlas.local");
  const [newOrigin, setNewOrigin] = useState("Spain (Madrid)");
  const [newDest, setNewDest] = useState("Morocco (Tangier)");

  async function load() {
    const r = await fetch("/api/shipments");
    const d = await r.json().catch(() => []);
    if (!r.ok) setErr(d?.error || "Failed");
    else { setErr(null); setItems(d); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter(s =>
      s.trackingNumber.toLowerCase().includes(qq) ||
      s.customerName.toLowerCase().includes(qq) ||
      s.destination.toLowerCase().includes(qq)
    );
  }, [items, q]);

  async function createShipment() {
    setCreating(true);
    try {
      const r = await fetch("/api/shipments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerName: newCust,
          customerEmail: newEmail,
          origin: newOrigin,
          destination: newDest
        })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "Create failed");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/shipments/${id}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status })
    });
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/shipments/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Shipments</h1>
        <Button variant="outline" onClick={() => fetch("/api/auth/logout", { method: "POST" }).then(() => location.href="/")}>
          Logout
        </Button>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <Card>
        <CardHeader><CardTitle>Create shipment</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-3">
          <Input value={newCust} onChange={(e) => setNewCust(e.target.value)} placeholder="Customer name" />
          <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Customer email" />
          <Input value={newOrigin} onChange={(e) => setNewOrigin(e.target.value)} placeholder="Origin" />
          <Input value={newDest} onChange={(e) => setNewDest(e.target.value)} placeholder="Destination" />
          <div className="md:col-span-4">
            <Button onClick={createShipment} disabled={creating}>{creating ? "Creating..." : "Create"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All shipments</span>
            <div className="w-72"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tracking/customer/destination" /></div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.map(s => (
            <div key={s.id} className="rounded-md border border-zinc-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{s.trackingNumber}</div>
                  <div className="text-sm text-zinc-600">{s.origin} → {s.destination}</div>
                  <div className="text-xs text-zinc-500">{s.customerName} • {s.customerEmail}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{s.status}</Badge>
                  <select
                    className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm"
                    value={s.status}
                    onChange={(e) => updateStatus(s.id, e.target.value)}
                  >
                    {statuses.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                  <Button variant="destructive" onClick={() => remove(s.id)}>Delete</Button>
                </div>
              </div>
              <div className="text-xs text-zinc-500 mt-2">Updated: {new Date(s.updatedAt).toLocaleString()}</div>
            </div>
          ))}
          {!filtered.length && <div className="text-sm text-zinc-500">No shipments found.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
