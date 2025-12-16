"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ShipmentStatus } from "@/lib/types";

export type ShipmentDraft = {
  // NEW: sender identity
  sender_full_name: string;
  sender_id_number: string;

  // existing fields
  tracking_code: string;
  customer_email: string;
  origin: string;
  destination: string;
  weight_kg: number;
  price_amount: number;
  currency: string;
  status: ShipmentStatus;
  notes: string;
};

export function ShipmentForm({
  submitLabel,
  onSubmit,
}: {
  submitLabel: string;
  onSubmit: (d: ShipmentDraft) => Promise<void>;
}) {
  const [d, setD] = React.useState<ShipmentDraft>({
    sender_full_name: "",
    sender_id_number: "",

    tracking_code: "",
    customer_email: "",
    origin: "",
    destination: "",
    weight_kg: 1,
    price_amount: 0,
    currency: "MAD",
    status: "created",
    notes: "",
  });

  function set<K extends keyof ShipmentDraft>(k: K, v: ShipmentDraft[K]) {
    setD((prev) => ({ ...prev, [k]: v }));
  }

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(d);
      }}
    >
      {/* NEW: Sender identity */}
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs text-zinc-600 mb-1">Sender full name</div>
          <Input
            value={d.sender_full_name}
            onChange={(e) => set("sender_full_name", e.target.value)}
            placeholder="Full name as on ID"
            required
          />
        </div>
        <div>
          <div className="text-xs text-zinc-600 mb-1">Sender ID number</div>
          <Input
            value={d.sender_id_number}
            onChange={(e) => set("sender_id_number", e.target.value)}
            placeholder="CIN / Passport number"
            required
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs text-zinc-600 mb-1">Tracking code</div>
          <Input
            value={d.tracking_code}
            onChange={(e) => set("tracking_code", e.target.value)}
            placeholder="APE-00001"
            required
          />
        </div>
        <div>
          <div className="text-xs text-zinc-600 mb-1">Customer email (optional)</div>
          <Input
            value={d.customer_email}
            onChange={(e) => set("customer_email", e.target.value)}
            placeholder="customer@email.com"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs text-zinc-600 mb-1">Origin</div>
          <Input value={d.origin} onChange={(e) => set("origin", e.target.value)} placeholder="Tangier" required />
        </div>
        <div>
          <div className="text-xs text-zinc-600 mb-1">Destination</div>
          <Input value={d.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Casablanca" required />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <div className="text-xs text-zinc-600 mb-1">Weight (kg)</div>
          <Input
            type="number"
            value={d.weight_kg}
            onChange={(e) => set("weight_kg", Number(e.target.value))}
            min={0}
            step={0.1}
          />
        </div>
        <div>
          <div className="text-xs text-zinc-600 mb-1">Price</div>
          <Input
            type="number"
            value={d.price_amount}
            onChange={(e) => set("price_amount", Number(e.target.value))}
            min={0}
            step={1}
          />
        </div>
        <div>
          <div className="text-xs text-zinc-600 mb-1">Currency</div>
          <Input value={d.currency} onChange={(e) => set("currency", e.target.value)} placeholder="MAD" />
        </div>
      </div>

      <div>
        <div className="text-xs text-zinc-600 mb-1">Status</div>
        <select
          className="h-9 w-full rounded-xl border border-zinc-200 bg-white px-2 text-sm"
          value={d.status}
          onChange={(e) => set("status", e.target.value as ShipmentStatus)}
        >
          {["requested", "created", "picked_up", "in_transit", "out_for_delivery", "delivered", "cancelled"].map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="text-xs text-zinc-600 mb-1">Notes</div>
        <Input value={d.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional notes" />
      </div>

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
