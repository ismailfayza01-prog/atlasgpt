"use client";

import React from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { createInvoicePdf } from "@/lib/pdf";
import { DocUploader } from "@/components/docs/DocUploader";
import Link from "next/link";

export default function InvoiceDocPage({ params }: { params: { shipmentId: string } }) {
  return (
    <RequireAuth roles={["admin","agent"]}>
      <InvoiceInner shipmentId={params.shipmentId} />
    </RequireAuth>
  );
}

function InvoiceInner({ shipmentId }: { shipmentId: string }) {
  const [loading, setLoading] = React.useState(true);
  const [bytes, setBytes] = React.useState<Uint8Array | null>(null);
  const [publicUrl, setPublicUrl] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      setLoading(true); setErr(null);
      const { data, error } = await supabase.from("shipments").select("*").eq("id", shipmentId).single();
      if (error) { setErr(error.message); setLoading(false); return; }
      let customerEmail: string | null = null;
      if ((data as any).customer_id) {
        const { data: p } = await supabase.from("profiles").select("email").eq("id", (data as any).customer_id).maybeSingle();
        customerEmail = (p as any)?.email ?? null;
      }
      // Create invoice row (idempotent by shipment_id uniqueness via function)
      const { data: inv, error: invErr } = await supabase.rpc("ensure_invoice_for_shipment", { in_shipment_id: shipmentId });
      if (invErr) { setErr(invErr.message); setLoading(false); return; }

      const pdf = await createInvoicePdf({
        invoiceNumber: (inv as any).number,
        trackingCode: (data as any).tracking_code,
        origin: (data as any).origin ?? "",
        destination: (data as any).destination ?? "",
        amount: Number((data as any).price_amount ?? 0),
        currency: (data as any).currency ?? "MAD",
        issuedAt: new Date((inv as any).issued_at),
        customerEmail,
      });
      setBytes(pdf);
      setLoading(false);
    })();
  }, [shipmentId]);

  return (
    <div className="space-y-4">
      <div className="text-sm"><Link href="/shipments">← Back to shipments</Link></div>
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">Invoice PDF</h1>
          <p className="text-sm text-zinc-600">Invoice numbering is generated in Postgres via <code>ensure_invoice_for_shipment()</code>.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <div className="text-sm text-zinc-600">Generating…</div> : null}
          {err ? <div className="text-sm text-red-600">{err}</div> : null}
          <DocUploader
            title="Invoice"
            filename={`invoice_${shipmentId}.pdf`}
            bytes={bytes}
            onUploaded={(url) => setPublicUrl(url)}
          />
          {publicUrl && <div className="text-sm">Public URL: <a href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a></div>}
          {bytes && <PdfPreview bytes={bytes} />}
        </CardContent>
      </Card>
    </div>
  );
}

function PdfPreview({ bytes }: { bytes: Uint8Array }) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    const blob = new Blob([bytes], { type: "application/pdf" });
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [bytes]);
  if (!url) return null;
  return <iframe className="w-full h-[700px] rounded-xl border border-zinc-200" src={url} />;
}
