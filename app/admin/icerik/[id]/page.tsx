import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { getArticleForEdit, listCategories, listPublishersForSelect } from "@/lib/admin/queries";
import { THEME_LIST } from "@/lib/themes";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, categories, publishers] = await Promise.all([
    getArticleForEdit(id),
    listCategories(),
    listPublishersForSelect(),
  ]);
  if (!data) notFound();
  const { article, body } = data;

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link href="/admin/icerik" className="font-label text-[11px] uppercase tracking-[0.15em] text-cream-faint hover:text-red">
          ← İçerik
        </Link>
        <Link
          href={`/oku/${article.publisher.slug}/${article.slug}`}
          className="font-label text-[11px] uppercase tracking-[0.15em] text-cream-faint hover:text-red"
        >
          Yayında gör →
        </Link>
      </div>
      <h1 className="mb-6 mt-3 font-display text-3xl font-700 text-cream">İçeriği düzenle</h1>
      <ArticleForm
        initial={{
          id: article.id,
          title: article.title,
          slug: article.slug,
          subject: article.subject,
          category: article.category,
          publisherId: article.publisherId,
          pullQuote: article.pullQuote,
          readMinutes: article.readMinutes,
          listenSeconds: article.listenSeconds,
          posterTheme: article.posterTheme,
          status: article.status,
          isLive: article.isLive,
          publishedAt: new Date(article.publishedAt).toISOString().slice(0, 10),
          audioUrl: article.audioUrl,
          body,
        }}
        publishers={publishers.map((p) => ({ value: p.id, label: `${p.name} · ${p.category}` }))}
        categories={categories.map((c) => ({ value: c.name, label: c.name }))}
        themes={THEME_LIST.map((t) => ({ value: t.key, label: t.label }))}
      />
    </div>
  );
}
