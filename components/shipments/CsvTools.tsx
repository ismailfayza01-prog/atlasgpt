"use client";

import React from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import type { ShipmentStatus } from "@/lib/types";
import { generateTrackingCode } from "@/lib/tracking";
import { supabase } from "@/lib/supabase";

type Row = {
  tracking_code?: string;
  customer_email?: string;
  origin?: string;
  destination?: string;
  weight_kg?: string;
  price_amount?: string;
  currency?: string;
  status?: ShipmentStatus;
  notes?: string;
};

export function CsvTools({ onDone }: { onDone: () => void }) {
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  function downloadTemplate() {
    const template: Row[] = [{
      tracking_code: "",
      customer_email: "",
      origin: "Tangier",
      destination: "Casablanca",
      weight_kg: "1.0",
      price_amount: "50",
      currency: "MAD",
      status: "created",
      notes: "Fragile",
    }];
    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "shipments_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv(file: File) {
    setBusy(true); setErr(null); setMsg(null);
    const text = await file.text();
    const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
    if (parsed.errors?.length) {
      setErr(parsed.errors[0].message);
      setBusy(false);
      return;
    }
    const rows = parsed.data;
    // Resolve customer emails to ids
    const emails = Array.from(new Set(rows.map(r => (r.customer_email ?? "").trim()).filter(Boolean)));
    let emailToId = new Map<string, string>();
    if (emails.length) {
      const { data, error } = await supabase.from("profiles").select("id,email").in("email", emails);
      if (!error && data) {
        for (const p of data as any[]) if (p.email) emailToId.set(p.email, p.id);
      }
    }

    const inserts = rows.map(r => ({
      tracking_code: (r.tracking_code?.trim() || generateTrackingCode()),
      customer_id: r.customer_email ? (emailToId.get(r.customer_email.trim()) ?? null) : null,
      origin: r.origin ?? null,
      destination: r.destination ?? null,
      weight_kg: r.weight_kg ? Number(r.weight_kg) : null,
      price_amount: r.price_amount ? Number(r.price_amount) : null,
      currency: r.currency ?? "MAD",
      status: (r.status ?? "created") as any,
      notes: r.notes ?? null,
    }));

    const { error: insErr } = await supabase.from("shipments").insert(inserts);
    if (insErr) setErr(insErr.message);
    else {
      setMsg(`Imported ${inserts.length} shipments.`);
      onDone();
    }
    setBusy(false);
  }

  async function exportCsv() {
    setBusy(true); setErr(null); setMsg(null);
    const { data, error } = await supabase.from("shipments").select("*").order("created_at", { ascending: false }).limit(5000);
    if (error) { setErr(error.message); setBusy(false); return; }
    const rows = (data as any[]).map(s => ({
      tracking_code: s.tracking_code,
      customer_id: s.customer_id,
      origin: s.origin,
      destination: s.destination,
      weight_kg: s.weight_kg,
      price_amount: s.price_amount,
      currency: s.currency,
      status: s.status,
      notes: s.notes,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "shipments_export.csv"; a.click();
    URL.revokeObjectURL(url);
    setMsg(`Exported ${rows.length} shipments.`);
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" onClick={downloadTemplate}>Download template</Button>
      <input ref={fileRef} className="hidden" type="file" accept=".csv,text/csv" onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) importCsv(f);
        if (fileRef.current) fileRef.current.value = "";
      }} />
      <Button variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()}>Import CSV</Button>
      <Button variant="secondary" disabled={busy} onClick={exportCsv}>Export CSV</Button>
      {busy && <span className="text-xs text-zinc-600">Working…</span>}
      {msg && <span className="text-xs text-emerald-700">{msg}</span>}
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
