import { NextResponse } from "next/server";
import { z } from "zod";
import { readSession } from "@/lib/auth";
import { updateDB, newShipmentTrackingNumber, addShipmentEvent, type ShipmentRecord } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const me = await readSession();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const mine = url.searchParams.get("mine") === "1";

  const res = await updateDB(async (db) => {
    let shipments = db.shipments;
    if (mine || me.role === "customer") {
      shipments = shipments.filter(s => s.customerEmail.toLowerCase() === me.email.toLowerCase());
    }
    // Hide internal notes (none for now)
    return shipments.map(s => ({
      id: s.id,
      trackingNumber: s.trackingNumber,
      customerName: s.customerName,
      customerEmail: s.customerEmail,
      origin: s.origin,
      destination: s.destination,
      status: s.status,
      updatedAt: s.updatedAt,
      history: s.history
    }));
  });
  return NextResponse.json(res);
}

const CreateSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  origin: z.string().min(1),
  destination: z.string().min(1),
  weightKg: z.number().optional(),
  priceEur: z.number().optional()
});

export async function POST(req: Request) {
  const me = await readSession();
  if (!me || !["admin","agent"].includes(me.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const res = await updateDB(async (db) => {
    const id = "shp_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    const s: ShipmentRecord = {
      id,
      trackingNumber: newShipmentTrackingNumber(),
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      origin: parsed.data.origin,
      destination: parsed.data.destination,
      weightKg: parsed.data.weightKg,
      priceEur: parsed.data.priceEur,
      status: "created",
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addShipmentEvent(s, "created", "Shipment created");
    db.shipments.unshift(s);
    return s;
  });

  return NextResponse.json(res);
}
