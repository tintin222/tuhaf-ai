"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

/** Toggle a "ben de" reaction on another reader's underline. */
export async function toggleReaction(
  highlightId: string,
): Promise<{ reacted: boolean; count: number }> {
  const user = await getCurrentUser();
  if (!user) return { reacted: false, count: 0 };

  const key = { highlightId_userId: { highlightId, userId: user.id } };
  const existing = await prisma.highlightReaction.findUnique({ where: key });

  if (existing) {
    await prisma.highlightReaction.delete({ where: key });
  } else {
    const hl = await prisma.highlight.findUnique({
      where: { id: highlightId },
      select: { userId: true },
    });
    if (!hl) return { reacted: false, count: 0 };

    await prisma.highlightReaction.create({ data: { highlightId, userId: user.id } });

    if (hl.userId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: hl.userId,
          type: "reaction",
          actorUserId: user.id,
          body: `${user.displayName} altını çizdiğin bir cümleye "ben de" dedi.`,
          link: "/akis",
        },
      });
    }
  }

  const count = await prisma.highlightReaction.count({ where: { highlightId } });
  revalidatePath("/akis");
  return { reacted: !existing, count };
}
