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

/** Default columns for a brand-new self-signup user (email already normalized). */
export function newUserDefaults(email: string) {
  const local = email.split("@")[0] ?? email;
  const displayName = local.replace(/[._\-]+/g, " ").trim() || "Okur";
  return {
    email,
    displayName,
    avatarSeed: email,
    onboarded: false,
    emailVerified: new Date(),
  };
}

/** Find-or-create a user by (already-normalized) email, then set the session
 *  cookie. Used by the magic-link verify route. */
export async function createOrLoginByEmail(email: string) {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: newUserDefaults(email) });
  } else if (!user.emailVerified) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  }
  const session = await getSession();
  session.userId = user.id;
  await session.save();
  return user;
}

export async function logout() {
  const session = await getSession();
  session.destroy();
}
