"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { loginWithEmail, logout } from "@/lib/auth/session";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "E-posta gerekli." };

  const user = await loginWithEmail(email);
  if (!user) {
    return {
      error:
        "Bu e-posta listede değil. Tuhaf Club şu an yalnızca davetli okurlara açık.",
    };
  }
  redirect("/");
}

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
