"use client";

import React from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import type { ShipmentStatus } from "@/lib/types";
import Link from "next/link";

type Counts = Record<ShipmentStatus, number>;

const statuses: ShipmentStatus[] = ["requested","created","picked_up","in_transit","out_for_delivery","delivered","cancelled"];

export default function HomePage() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}

function Dashboard() {
  const [loading, setLoading] = React.useState(true);
  const [counts, setCounts] = React.useState<Counts>(() => Object.fromEntries(statuses.map(s => [s, 0])) as Counts);
  const [total, setTotal] = React.useState(0);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("shipments").select("status", { count: "exact" });
      if (!error && data) {
        const c: any = Object.fromEntries(statuses.map(s => [s, 0]));
        for (const row of data as any[]) c[row.status] = (c[row.status] ?? 0) + 1;
        setCounts(c);
        setTotal((data as any[]).length);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-600">Operational overview and quick links.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/shipments" className="text-sm">Go to Shipments →</Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="text-sm font-medium">Total shipments</div>
            <div className="text-xs text-zinc-500">Visible under your role’s policies</div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{loading ? "…" : total}</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="text-sm font-medium">Status distribution</div>
            <div className="text-xs text-zinc-500">Basic bar chart</div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-zinc-600">Loading…</div>
            ) : (
              <div className="space-y-2">
                {statuses.map(s => {
                  const v = counts[s] ?? 0;
                  const pct = total > 0 ? Math.round((v / total) * 100) : 0;
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <div className="w-36 text-xs text-zinc-700">{s.replaceAll("_", " ")}</div>
                      <div className="flex-1 rounded-full bg-zinc-100 h-3 overflow-hidden">
                        <div className="h-3 bg-zinc-900" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-16 text-right text-xs text-zinc-600">{v} ({pct}%)</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="text-sm font-medium">Quick start</div>
          <div className="text-xs text-zinc-500">If you just created your Supabase project</div>
        </CardHeader>
        <CardContent className="text-sm text-zinc-700 space-y-2">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Sign up, then set your role to <b>admin</b> in the <code>profiles</code> table.</li>
            <li>Create a few shipments (Shipments page).</li>
            <li>Open Dispatch and Rider pages to test live tracking.</li>
            <li>Generate label/invoice PDFs and confirm they upload to the <code>documents</code> bucket.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
