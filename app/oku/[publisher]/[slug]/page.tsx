import { notFound } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Annotator } from "@/components/reader/Annotator";
import { AudioPlayer } from "@/components/reader/AudioPlayer";
import { getArticleForReader, getOverlapSuggestions } from "@/lib/db/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDateWithDay, formatCount } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ publisher: string; slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const data = await getArticleForReader(slug, user?.id);
  if (!data) notFound();

  const { article, blocks, underlinerCount, highlightCount } = data;
  const suggestions = user ? await getOverlapSuggestions(user.id, 6) : [];

  return (
    <article className="mx-auto max-w-reader px-5 py-12">
      <header className="mb-10">
        <p className="font-label text-xs uppercase tracking-[0.18em] text-cream-dim">
          {formatDateWithDay(new Date(article.publishedAt))}
        </p>
        <span className="mt-4 inline-block rounded bg-red px-3 py-1 font-label text-[11px] uppercase tracking-[0.15em] text-cream">
          {article.category}
        </span>
        <h1 className="mt-4 font-display text-5xl font-900 leading-[1.04] text-cream">
          {article.title}
        </h1>
        <p className="mt-5 font-body text-xl italic text-cream-dim">{article.subject}</p>

        <div className="mt-6 flex items-center gap-3 border-y border-white/10 py-4">
          <Avatar seed={article.publisher.avatarSeed} name={article.publisher.name} size={44} />
          <div>
            <Link href={`/yazar/${article.publisher.slug}`} className="font-body italic text-cream hover:text-red">
              {article.publisher.name}
            </Link>
            <p className="font-label text-[11px] uppercase tracking-[0.15em] text-cream-faint">
              {article.publisher.title} · {article.readMinutes} dk okuma
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="font-display text-2xl font-700 text-red">{formatCount(underlinerCount)}</p>
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-cream-faint">
              kişi altını çizdi
            </p>
          </div>
        </div>
      </header>

      <Annotator
        blocks={blocks}
        isLoggedIn={!!user}
        article={{ title: article.title, publisherName: article.publisher.name }}
      />

      <p className="mt-10 font-body text-sm text-cream-faint">
        Bu sayfada toplam {formatCount(highlightCount)} altı çizili bölüm var. Bir cümle
        seçip kendi izini bırak.
      </p>

      {suggestions.length > 0 && (
        <section className="mt-12 rounded-2xl border border-white/10 bg-ink-soft p-6">
          <h2 className="font-label text-xs uppercase tracking-[0.18em] text-cream-dim">
            Seninle aynı cümlelerin altını çizenler
          </h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {suggestions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/u/${s.id}`}
                  className="flex items-center gap-2 rounded-full border border-white/10 py-1.5 pl-1.5 pr-4 hover:border-red"
                >
                  <Avatar seed={s.avatarSeed} name={s.displayName} size={28} />
                  <span className="font-body text-sm text-cream">{s.displayName}</span>
                  <span className="font-label text-[10px] uppercase tracking-[0.12em] text-red">
                    {s.shared} ortak
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-12">
        <AudioPlayer
          audioUrl={article.audioUrl}
          listenSeconds={article.listenSeconds}
          title={article.title}
        />
      </div>
    </article>
  );
}
