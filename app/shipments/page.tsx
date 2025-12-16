"use client";

import React from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { Shipment, ShipmentEvent, ShipmentStatus } from "@/lib/types";
import { ShipmentForm, ShipmentDraft } from "@/components/shipments/ShipmentForm";
import { CsvTools } from "@/components/shipments/CsvTools";

export default function ShipmentsPage() {
  return (
    <RequireAuth>
      <ShipmentsInner />
    </RequireAuth>
  );
}

function statusBadgeVariant(s: ShipmentStatus) {
  if (s === "delivered") return "success";
  if (s === "cancelled") return "danger";
  if (s === "out_for_delivery") return "warn";
  return "default";
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function ShipmentsInner() {
  const { profile } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<Shipment[]>([]);
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<Shipment | null>(null);
  const [events, setEvents] = React.useState<ShipmentEvent[]>([]);
  const [creating, setCreating] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // NEW: Sender ID upload
  const [senderIdFile, setSenderIdFile] = React.useState<File | null>(null);
  const [uploadingId, setUploadingId] = React.useState(false);

  const canManage = profile?.role === "admin" || profile?.role === "agent";

  async function load() {
    setLoading(true);
    setErr(null);
    const query = supabase.from("shipments").select("*").order("created_at", { ascending: false }).limit(2000);
    const { data, error } = q.trim() ? await query.ilike("tracking_code", `%${q.trim()}%`) : await query;
    if (error) setErr(error.message);
    else setRows((data ?? []) as any);
    setLoading(false);
  }

  async function loadEvents(shipmentId: string) {
    const { data, error } = await supabase
      .from("shipment_events")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) setEvents((data ?? []) as any);
  }

  React.useEffect(() => {
    load();
  }, []);

  React.useEffect(() => {
    if (!selected) return;
    loadEvents(selected.id);
  }, [selected?.id]);

  async function uploadSenderIdOrThrow(file: File): Promise<string> {
    if (!file.type.startsWith("image/")) throw new Error("Sender ID must be an image file.");
    const maxMb = 8;
    if (file.size > maxMb * 1024 * 1024) throw new Error(`Sender ID image is too large. Max ${maxMb}MB.`);

    const { data: authRes, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw authErr;
    const userId = authRes.user?.id;
    if (!userId) throw new Error("Not authenticated.");

    const filePath = `sender-ids/${userId}/${Date.now()}_${sanitizeFilename(file.name)}`;

    const up = await supabase.storage.from("documents").upload(filePath, file, {
      upsert: false,
      contentType: file.type,
    });
    if (up.error) throw up.error;

    return filePath;
  }

  // This is the function you said you "can't find" — it is here, inside ShipmentsInner.
  async function createShipment(d: ShipmentDraft) {
    setMsg(null);
    setErr(null);

    if (!senderIdFile) {
      setErr("Sender ID image is required.");
      return;
    }

    setUploadingId(true);

    try {
      // Upload sender ID first
      const senderIdPath = await uploadSenderIdOrThrow(senderIdFile);

      // resolve customer email -> id (optional)
      let customer_id: string | null = null;
      if (d.customer_email.trim()) {
        const { data, error } = await supabase.from("profiles").select("id").eq("email", d.customer_email.trim()).maybeSingle();
        if (error) {
          setErr(error.message);
          return;
        }
        customer_id = (data as any)?.id ?? null;
      }

      const { data: created, error } = await supabase
        .from("shipments")
        .insert([
          {
            tracking_code: d.tracking_code.trim(),
            customer_id,
            origin: d.origin,
            destination: d.destination,
            weight_kg: d.weight_kg,
            price_amount: d.price_amount,
            currency: d.currency,
            status: d.status,
            notes: d.notes,

            // NEW: sender identity
            sender_full_name: d.sender_full_name.trim(),
            sender_id_number: d.sender_id_number.trim(),

            // NEW: sender ID image fields
            sender_id_image_path: senderIdPath,
            sender_id_image_uploaded_at: new Date().toISOString(),
          } as any,
        ])
        .select("*")
        .single();

      if (error) {
        setErr(error.message);
        return;
      }

      setMsg("Shipment created.");
      setCreating(false);
      setSelected(created as any);
      setSenderIdFile(null);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create shipment.");
    } finally {
      setUploadingId(false);
    }
  }

  async function updateStatus(shipment: Shipment, newStatus: ShipmentStatus) {
    setMsg(null);
    setErr(null);
    const { error } = await supabase.from("shipments").update({ status: newStatus }).eq("id", shipment.id);
    if (error) setErr(error.message);
    else {
      setMsg("Status updated.");
      await load();
      setSelected((s) => (s ? ({ ...s, status: newStatus } as any) : s));
      await loadEvents(shipment.id);
    }
  }

  async function addEvent(shipment: Shipment, note: string, location: string) {
    setMsg(null);
    setErr(null);
    const { error } = await supabase.from("shipment_events").insert([
      { shipment_id: shipment.id, status: shipment.status, note: note || null, location: location || null },
    ]);
    if (error) setErr(error.message);
    else {
      setMsg("Event added.");
      await loadEvents(shipment.id);
    }
  }

  async function deleteShipment(shipment: Shipment) {
    if (!confirm("Delete this shipment?")) return;
    setMsg(null);
    setErr(null);
    const { error } = await supabase.from("shipments").delete().eq("id", shipment.id);
    if (error) setErr(error.message);
    else {
      setMsg("Deleted.");
      setSelected(null);
      await load();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shipments</h1>
          <p className="text-sm text-zinc-600">{canManage ? "Create, update and track shipments." : "View your shipments and track status."}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Input className="w-64" placeholder="Search tracking code…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant="secondary" onClick={load}>
            Search
          </Button>
          {canManage && <Button onClick={() => setCreating((v) => !v)}>{creating ? "Close" : "New shipment"}</Button>}
        </div>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <div className="text-sm font-medium">CSV tools</div>
            <div className="text-xs text-zinc-500">Import/export up to 5,000 rows (adjust as needed)</div>
          </CardHeader>
          <CardContent>
            <CsvTools onDone={load} />
          </CardContent>
        </Card>
      )}

      {creating && canManage && (
        <Card>
          <CardHeader>
            <div className="text-sm font-medium">Create shipment</div>
            <div className="text-xs text-zinc-500">Assign to a customer by email (optional)</div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sender ID upload */}
            <div className="space-y-1">
              <div className="text-sm font-medium">Sender ID (photo)</div>
              <input
                className="block w-full text-sm"
                type="file"
                accept="image/*"
                onChange={(e) => setSenderIdFile(e.target.files?.[0] ?? null)}
              />
              <div className="text-xs text-zinc-500">
                Required. Max 8MB.
                {senderIdFile ? <span className="ml-2 text-zinc-700">Selected: {senderIdFile.name}</span> : null}
              </div>
            </div>

            <ShipmentForm submitLabel={uploadingId ? "Uploading…" : "Create"} onSubmit={createShipment} />

            {uploadingId && <div className="text-xs text-zinc-600">Uploading sender ID…</div>}
          </CardContent>
        </Card>
      )}

      {msg && <div className="text-sm text-emerald-700">{msg}</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="text-sm font-medium">Shipment list</div>
            <div className="text-xs text-zinc-500">{loading ? "Loading…" : `${rows.length} items`}</div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-zinc-100">
              {rows.map((s) => (
                <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <button className="text-left font-medium truncate" onClick={() => setSelected(s)}>
                        {s.tracking_code}
                      </button>
                      <Badge variant={statusBadgeVariant(s.status) as any}>{s.status.replaceAll("_", " ")}</Badge>
                    </div>
                    <div className="text-xs text-zinc-600 truncate">
                      {s.origin} → {s.destination}
                    </div>
                    <div className="text-xs text-zinc-500 truncate">{new Date(s.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link className="text-xs" href={`/track?code=${encodeURIComponent(s.tracking_code)}`}>
                      public track
                    </Link>
                    {canManage && (
                      <Button size="sm" variant="secondary" onClick={() => setSelected(s)}>
                        Manage
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {!loading && rows.length === 0 && <div className="py-8 text-sm text-zinc-600">No shipments found.</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-medium">Details</div>
            <div className="text-xs text-zinc-500">Select a shipment to manage</div>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <div className="text-sm text-zinc-600">No selection.</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-semibold">{selected.tracking_code}</div>
                  <div className="text-xs text-zinc-600">
                    {selected.origin} → {selected.destination}
                  </div>
                  <div className="text-xs text-zinc-500">Created: {new Date(selected.created_at).toLocaleString()}</div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link className="text-sm" href={`/docs/label/${selected.id}`}>
                    Generate label
                  </Link>
                  <Link className="text-sm" href={`/docs/invoice/${selected.id}`}>
                    Generate invoice
                  </Link>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-zinc-600">Status</div>
                  <div className="flex gap-2 items-center">
                    <Badge variant={statusBadgeVariant(selected.status) as any}>{selected.status.replaceAll("_", " ")}</Badge>
                    {canManage && (
                      <select
                        className="h-9 rounded-xl border border-zinc-200 bg-white px-2 text-sm"
                        value={selected.status}
                        onChange={(e) => updateStatus(selected, e.target.value as any)}
                      >
                        {["requested", "created", "picked_up", "in_transit", "out_for_delivery", "delivered", "cancelled"].map((s) => (
                          <option key={s} value={s}>
                            {s.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <EventComposer shipment={selected} onAdd={addEvent} />

                <div>
                  <div className="text-xs text-zinc-600 mb-2">Recent events</div>
                  <div className="space-y-2">
                    {events.map((ev) => (
                      <div key={ev.id} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                        <div className="text-xs text-zinc-700 font-medium">{ev.status.replaceAll("_", " ")}</div>
                        <div className="text-xs text-zinc-600">
                          {ev.location ?? "—"} • {new Date(ev.created_at).toLocaleString()}
                        </div>
                        {ev.note && <div className="text-xs text-zinc-700 mt-1">{ev.note}</div>}
                      </div>
                    ))}
                    {events.length === 0 && <div className="text-sm text-zinc-600">No events yet.</div>}
                  </div>
                </div>

                {canManage && (
                  <Button variant="danger" onClick={() => deleteShipment(selected)}>
                    Delete shipment
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EventComposer({ shipment, onAdd }: { shipment: Shipment; onAdd: (s: Shipment, note: string, location: string) => Promise<void> }) {
  const [note, setNote] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  return (
    <div className="space-y-2">
      <div className="text-xs text-zinc-600">Add event</div>
      <Input placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
      <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onAdd(shipment, note, location);
          setNote("");
          setLocation("");
          setBusy(false);
        }}
      >
        {busy ? "Adding…" : "Add event"}
      </Button>
    </div>
  );
}
