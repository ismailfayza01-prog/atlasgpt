"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

type Analytics = {
  totals: { shipments: number; users: number };
  byStatus: Record<string, number>;
  last30DaysNewShipments: number;
};

export default function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/analytics");
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setErr(d?.error || "Failed");
      else setData(d);
    })();
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.byStatus).map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Analytics</h1>
      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="grid md:grid-cols-3 gap-6">
        <Card><CardHeader><CardTitle>Total shipments</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{data?.totals.shipments ?? "-"}</CardContent></Card>
        <Card><CardHeader><CardTitle>Total users</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{data?.totals.users ?? "-"}</CardContent></Card>
        <Card><CardHeader><CardTitle>New shipments (30d)</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{data?.last30DaysNewShipments ?? "-"}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Shipments by status</CardTitle></CardHeader>
        <CardContent style={{ height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="status" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
