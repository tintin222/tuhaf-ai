import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { getTheme } from "@/lib/themes";
import { formatDuration } from "@/lib/format";
import type { CardArticle } from "@/components/ArticleCard";

type BillboardArticle = CardArticle & {
  listenSeconds: number;
};

export function Billboard({ article }: { article: BillboardArticle }) {
  const theme = getTheme(article.posterTheme);
  const href = `/oku/${article.publisher.slug}/${article.slug}`;
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: `radial-gradient(120% 120% at 80% 0%, ${theme.bgFrom}, ${theme.bgTo})` }}
    >
      <div className="mx-auto grid max-w-shell gap-8 px-5 py-16 md:grid-cols-[1.4fr_1fr] md:py-24">
        <div className="flex flex-col justify-center">
          <span className="flex items-center gap-2 font-label text-xs uppercase tracking-[0.22em] text-red">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red" />
            Şimdi Yayında · {article.category}
          </span>
          <h1 className="mt-5 font-display text-5xl font-900 leading-[1.02] text-cream md:text-6xl">
            {article.title}
          </h1>
          <p className="mt-5 max-w-xl font-body text-lg italic text-cream-dim">
            {article.subject}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <Avatar seed={article.publisher.avatarSeed} name={article.publisher.name} image={article.publisher.image} size={40} />
            <div>
              <p className="font-body italic text-cream">{article.publisher.name}</p>
              <p className="font-label text-[11px] uppercase tracking-[0.15em] text-cream-faint">
                {article.publisher.title} · {article.readMinutes} dk okuma
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={href}
              className="rounded-full bg-red px-7 py-3 font-label text-sm uppercase tracking-[0.15em] text-cream transition-colors hover:bg-red-dark"
            >
              Oku → {article.readMinutes} dk
            </Link>
            <Link
              href={`${href}?mode=dinle`}
              className="rounded-full border border-cream/30 px-7 py-3 font-label text-sm uppercase tracking-[0.15em] text-cream transition-colors hover:border-cream"
            >
              ▍▍ Dinle · {formatDuration(article.listenSeconds)}
            </Link>
          </div>
        </div>

        <div className="hidden items-center md:flex">
          <blockquote
            className="w-full rounded-2xl border border-white/10 p-8 font-display text-2xl italic leading-relaxed text-cream"
            style={{ background: "rgba(0,0,0,0.25)" }}
          >
            “{article.pullQuote}”
          </blockquote>
        </div>
      </div>
    </section>
  );
}
