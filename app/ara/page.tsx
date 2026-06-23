import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { search } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const { articles, highlights } = await search(q);

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <form action="/ara" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="Yazı, yazar veya altı çizili cümle ara…"
          className="w-full rounded-lg bg-ink-card px-5 py-4 font-body text-lg text-cream placeholder:text-cream-faint focus:outline-none focus:ring-2 focus:ring-red"
        />
      </form>

      {q && (
        <p className="mt-4 font-label text-xs uppercase tracking-[0.15em] text-cream-faint">
          “{q}” için {articles.length + highlights.length} sonuç
        </p>
      )}

      {articles.length > 0 && (
        <section className="mt-8">
          <h2 className="font-label text-xs uppercase tracking-[0.18em] text-cream-dim">Yazılar</h2>
          <ul className="mt-3 space-y-3">
            {articles.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/oku/${a.publisher.slug}/${a.slug}`}
                  className="flex items-center gap-3 rounded-xl border border-white/10 p-4 hover:border-white/25"
                >
                  <Avatar seed={a.publisher.avatarSeed} name={a.publisher.name} size={36} />
                  <div>
                    <p className="font-display text-lg text-cream">{a.title}</p>
                    <p className="font-label text-[10px] uppercase tracking-[0.14em] text-cream-faint">
                      {a.publisher.name} · {a.category}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {highlights.length > 0 && (
        <section className="mt-8">
          <h2 className="font-label text-xs uppercase tracking-[0.18em] text-cream-dim">
            Altı çizili cümleler
          </h2>
          <ul className="mt-3 space-y-3">
            {highlights.map((h) => (
              <li key={h.id} className="rounded-xl border border-white/10 p-4">
                <Link href={`/oku/${h.article.publisher.slug}/${h.article.slug}`} className="font-display text-lg italic text-cream hover:text-red">
                  “{h.text}”
                </Link>
                <p className="mt-1 font-label text-[10px] uppercase tracking-[0.14em] text-cream-faint">
                  {h.article.title} · {h.user.displayName}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {q && articles.length === 0 && highlights.length === 0 && (
        <p className="mt-10 font-body text-lg italic text-cream-dim">Sonuç bulunamadı.</p>
      )}
    </div>
  );
}
