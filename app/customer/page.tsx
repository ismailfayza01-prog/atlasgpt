"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Shipment = {
  id: string;
  trackingNumber: string;
  origin: string;
  destination: string;
  status: string;
  updatedAt: string;
  history: { at: string; status: string; note?: string }[];
};

export default function CustomerPage() {
  const [me, setMe] = useState<any>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/me");
      const m = await r.json().catch(() => ({}));
      if (r.ok) setMe(m);
      const s = await fetch("/api/shipments?mine=1");
      const d = await s.json().catch(() => []);
      if (!s.ok) setErr(d?.error || "Failed");
      else setShipments(d);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Customer portal</h1>
      {me && <div className="text-sm text-zinc-700">Signed in as <b>{me.email}</b></div>}
      {err && <div className="text-sm text-red-600">{err}</div>}

      <Card>
        <CardHeader><CardTitle>Your shipments</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {shipments.map(s => (
            <div key={s.id} className="rounded-md border border-zinc-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.trackingNumber}</div>
                  <div className="text-sm text-zinc-600">{s.origin} → {s.destination}</div>
                </div>
                <Badge variant="secondary">{s.status}</Badge>
              </div>
              <div className="text-xs text-zinc-500 mt-1">Updated: {new Date(s.updatedAt).toLocaleString()}</div>
            </div>
          ))}
          {!shipments.length && <div className="text-sm text-zinc-500">No shipments assigned to your email.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
