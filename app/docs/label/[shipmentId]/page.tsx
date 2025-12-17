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
  created_at: string;
};

export default function LabelPage() {
  return (
    <RequireAuth>
      <LabelInner />
    </RequireAuth>
  );
}

function LabelInner() {
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
          .select("id,tracking_code,origin,destination,created_at")
          .eq("id", shipmentId)
          .single();

        if (error) throw error;
        const shipment = data as unknown as ShipmentRow;

        const pdf = await PDFDocument.create();
        const page = pdf.addPage([400, 600]); // label-ish size
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

        const x = 28;
        let y = 560;

        page.drawText("SHIPPING LABEL", { x, y, size: 18, font: bold, color: rgb(0, 0, 0) });
        y -= 30;

        const line = (t: string, isBold = false) => {
          page.drawText(t, { x, y, size: 12, font: isBold ? bold : font, color: rgb(0.12, 0.12, 0.12) });
          y -= 18;
        };

        line(`Tracking: ${shipment.tracking_code}`, true);
        y -= 6;
        line(`From: ${shipment.origin}`);
        line(`To: ${shipment.destination}`);
        y -= 6;
        line(`Created: ${new Date(shipment.created_at).toLocaleString()}`);

        // simple border
        page.drawRectangle({
          x: 16,
          y: 16,
          width: 368,
          height: 568,
          borderColor: rgb(0.85, 0.85, 0.85),
          borderWidth: 1,
        });

        const bytes = await pdf.save();

        // FIX: Use Uint8Array as BlobPart (avoids ArrayBufferLike typing issue)
        const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });

        objectUrl = URL.createObjectURL(blob);
        if (!alive) return;
        setUrl(objectUrl);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to generate label.");
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
          <h1 className="text-xl font-semibold">Label</h1>
          <div className="text-sm text-zinc-600">Shipment: {shipmentId}</div>
        </div>
        {url ? (
          <a href={url} download={`label-${shipmentId}.pdf`}>
            <Button variant="outline">Download PDF</Button>
          </a>
        ) : null}
      </div>

      {loading && <div className="text-sm text-zinc-600">Generating PDF…</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}

      {url && (
        <iframe
          title="Label PDF"
          src={url}
          className="w-full rounded-xl border border-zinc-200 bg-white"
          style={{ height: "80vh" }}
        />
      )}
    </div>
  );
}
