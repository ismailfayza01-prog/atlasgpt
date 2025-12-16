import { NextResponse } from "next/server";
import { z } from "zod";
import { readSession } from "@/lib/auth";
import { updateDB } from "@/lib/db";

export const runtime = "nodejs";

const PatchSchema = z.object({
  origin: z.string().min(1).optional(),
  destination: z.string().min(1).optional(),
  customerName: z.string().min(1).optional(),
  customerEmail: z.string().email().optional(),
  weightKg: z.number().optional(),
  priceEur: z.number().optional()
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const me = await readSession();
  if (!me || !["admin","agent"].includes(me.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const res = await updateDB(async (db) => {
    const s = db.shipments.find(x => x.id === ctx.params.id);
    if (!s) throw new Error("Not found");
    Object.assign(s, parsed.data);
    s.updatedAt = new Date().toISOString();
    return { ok: true };
  }).catch((e: any) => ({ error: e?.message || "Update failed" }));

  if ((res as any).error) return NextResponse.json(res, { status: 400 });
  return NextResponse.json(res);
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const me = await readSession();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const res = await updateDB(async (db) => {
    db.shipments = db.shipments.filter(s => s.id !== ctx.params.id);
    return { ok: true };
  });
  return NextResponse.json(res);
}
