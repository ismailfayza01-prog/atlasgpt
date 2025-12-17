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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const r = await fetch("/api/analytics", { cache: "no-store" });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error || "Failed to load analytics");
        if (!alive) return;
        setData(d as Analytics);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed");
        setData(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.byStatus ?? {})
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  }, [data]);

  const hasChart = chartData.length > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Analytics</h1>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total shipments</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {loading ? "…" : data?.totals.shipments ?? "-"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total users</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {loading ? "…" : data?.totals.users ?? "-"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New shipments (30d)</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {loading ? "…" : data?.last30DaysNewShipments ?? "-"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shipments by status</CardTitle>
        </CardHeader>

        <CardContent style={{ height: 360 }}>
          {!hasChart ? (
            <div className="text-sm text-zinc-600">
              {loading ? "Loading chart…" : "No status data yet."}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="status" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
