"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { INTERESTS } from "@/lib/profile";

export type ProfileInput = {
  displayName: string;
  image: string | null;
  bio: string;
  age: number | null;
  gender: string | null;
  location: string;
  interests: string[];
};

export async function saveProfile(
  input: ProfileInput,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Giriş yapmalısın." };

  const displayName = input.displayName.trim();
  if (!displayName) return { ok: false, error: "İsmini gir." };
  if (displayName.length > 60) return { ok: false, error: "İsim çok uzun." };

  // Photos are stored as base64 data URLs; cap the size so the DB stays sane.
  if (input.image && input.image.length > 2_000_000) {
    return { ok: false, error: "Görsel çok büyük, daha küçük bir foto dene." };
  }

  const age =
    input.age != null && input.age >= 13 && input.age <= 120 ? Math.floor(input.age) : null;

  const interests = input.interests
    .filter((i) => (INTERESTS as readonly string[]).includes(i))
    .slice(0, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      displayName,
      image: input.image,
      bio: input.bio.trim() || null,
      age,
      gender: input.gender || null,
      location: input.location.trim() || null,
      interests: JSON.stringify(interests),
      onboarded: true,
    },
  });

  revalidatePath("/");
  revalidatePath(`/u/${user.id}`);
  revalidatePath("/profil");
  return { ok: true };
}
