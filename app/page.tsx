import { SubscribeBlock } from "@/components/SubscribeBlock";
import { Billboard } from "@/components/Billboard";
import { Rail } from "@/components/Rail";
import { ClubRail } from "@/components/ClubRail";
import { Avatar } from "@/components/Avatar";
import {
  getLiveArticle,
  getTrendingArticles,
  getClubMembers,
  getCategoryRails,
} from "@/lib/db/queries";
import type { CardArticle } from "@/components/ArticleCard";
import { formatCount } from "@/lib/format";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function toCard(a: any): CardArticle {
  return {
    slug: a.slug,
    title: a.title,
    subject: a.subject,
    pullQuote: a.pullQuote,
    readMinutes: a.readMinutes,
    category: a.category,
    posterTheme: a.posterTheme,
    publisher: {
      slug: a.publisher.slug,
      name: a.publisher.name,
      title: a.publisher.title,
      avatarSeed: a.publisher.avatarSeed,
    },
    sponsor: a.sponsor ? { name: a.sponsor.name, logoText: a.sponsor.logoText } : null,
  };
}

export default async function Home() {
  const [live, trending, members, rails, totalHighlights] = await Promise.all([
    getLiveArticle(),
    getTrendingArticles(12),
    getClubMembers(),
    getCategoryRails(),
    prisma.highlight.count(),
  ]);

  return (
    <div>
      <SubscribeBlock />

      {live && (
        <Billboard
          article={{ ...toCard(live), listenSeconds: live.listenSeconds }}
        />
      )}

      {/* Social proof strip */}
      <div className="border-y border-white/10 bg-ink-soft">
        <div className="mx-auto flex max-w-shell flex-wrap items-center gap-x-8 gap-y-3 px-5 py-6">
          <div>
            <span className="font-display text-3xl font-700 text-cream">
              {formatCount(120000 + totalHighlights * 247)}
            </span>
            <span className="ml-2 font-body italic text-cream-dim">
              kişi bu sabah birlikte okudu
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex -space-x-2">
              {members.slice(0, 5).map((m) => (
                <Avatar
                  key={m.slug}
                  seed={m.avatarSeed}
                  name={m.name}
                  size={32}
                  className="ring-2 ring-ink-soft"
                />
              ))}
            </div>
            <span className="ml-2 flex items-center gap-1 font-label text-[11px] uppercase tracking-[0.15em] text-red">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red" /> Canlı
            </span>
          </div>
        </div>
      </div>

      <Rail
        title="Gündemdekiler"
        allHref="/en-cok-alti-cizilenler"
        articles={trending.map(toCard)}
      />

      <ClubRail members={members.map((m) => ({ slug: m.slug, name: m.name, title: m.title, avatarSeed: m.avatarSeed, image: m.image }))} />

      {rails.map((r) => (
        <Rail
          key={r.sponsor.id}
          title={r.sponsor.category}
          sponsorLogo={r.sponsor.logoText}
          allHref="/arsiv"
          articles={r.articles.map(toCard)}
        />
      ))}
    </div>
  );
}
