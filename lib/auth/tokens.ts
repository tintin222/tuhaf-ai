import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export const TOKEN_TTL_MS = 30 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export type TokenRow = { usedAt: Date | null; expiresAt: Date };

/** Pure validity check: unused and not past expiry. */
export function isTokenValid(row: TokenRow | null, now: Date): boolean {
  if (!row) return false;
  if (row.usedAt) return false;
  return row.expiresAt.getTime() > now.getTime();
}

/** Issue a login token for an email. Returns the raw token, or null if a
 *  non-expired token was issued within the resend cooldown. */
export async function issueLoginToken(email: string): Promise<string | null> {
  const recent = await prisma.loginToken.findFirst({
    where: { email, purpose: "login", usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return null;
  }
  const raw = randomBytes(32).toString("hex");
  await prisma.loginToken.create({
    data: {
      email,
      tokenHash: hashToken(raw),
      purpose: "login",
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });
  return raw;
}

/** Validate and single-use-consume a raw token. Returns the email or null. */
export async function consumeLoginToken(raw: string): Promise<string | null> {
  const row = await prisma.loginToken.findUnique({
    where: { tokenHash: hashToken(raw) },
  });
  if (!isTokenValid(row, new Date())) return null;
  await prisma.loginToken.update({
    where: { id: row!.id },
    data: { usedAt: new Date() },
  });
  return row!.email;
}
