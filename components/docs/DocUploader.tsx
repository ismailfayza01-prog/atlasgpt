"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  bytes: Uint8Array | null;
  filename: string;
  label?: string;
};

export function DocUploader({ bytes, filename, label = "Document" }: Props) {
  function download() {
    if (!bytes) return;

    // FIX: wrap in Uint8Array so BlobPart typing is satisfied
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{label}</div>
        <div className="text-xs text-zinc-600 truncate">{filename}</div>
      </div>

      <Button variant="outline" disabled={!bytes} onClick={download}>
        Download
      </Button>
    </div>
  );
}
