"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { Shipment, ShipmentEvent } from "@/lib/types";
import { useSearchParams } from "next/navigation";

export default function TrackPage() {
  const sp = useSearchParams();
  const initial = sp.get("code") ?? "";
  const [code, setCode] = React.useState(initial);
  const [shipment, setShipment] = React.useState<Shipment | null>(null);
  const [events, setEvents] = React.useState<ShipmentEvent[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function lookup() {
    setBusy(true); setErr(null);
    setShipment(null); setEvents([]);
    const { data, error } = await supabase.from("shipments").select("*").eq("tracking_code", code.trim()).maybeSingle();
    if (error) { setErr(error.message); setBusy(false); return; }
    if (!data) { setErr("No shipment found for this code."); setBusy(false); return; }
    setShipment(data as any);
    const { data: evs } = await supabase.from("shipment_events").select("*").eq("shipment_id", (data as any).id).order("created_at", { ascending: false }).limit(50);
    setEvents((evs ?? []) as any);
    setBusy(false);
  }

  React.useEffect(() => {
    if (initial) lookup();
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">Track a shipment</h1>
          <p className="text-sm text-zinc-600">Public tracking by tracking code.</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="APE-XXXXXXXXXX" />
            <Button onClick={lookup} disabled={busy}>{busy ? "Searching…" : "Track"}</Button>
          </div>
          {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
        </CardContent>
      </Card>

      {shipment && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="font-semibold">{shipment.tracking_code}</div>
              <Badge>{shipment.status.replaceAll("_"," ")}</Badge>
            </div>
            <div className="text-xs text-zinc-600">{shipment.origin} → {shipment.destination}</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {events.map(e => (
                <div key={e.id} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                  <div className="text-xs font-medium">{e.status.replaceAll("_"," ")}</div>
                  <div className="text-xs text-zinc-600">{e.location ?? "—"} • {new Date(e.created_at).toLocaleString()}</div>
                  {e.note && <div className="text-xs mt-1">{e.note}</div>}
                </div>
              ))}
              {events.length === 0 && <div className="text-sm text-zinc-600">No tracking events yet.</div>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
