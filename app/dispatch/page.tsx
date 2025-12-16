"use client";

import React from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import type { RiderPosition, Profile } from "@/lib/types";
import { LeafletMap } from "@/components/maps/LeafletMap";
import { Badge } from "@/components/ui/badge";

export default function DispatchPage() {
  return (
    <RequireAuth roles={["admin","agent"]}>
      <DispatchInner />
    </RequireAuth>
  );
}

function DispatchInner() {
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [latest, setLatest] = React.useState<Map<string, RiderPosition>>(new Map());
  const [err, setErr] = React.useState<string | null>(null);

  async function loadRiders() {
    const { data, error } = await supabase.from("profiles").select("*").eq("role", "rider").eq("is_disabled", false).limit(200);
    if (error) { setErr(error.message); return; }
    setProfiles((data ?? []) as any);
  }

  async function loadLatestPositions() {
    const { data, error } = await supabase.rpc("latest_rider_positions");
    if (error) { setErr(error.message); return; }
    const m = new Map<string, RiderPosition>();
    for (const row of (data ?? []) as any[]) m.set(row.rider_id, row);
    setLatest(m);
  }

  React.useEffect(() => {
    loadRiders();
    loadLatestPositions();

    // Realtime: listen to inserts on rider_positions
    const channel = supabase.channel("rider_positions_live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rider_positions" }, (payload: any) => {
        const row = payload.new as RiderPosition;
        setLatest(prev => {
          const next = new Map(prev);
          next.set(row.rider_id, row);
          return next;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const markers = profiles
    .map(p => {
      const pos = latest.get(p.id);
      if (!pos) return null;
      return {
        id: p.id,
        lat: pos.lat,
        lng: pos.lng,
        label: `${p.email ?? p.id}\n${new Date(pos.recorded_at).toLocaleTimeString()}`,
      };
    })
    .filter(Boolean) as any[];

  const center = markers.length ? { lat: markers[0].lat, lng: markers[0].lng } : { lat: 35.7595, lng: -5.83395 }; // Tangier default

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dispatch — Live rider map</h1>
        <p className="text-sm text-zinc-600">Realtime GPS points via Supabase Realtime.</p>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Map</div>
              <div className="text-xs text-zinc-500">Markers update on new GPS inserts</div>
            </div>
            <div className="text-xs text-zinc-600">
              Riders: <Badge>{profiles.length}</Badge> • Active positions: <Badge>{markers.length}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LeafletMap markers={markers} center={center} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="text-sm font-medium">Latest points</div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-zinc-100">
            {profiles.map(p => {
              const pos = latest.get(p.id);
              return (
                <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.email ?? p.id}</div>
                    <div className="text-xs text-zinc-600">Last: {pos ? new Date(pos.recorded_at).toLocaleString() : "—"}</div>
                  </div>
                  <div className="text-xs text-zinc-600">
                    {pos ? `(${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)})` : "No data"}
                  </div>
                </div>
              );
            })}
            {profiles.length === 0 && <div className="py-6 text-sm text-zinc-600">No riders found. Set role to <b>rider</b> for a user in Admin.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
