"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export function DocUploader({
  title,
  filename,
  bytes,
  onUploaded,
}: {
  title: string;
  filename: string;
  bytes: Uint8Array | null;
  onUploaded?: (publicUrl: string) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function upload() {
    if (!bytes) return;
    setBusy(true); setMsg(null); setErr(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr("Not logged in."); setBusy(false); return; }
    const path = `${user.id}/${filename}`;
    const { error } = await supabase.storage.from("documents").upload(path, bytes, { upsert: true, contentType: "application/pdf" });
    if (error) { setErr(error.message); setBusy(false); return; }
    const { data } = supabase.storage.from("documents").getPublicUrl(path);
    setMsg("Uploaded.");
    onUploaded?.(data.publicUrl);
    setBusy(false);
  }

  function download() {
    if (!bytes) return;
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" onClick={download} disabled={!bytes || busy}>Download PDF</Button>
      <Button onClick={upload} disabled={!bytes || busy}>{busy ? "Uploading…" : `Upload to Supabase`}</Button>
      {msg && <span className="text-xs text-emerald-700">{msg}</span>}
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
