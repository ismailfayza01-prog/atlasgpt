"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { supabase } from "@/lib/supabase";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Button } from "@/components/ui/button";

type ShipmentRow = {
  id: string;
  tracking_code: string;
  origin: string;
  destination: string;
  weight_kg: number | null;
  price_amount: number | null;
  currency: string | null;
  sender_full_name?: string | null;
  sender_id_number?: string | null;
  created_at: string;
};

function u8ToArrayBuffer(u8: Uint8Array): ArrayBuffer {
  // Ensure we produce a true ArrayBuffer slice (not SharedArrayBuffer/ArrayBufferLike)
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

async function buildInvoicePdf(shipment: ShipmentRow): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 48;
  let y = 780;

  const drawLine = (text: string, isBold = false) => {
    page.drawText(text, {
      x: margin,
      y,
      size: 12,
      font: isBold ? bold : font,
      color: rgb(0.12, 0.12, 0.12),
    });
    y -= 20;
  };

  page.drawText("INVOICE", { x: margin, y, size: 22, font: bold, color: rgb(0, 0, 0) });
  y -= 36;

  drawLine(`Shipment ID: ${shipment.id}`, true);
  drawLine(`Tracking code: ${shipment.tracking_code}`);
  drawLine(`Created at: ${new Date(shipment.created_at).toLocaleString()}`);
  y -= 10;

  drawLine(`Origin: ${shipment.origin}`);
  drawLine(`Destination: ${shipment.destination}`);
  drawLine(`Weight (kg): ${shipment.weight_kg ?? "-"}`);
  y -= 10;

  const amount = shipment.price_amount ?? 0;
  const currency = shipment.currency ?? "MAD";
  drawLine(`Amount: ${amount} ${currency}`, true);
  y -= 10;

  if (shipment.sender_full_name || shipment.sender_id_number) {
    drawLine("Sender", true);
    if (shipment.sender_full_name) drawLine(`Full name: ${shipment.sender_full_name}`);
    if (shipment.sender_id_number) drawLine(`ID number: ${shipment.sender_id_number}`);
  }

  // Footer line
  page.drawLine({
    start: { x: margin, y: 70 },
    end: { x: 595.28 - margin, y: 70 },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });
  page.drawText("Atlas Parcel Europe", {
    x: margin,
    y: 50,
    size: 10,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });

  return await pdf.save();
}

export default function InvoicePage() {
  return (
    <RequireAuth>
      <InvoiceInner />
    </RequireAuth>
  );
}

function InvoiceInner() {
  const params = useParams<{ shipmentId: string }>();
  const shipmentId = params?.shipmentId;

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;

    async function run() {
      try {
        setLoading(true);
        setErr(null);
        setUrl(null);

        const { data, error } = await supabase
          .from("shipments")
          .select("id,tracking_code,origin,destination,weight_kg,price_amount,currency,sender_full_name,sender_id_number,created_at")
          .eq("id", shipmentId)
          .single();

        if (error) throw error;
        const shipment = data as unknown as ShipmentRow;

        const bytes = await buildInvoicePdf(shipment);

        // FIX: convert to true ArrayBuffer for BlobPart typing
        const ab = u8ToArrayBuffer(bytes);
        const blob = new Blob([ab], { type: "application/pdf" });

        objectUrl = URL.createObjectURL(blob);
        if (!alive) ret
