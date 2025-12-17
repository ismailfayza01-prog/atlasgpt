"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function TrackClient() {
  const sp = useSearchParams();
  const initial = sp.get("code") ?? "";

  const [code, setCode] = React.useState(initial);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [shipment, setShipment] = React.useState<any>(null);
  const [events, setEvents] = React.useState<any[]>([]);

  async function run(searchCode?: string) {
    const q = (searchCode ?? code).trim();
    if (!q) return;

    setLoading(true);
    setErr(null);
    setShipment(null);
    setEvents([]);

    try {
      const { data: s, error: e1 } = await supabase
        .from("shipments")
        .select("*")
        .eq("tracking_code", q)
        .maybeSingle();

      if (e1) throw e1;
      if (!s) {
        setErr("Tracking code not found.");
        return;
      }

      setShipment(s);

      const { data: ev, error: e2 } = await supabase
        .from("shipment_events")
        .select("*")
        .eq("shipment_id", s.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (e2) throw e2;
      setEvents(ev ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load tracking.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (initial.trim()) run(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full max-w-md">
          <div className="text-xs text-zinc-600 mb-1">Tracking code</div>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. APE-123456" />
        </div>
        <Button variant="primary" onClick={() => run()} disabled={loading || !code.trim()}>
          {loading ? "Searching…" : "Track"}
        </Button>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      {shipment && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold">{shipment.tracking_code}</div>
            <Badge variant="secondary">{String(shipment.status ?? "unknown")}</Badge>
          </div>
          <div className="text-xs text-zinc-600">
            {shipment.origin} → {shipment.destination}
          </div>
          <div className="text-xs text-zinc-500">Created: {new Date(shipment.created_at).toLocaleString()}</div>
        </div>
      )}

      {shipment && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Events</div>
          {events.length === 0 ? (
            <div className="text-sm text-zinc-600">No events yet.</div>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => (
                <div key={ev.id} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                  <div className="text-xs font-medium text-zinc-800">
                    {String(ev.status ?? "").replaceAll("_", " ")}
                  </div>
                  <div className="text-xs text-zinc-600">
                    {ev.location ?? "—"} • {new Date(ev.created_at).toLocaleString()}
                  </div>
                  {ev.note ? <div className="text-xs text-zinc-700 mt-1">{ev.note}</div> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
