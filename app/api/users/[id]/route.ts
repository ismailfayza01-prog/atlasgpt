import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { readSession } from "@/lib/auth";
import { updateDB } from "@/lib/db";

export const runtime = "nodejs";

const PatchSchema = z.object({
  active: z.boolean().optional(),
  password: z.string().min(6).optional()
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const me = await readSession();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const res = await updateDB(async (db) => {
    const u = db.users.find(x => x.id === ctx.params.id);
    if (!u) throw new Error("Not found");
    if (typeof parsed.data.active === "boolean") u.active = parsed.data.active;
    if (parsed.data.password) u.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    return { ok: true };
  }).catch((e: any) => ({ error: e?.message || "Update failed" }));

  if ((res as any).error) return NextResponse.json(res, { status: 400 });
  return NextResponse.json(res);
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const me = await readSession();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const res = await updateDB(async (db) => {
    db.users = db.users.filter(u => u.id !== ctx.params.id);
    return { ok: true };
  });
  return NextResponse.json(res);
}
