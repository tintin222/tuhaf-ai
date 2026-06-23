"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { snapToWords, isValidHighlight } from "@/lib/highlights/offsets";
import type { NoteView } from "@/lib/social-types";

export type AddNoteInput = {
  body: string;
  parentId?: string; // reply: inherits the parent's span
  blockId?: string; // top-level: anchor span
  articleId?: string;
  start?: number;
  end?: number;
};

export type AddNoteResult =
  | { ok: true; note: NoteView }
  | { ok: false; error: string };

export async function addNote(input: AddNoteInput): Promise<AddNoteResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Giriş yapmalısın." };

  const body = input.body.trim();
  if (!body) return { ok: false, error: "Boş not olmaz." };
  if (body.length > 600) return { ok: false, error: "Not çok uzun (en fazla 600 karakter)." };

  let data: {
    body: string;
    userId: string;
    blockId: string;
    articleId: string;
    startOffset: number;
    endOffset: number;
    text: string;
    parentId?: string;
  };

  if (input.parentId) {
    const parent = await prisma.note.findUnique({ where: { id: input.parentId } });
    if (!parent) return { ok: false, error: "Yanıtlanan not bulunamadı." };
    data = {
      body,
      userId: user.id,
      blockId: parent.blockId,
      articleId: parent.articleId,
      startOffset: parent.startOffset,
      endOffset: parent.endOffset,
      text: parent.text,
      parentId: parent.id,
    };
  } else {
    if (!input.blockId || input.start == null || input.end == null) {
      return { ok: false, error: "Geçersiz seçim." };
    }
    const block = await prisma.articleBlock.findUnique({ where: { id: input.blockId } });
    if (!block) return { ok: false, error: "Blok bulunamadı." };

    const snapped = snapToWords(block.text, { start: input.start, end: input.end });
    if (!isValidHighlight(block.text, snapped)) {
      return { ok: false, error: "Geçersiz seçim." };
    }
    data = {
      body,
      userId: user.id,
      blockId: block.id,
      articleId: block.articleId,
      startOffset: snapped.start,
      endOffset: snapped.end,
      text: block.text.slice(snapped.start, snapped.end),
    };
  }

  const note = await prisma.note.create({ data, include: { user: true } });
  await notifyNote(user, note);

  revalidatePath("/oku");
  revalidatePath("/akis");

  return {
    ok: true,
    note: {
      id: note.id,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
      author: {
        id: user.id,
        displayName: user.displayName,
        avatarSeed: user.avatarSeed,
      },
      replies: [],
    },
  };
}

export async function deleteNote(id: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await prisma.note.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/oku");
  revalidatePath("/akis");
  return { ok: true };
}

/** Notify the parent's author (reply) or the span's co-underliners (new note). */
async function notifyNote(
  user: { id: string; displayName: string },
  note: { id: string; parentId: string | null; blockId: string; startOffset: number; endOffset: number },
) {
  if (note.parentId) {
    const parent = await prisma.note.findUnique({
      where: { id: note.parentId },
      select: { userId: true },
    });
    if (parent && parent.userId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: parent.userId,
          type: "reply",
          actorUserId: user.id,
          body: `${user.displayName} notuna yanıt verdi.`,
          link: "/akis",
        },
      });
    }
    return;
  }

  const coUnderliners = await prisma.highlight.findMany({
    where: {
      blockId: note.blockId,
      userId: { not: user.id },
      startOffset: { lt: note.endOffset },
      endOffset: { gt: note.startOffset },
    },
    select: { userId: true },
    distinct: ["userId"],
    take: 5,
  });

  if (coUnderliners.length === 0) return;
  await prisma.notification.createMany({
    data: coUnderliners.map((c) => ({
      userId: c.userId,
      type: "note",
      actorUserId: user.id,
      body: `${user.displayName} altını çizdiğin bir cümleye not düştü.`,
      link: "/akis",
    })),
  });
}
