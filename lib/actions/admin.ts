"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAdminUser } from "@/lib/auth/admin";
import { parseBody, slugify } from "@/lib/admin/blocks";

export type ArticleInput = {
  id?: string;
  title: string;
  slug: string;
  subject: string;
  category: string;
  publisherId: string;
  pullQuote: string;
  readMinutes: number;
  listenSeconds: number;
  posterTheme: string;
  status: string;
  isLive: boolean;
  publishedAt: string; // yyyy-mm-dd
  audioUrl: string | null;
  body: string;
};

export type SaveArticleResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; error: string };

/** Ensure a slug is unique, excluding the article being edited. */
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "yazi";
  let slug = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    n += 1;
    slug = `${root}-${n}`;
  }
}

export async function saveArticle(input: ArticleInput): Promise<SaveArticleResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "Yetkin yok." };

  const title = input.title.trim();
  if (!title) return { ok: false, error: "Başlık gerekli." };
  if (!input.publisherId) return { ok: false, error: "Yazar seç." };
  if (!input.category) return { ok: false, error: "Kategori seç." };

  const blocks = parseBody(input.body);
  if (blocks.length === 0) return { ok: false, error: "İçerik metni boş olamaz." };

  const slug = await uniqueSlug(input.slug || title, input.id);
  const publishedAt = input.publishedAt ? new Date(input.publishedAt) : new Date();

  const data = {
    title,
    slug,
    subject: input.subject.trim(),
    category: input.category,
    publisherId: input.publisherId,
    pullQuote: input.pullQuote.trim() || blocks[0]!.text.slice(0, 120),
    readMinutes: clampInt(input.readMinutes, 1, 60, 4),
    listenSeconds: clampInt(input.listenSeconds, 0, 7200, 240),
    posterTheme: input.posterTheme || "crimson",
    status: input.status === "draft" ? "draft" : "published",
    isLive: !!input.isLive,
    audioUrl: input.audioUrl || null,
    publishedAt,
  };

  // Only one billboard "live" article at a time.
  if (data.isLive) {
    await prisma.article.updateMany({
      where: { isLive: true, ...(input.id ? { id: { not: input.id } } : {}) },
      data: { isLive: false },
    });
  }

  let articleId: string;
  if (input.id) {
    await prisma.article.update({ where: { id: input.id }, data });
    await prisma.articleBlock.deleteMany({ where: { articleId: input.id } });
    articleId = input.id;
  } else {
    const created = await prisma.article.create({ data });
    articleId = created.id;
  }

  await prisma.articleBlock.createMany({
    data: blocks.map((b, i) => ({
      articleId,
      index: i,
      type: b.type,
      text: b.text,
    })),
  });

  revalidatePath("/");
  revalidatePath("/admin/icerik");
  revalidatePath(`/oku`);
  return { ok: true, id: articleId, slug };
}

export async function deleteArticle(id: string): Promise<{ ok: boolean }> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false };
  await prisma.article.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/admin/icerik");
  return { ok: true };
}

export type CategoryInput = { id?: string; name: string; accent: string; order: number };

export async function saveCategory(
  input: CategoryInput,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "Yetkin yok." };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "İsim gerekli." };
  const slug = slugify(name);

  if (input.id) {
    await prisma.category.update({
      where: { id: input.id },
      data: { name, accent: input.accent || "#D9291C", order: input.order },
    });
  } else {
    const exists = await prisma.category.findUnique({ where: { slug } });
    if (exists) return { ok: false, error: "Bu kategori zaten var." };
    await prisma.category.create({
      data: { name, slug, accent: input.accent || "#D9291C", order: input.order },
    });
  }
  revalidatePath("/admin/kategoriler");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<{ ok: boolean }> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false };
  await prisma.category.delete({ where: { id } });
  revalidatePath("/admin/kategoriler");
  return { ok: true };
}

function clampInt(v: number, min: number, max: number, fallback: number): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
