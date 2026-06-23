"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { snapToWords, isValidHighlight } from "@/lib/highlights/offsets";

export type CreateHighlightResult =
  | { ok: true; id: string; start: number; end: number; text: string }
  | { ok: false; error: string };

/**
 * Create a highlight. The client sends raw offsets; the server re-snaps them
 * against the canonical block text (never trusting the client) and validates.
 */
export async function createHighlight(input: {
  blockId: string;
  start: number;
  end: number;
}): Promise<CreateHighlightResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Giriş yapmalısın." };

  const block = await prisma.articleBlock.findUnique({
    where: { id: input.blockId },
    include: { article: true },
  });
  if (!block) return { ok: false, error: "Blok bulunamadı." };

  const snapped = snapToWords(block.text, { start: input.start, end: input.end });
  if (!isValidHighlight(block.text, snapped)) {
    return { ok: false, error: "Geçersiz seçim." };
  }

  const text = block.text.slice(snapped.start, snapped.end);

  const highlight = await prisma.highlight.upsert({
    where: {
      userId_blockId_startOffset_endOffset: {
        userId: user.id,
        blockId: block.id,
        startOffset: snapped.start,
        endOffset: snapped.end,
      },
    },
    create: {
      userId: user.id,
      blockId: block.id,
      articleId: block.articleId,
      startOffset: snapped.start,
      endOffset: snapped.end,
      text,
    },
    update: {},
  });

  await notifyOverlap(user.id, user.displayName, block.id, snapped, highlight.id);

  revalidatePath(`/oku`);
  return {
    ok: true,
    id: highlight.id,
    start: snapped.start,
    end: snapped.end,
    text,
  };
}

export async function deleteHighlight(id: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await prisma.highlight.deleteMany({ where: { id, userId: user.id } });
  revalidatePath(`/oku`);
  revalidatePath(`/alti-cizdiklerin`);
  return { ok: true };
}

/** Notify up to a few readers who already underlined the same words. */
async function notifyOverlap(
  actorId: string,
  actorName: string,
  blockId: string,
  span: { start: number; end: number },
  newHighlightId: string,
) {
  const overlapping = await prisma.highlight.findMany({
    where: {
      blockId,
      userId: { not: actorId },
      startOffset: { lt: span.end },
      endOffset: { gt: span.start },
      id: { not: newHighlightId },
    },
    select: { userId: true },
    distinct: ["userId"],
    take: 5,
  });

  if (overlapping.length === 0) return;
  await prisma.notification.createMany({
    data: overlapping.map((o) => ({
      userId: o.userId,
      type: "overlap",
      actorUserId: actorId,
      body: `${actorName} senin de altını çizdiğin bir cümleyi işaretledi.`,
    })),
  });
}
