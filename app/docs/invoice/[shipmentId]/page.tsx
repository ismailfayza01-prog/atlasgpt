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

export default function InvoicePage() {
  return (
    <RequireAuth>
      <InvoiceInner />
    </RequireAuth>
  );
}

function InvoiceInner() {
  const params = useParams<{ shipmentId: string }>();
  const shipmentId = params?.shipmentId as string;

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        setUrl(null);

        const { data, error } = await supabase
          .from("shipments")
          .select(
            "id,tracking_code,origin,destination,weight_kg,price_amount,currency,sender_full_name,sender_id_number,created_at"
          )
          .eq("id", shipmentId)
          .single();

        if (error) throw error;
        const shipment = data as unknown as ShipmentRow;

        const pdf = await PDFDocument.create();
        const page = pdf.addPage([595.28, 841.89]); // A4
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

        const margin = 48;
        let y = 780;

        page.drawText("INVOICE", { x: margin, y, size: 22, font: bold, color: rgb(0, 0, 0) });
        y -= 36;

        const line = (t: string, isBold = false) => {
          page.drawText(t, { x: margin, y, size: 12, font: isBold ? bold : font, color: rgb(0.12, 0.12, 0.12) });
          y -= 20;
        };

        line(`Shipment ID: ${shipment.id}`, true);
        line(`Tracking code: ${shipment.tracking_code}`);
        line(`Created at: ${new Date(shipment.created_at).toLocaleString()}`);
        y -= 10;

        line(`Origin: ${shipment.origin}`);
        line(`Destination: ${shipment.destination}`);
        line(`Weight (kg): ${shipment.weight_kg ?? "-"}`);
        y -= 10;

        line(`Amount: ${(shipment.price_amount ?? 0).toString()} ${shipment.currency ?? "MAD"}`, true);
        y -= 10;

        if (shipment.sender_full_name || shipment.sender_id_number) {
          line("Sender", true);
          if (shipment.sender_full_name) line(`Full name: ${shipment.sender_full_name}`);
          if (shipment.sender_id_number) line(`ID number: ${shipment.sender_id_number}`);
        }

        const bytes = await pdf.save();

        // FIX: make a true ArrayBuffer for Blob
        const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        const blob = new Blob([ab], { type: "application/pdf" });

        objectUrl = URL.createObjectURL(blob);
        if (!alive) return;
        setUrl(objectUrl);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to generate invoice.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [shipmentId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Invoice</h1>
          <div className="text-sm text-zinc-600">Shipment: {shipmentId}</div>
        </div>
        {url ? (
          <a href={url} download={`invoice-${shipmentId}.pdf`}>
            <Button variant="outline">Download PDF</Button>
          </a>
        ) : null}
      </div>

      {loading && <div className="text-sm text-zinc-600">Generating PDF…</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}

      {url && (
        <iframe
          title="Invoice PDF"
          src={url}
          className="w-full rounded-xl border border-zinc-200 bg-white"
          style={{ height: "80vh" }}
        />
      )}
    </div>
  );
}
