"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession, logout } from "@/lib/auth/session";
import { issueLoginToken } from "@/lib/auth/tokens";
import { verifyPassword } from "@/lib/auth/password";
import { sendLoginLink } from "@/lib/email";
import { normalizeEmail } from "@/lib/auth/normalize";

export type AuthState = { sent?: boolean; error?: string };

/** Single login action. If a password is supplied, attempt password login;
 *  otherwise issue + mail a magic link. Never reveals whether an account or
 *  password exists. */
export async function authAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!email.includes("@")) return { error: "Geçerli bir e-posta gir." };

  // Password path — only when one was actually typed.
  if (password) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user?.passwordHash && verifyPassword(password, user.passwordHash)) {
      const session = await getSession();
      session.userId = user.id;
      await session.save();
      redirect(user.onboarded ? "/" : "/hosgeldin");
    }
    return {
      error: "E-posta veya şifre hatalı. İstersen sana giriş bağlantısı yollayalım.",
    };
  }

  // Magic-link path. Cooldown (null token) is treated as success — same screen.
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const raw = await issueLoginToken(email);
  if (raw) {
    await sendLoginLink(email, `${appUrl}/giris/dogrula?token=${raw}`);
  }
  return { sent: true };
}

// --- keep below unchanged ---
export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/giris");
}

export type SubscribeState = { ok?: boolean; error?: string };

export async function subscribeAction(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Geçerli bir e-posta gir." };
  }
  await prisma.emailSubscription.upsert({
    where: { email },
    create: { email, status: "confirmed" },
    update: { status: "confirmed" },
  });
  return { ok: true };
}
