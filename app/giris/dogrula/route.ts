import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { consumeLoginToken } from "@/lib/auth/tokens";
import { createOrLoginByEmail, getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (await getCurrentUser()) redirect("/");

  const token = req.nextUrl.searchParams.get("token");
  if (!token) redirect("/giris?error=invalid-link");

  const email = await consumeLoginToken(token);
  if (!email) redirect("/giris?error=invalid-link");

  const user = await createOrLoginByEmail(email);
  redirect(user.onboarded ? "/" : "/hosgeldin");
}
