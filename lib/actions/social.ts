"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function toggleFollow(targetId: string): Promise<{ following: boolean }> {
  const user = await getCurrentUser();
  if (!user || user.id === targetId) return { following: false };

  const key = { followerId_followeeId: { followerId: user.id, followeeId: targetId } };
  const existing = await prisma.follow.findUnique({ where: key });

  if (existing) {
    await prisma.follow.delete({ where: key });
    revalidatePath(`/u/${targetId}`);
    return { following: false };
  }

  await prisma.follow.create({
    data: { followerId: user.id, followeeId: targetId },
  });
  await prisma.notification.create({
    data: {
      userId: targetId,
      type: "follow",
      actorUserId: user.id,
      body: `${user.displayName} seni takip etmeye başladı.`,
    },
  });
  revalidatePath(`/u/${targetId}`);
  return { following: true };
}

export async function markNotificationsRead(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  revalidatePath("/");
}
