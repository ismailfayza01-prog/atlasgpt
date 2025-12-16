import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { ensureDB } from "@/lib/db";
import { createSession } from "@/lib/auth";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const db = await ensureDB();
  const user = db.users.find(u => u.email.toLowerCase() === parsed.data.email.toLowerCase());
  if (!user || !user.active) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });

  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}
