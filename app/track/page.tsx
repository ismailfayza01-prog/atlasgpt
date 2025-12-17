import * as React from "react";
import TrackClient from "./TrackClient";

export default function TrackPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Track shipment</h1>
        <p className="text-sm text-zinc-600">Use a tracking code to view shipment status and events.</p>
      </div>

      <React.Suspense fallback={<div className="text-sm text-zinc-600">Loading tracking…</div>}>
        <TrackClient />
      </React.Suspense>
    </div>
  );
}
