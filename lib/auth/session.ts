import { cookies } from "next/headers";
import { getIronSession, type IronSession } from "iron-session";
import { prisma } from "@/lib/db";

export type SessionData = {
  userId?: string;
};

const sessionOptions = {
  password:
    process.env.SESSION_SECRET ??
    "tuhaf-club-dev-session-secret-please-change-32+",
  cookieName: "tuhaf_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/** Current logged-in user, or null. Cached per request would be ideal; kept
 * simple here. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  // A stale cookie (e.g. user removed, or DB reseeded with fresh IDs) just
  // reads as logged-out. We must NOT mutate the cookie here: getCurrentUser
  // runs in Server Components (layout/pages), where cookie writes throw.
  // The stale cookie is overwritten on the next successful login.
  return user ?? null;
}

/** Allowlist login: only seeded/known emails may enter. Returns the user or
 * null if the email is not on the list. */
export async function loginWithEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) return null;
  const session = await getSession();
  session.userId = user.id;
  await session.save();
  return user;
}

export async function logout() {
  const session = await getSession();
  session.destroy();
}
