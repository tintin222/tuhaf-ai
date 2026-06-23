import { ArticleCard, type CardArticle } from "@/components/ArticleCard";
import { getArchiveArticles } from "@/lib/db/queries";
import { formatDateLong } from "@/lib/format";

export const dynamic = "force-dynamic";

function toCard(a: any): CardArticle {
  return {
    slug: a.slug, title: a.title, subject: a.subject, pullQuote: a.pullQuote,
    readMinutes: a.readMinutes, category: a.category, posterTheme: a.posterTheme,
    publisher: { slug: a.publisher.slug, name: a.publisher.name, title: a.publisher.title, avatarSeed: a.publisher.avatarSeed },
    sponsor: a.sponsor ? { name: a.sponsor.name, logoText: a.sponsor.logoText } : null,
  };
}

export default async function ArchivePage() {
  const articles = await getArchiveArticles();

  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <p className="font-label text-xs uppercase tracking-[0.18em] text-cream-dim">Arşiv</p>
      <h1 className="mt-2 font-display text-4xl font-900 italic text-cream">
        Geçmiş sayfalar
      </h1>
      <p className="mt-3 font-body text-lg text-cream-dim">
        {articles.length} yazı · en yeniden eskiye
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <div key={a.slug}>
            <p className="mb-2 font-label text-[10px] uppercase tracking-[0.14em] text-cream-faint">
              {formatDateLong(new Date(a.publishedAt))}
            </p>
            <ArticleCard article={toCard(a)} width="w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
