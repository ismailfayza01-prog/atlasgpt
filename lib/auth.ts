import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "atlas_session";

function getSecret() {
  const s = process.env.ATLAS_SESSION_SECRET || "dev-secret-change-me";
  return new TextEncoder().encode(s);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "agent" | "customer";
};

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export function clearSession() {
  cookies().set(COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function readSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const user = (payload as any)?.user as SessionUser | undefined;
    if (!user?.id) return null;
    return user;
  } catch {
    return null;
  }
}

export const cookieName = COOKIE_NAME;
