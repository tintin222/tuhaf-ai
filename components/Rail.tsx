import Link from "next/link";
import { ArticleCard, type CardArticle } from "@/components/ArticleCard";

/** A Netflix-style horizontal rail of article cards. */
export function Rail({
  title,
  sponsorLogo,
  allHref,
  articles,
}: {
  title: string;
  sponsorLogo?: string;
  allHref?: string;
  articles: CardArticle[];
}) {
  if (articles.length === 0) return null;
  return (
    <section className="py-6">
      <div className="mx-auto flex max-w-shell items-baseline gap-3 px-5">
        <h2 className="font-label text-sm font-500 uppercase tracking-[0.18em] text-cream">
          {sponsorLogo ? (
            <>
              <span className="text-red">{sponsorLogo}</span>{" "}
              <span className="text-cream-dim">ile</span> {title}
            </>
          ) : (
            title
          )}
        </h2>
        {allHref && (
          <Link
            href={allHref}
            className="ml-auto font-label text-xs uppercase tracking-[0.15em] text-cream-dim hover:text-red"
          >
            Tümü →
          </Link>
        )}
      </div>
      <div className="no-scrollbar mt-4 flex gap-4 overflow-x-auto px-5 pb-2">
        {articles.map((a) => (
          <ArticleCard key={a.slug} article={a} />
        ))}
      </div>
    </section>
  );
}
