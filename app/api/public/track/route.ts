import { NextResponse } from "next/server";
import { ensureDB } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tn = (url.searchParams.get("tn") || "").trim();
  if (!tn) return NextResponse.json({ error: "Missing tracking number" }, { status: 400 });

  const db = await ensureDB();
  const s = db.shipments.find(x => x.trackingNumber.toLowerCase() === tn.toLowerCase());
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    trackingNumber: s.trackingNumber,
    origin: s.origin,
    destination: s.destination,
    status: s.status,
    history: s.history
  });
}
