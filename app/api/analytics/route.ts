import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { updateDB } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const me = await readSession();
  if (!me || !["admin","agent"].includes(me.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const res = await updateDB(async (db) => {
    const byStatus: Record<string, number> = {};
    for (const s of db.shipments) byStatus[s.status] = (byStatus[s.status] || 0) + 1;

    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const last30 = db.shipments.filter(s => new Date(s.createdAt).getTime() >= since).length;

    const recent = db.shipments
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8)
      .map(s => ({ id: s.id, trackingNumber: s.trackingNumber, destination: s.destination, status: s.status, updatedAt: s.updatedAt }));

    return {
      totals: { shipments: db.shipments.length, users: db.users.length },
      byStatus,
      last30DaysNewShipments: last30,
      recent
    };
  });

  return NextResponse.json(res);
}
