import { NextResponse } from "next/server";
import { z } from "zod";
import { readSession } from "@/lib/auth";
import { updateDB, addShipmentEvent } from "@/lib/db";

export const runtime = "nodejs";

const Schema = z.object({
  status: z.enum(["created","received","in_transit","customs","out_for_delivery","delivered","exception"]),
  note: z.string().optional()
});

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const me = await readSession();
  if (!me || !["admin","agent"].includes(me.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const res = await updateDB(async (db) => {
    const s = db.shipments.find(x => x.id === ctx.params.id);
    if (!s) throw new Error("Not found");
    addShipmentEvent(s, parsed.data.status, parsed.data.note);
    return { ok: true };
  }).catch((e: any) => ({ error: e?.message || "Update failed" }));

  if ((res as any).error) return NextResponse.json(res, { status: 400 });
  return NextResponse.json(res);
}
