"use client";

import React from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function RiderPage() {
  return (
    <RequireAuth roles={["rider","agent","admin"]}>
      <RiderInner />
    </RequireAuth>
  );
}

function RiderInner() {
  const { profile } = useAuth();
  const [watching, setWatching] = React.useState(false);
  const [last, setLast] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const watchId = React.useRef<number | null>(null);

  async function pushPosition(pos: GeolocationPosition) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accuracy = pos.coords.accuracy ?? null;
    const speed = pos.coords.speed ?? null;
    const heading = pos.coords.heading ?? null;

    setLast({ lat, lng, accuracy, speed, heading, t: new Date().toISOString() });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("rider_positions").insert([{
      rider_id: user.id,
      lat,
      lng,
      accuracy_m: accuracy,
      speed_mps: speed,
      heading_deg: heading,
    }]);
    if (error) setErr(error.message);
  }

  function start() {
    setErr(null);
    if (!navigator.geolocation) { setErr("Geolocation not supported."); return; }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => pushPosition(pos),
      (e) => setErr(e.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    setWatching(true);
  }

  function stop() {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setWatching(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">Rider live tracking</h1>
          <p className="text-sm text-zinc-600">Runs best on mobile (HTTPS required in production).</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">Role: <b>{profile?.role}</b></div>
          <div className="flex gap-2">
            {!watching ? (
              <Button onClick={start}>Start sending GPS</Button>
            ) : (
              <Button variant="secondary" onClick={stop}>Stop</Button>
            )}
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          {last && (
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs text-zinc-700">
              <div><b>Last point</b> {last.t}</div>
              <div>lat={last.lat} lng={last.lng}</div>
              <div>accuracy={last.accuracy}m speed={last.speed}m/s heading={last.heading}</div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="text-sm font-medium">Tips</div>
        </CardHeader>
        <CardContent className="text-sm text-zinc-700 space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li>On iPhone: Safari needs location permission, and your site must be HTTPS in production.</li>
            <li>To reduce database writes, you can throttle inserts (e.g., every 5–10 seconds) and/or only when distance changes.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
