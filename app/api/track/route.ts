import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const TYPES = new Set(["open", "listen", "click"]);

export async function POST(req: Request) {
  try {
    const { type, articleId, label } = await req.json();
    if (!TYPES.has(type)) return NextResponse.json({ ok: false }, { status: 400 });
    const user = await getCurrentUser();
    await prisma.event.create({
      data: {
        type,
        articleId: typeof articleId === "string" ? articleId : null,
        label: typeof label === "string" ? label.slice(0, 40) : null,
        userId: user?.id ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
