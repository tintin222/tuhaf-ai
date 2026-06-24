import { Avatar } from "@/components/Avatar";
import { TrackedLink } from "@/components/TrackedLink";
import { TuhafBadge } from "@/components/TuhafLogo";
import { getTheme } from "@/lib/themes";

export type CardArticle = {
  id: string;
  slug: string;
  title: string;
  subject: string;
  pullQuote: string;
  readMinutes: number;
  category: string;
  posterTheme: string;
  publisher: { slug: string; name: string; title: string; avatarSeed: string; image?: string | null };
  sponsor?: { name: string; logoText: string } | null;
};

export function ArticleCard({
  article,
  width = "w-72",
}: {
  article: CardArticle;
  width?: string;
}) {
  const theme = getTheme(article.posterTheme);
  return (
    <TrackedLink
      href={`/oku/${article.publisher.slug}/${article.slug}`}
      articleId={article.id}
      label="card"
      className={`group relative flex ${width} shrink-0 flex-col justify-between overflow-hidden rounded-xl border border-white/10 p-5 transition-transform duration-200 hover:-translate-y-1 hover:border-white/25`}
      style={{
        background: `linear-gradient(160deg, ${theme.bgFrom}, ${theme.bgTo})`,
        height: "16rem",
      }}
    >
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: theme.accent }}
      />
      <TuhafBadge className="absolute right-4 top-4" />

      <div>
        {article.sponsor && (
          <span className="font-label text-[10px] uppercase tracking-[0.18em] text-cream-dim">
            {article.sponsor.logoText} ile
          </span>
        )}
        <h3 className="mt-2 font-display text-2xl font-700 leading-tight text-cream">
          {article.title}
        </h3>
      </div>

      <div>
        <p className="mb-4 font-body text-sm italic text-cream-dim line-clamp-2">
          {article.pullQuote}
        </p>
        <div className="flex items-center gap-2 border-t border-white/10 pt-3">
          <Avatar seed={article.publisher.avatarSeed} name={article.publisher.name} image={article.publisher.image} size={26} />
          <span className="font-body text-sm italic text-cream/80">
            {article.publisher.name}
          </span>
          <span className="ml-auto font-label text-[10px] uppercase tracking-[0.15em] text-cream-faint">
            {article.readMinutes} dk
          </span>
        </div>
      </div>
    </TrackedLink>
  );
}
