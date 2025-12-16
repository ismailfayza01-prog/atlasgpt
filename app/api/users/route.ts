import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { readSession } from "@/lib/auth";
import { updateDB, type UserRole } from "@/lib/db";

export const runtime = "nodejs";

function rid() {
  return "usr_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function GET() {
  const me = await readSession();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const res = await updateDB(async (db) => {
    return db.users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, active: u.active, createdAt: u.createdAt }));
  });
  return NextResponse.json(res);
}

const CreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["admin","agent","customer"]),
  password: z.string().min(6)
});

export async function POST(req: Request) {
  const me = await readSession();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const out = await updateDB(async (db) => {
    if (db.users.some(u => u.email.toLowerCase() === parsed.data.email.toLowerCase())) {
      throw new Error("Email already exists");
    }
    db.users.unshift({
      id: rid(),
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role as UserRole,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      active: true,
      createdAt: new Date().toISOString()
    });
    return { ok: true };
  }).catch((e: any) => ({ error: e?.message || "Create failed" }));

  if ((out as any).error) return NextResponse.json(out, { status: 400 });
  return NextResponse.json(out);
}
