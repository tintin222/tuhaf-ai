import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Gate } from "@/components/Gate";
import { getCurrentUser } from "@/lib/auth/session";
import { getJournal, getReadingStats, type Badge } from "@/lib/db/queries";
import { formatDateLong, relativeDay } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const user = await getCurrentUser();
  if (!user) return <Gate title="Günlüğün seni bekliyor." body="Okuduğun, altını çizdiğin her gün burada birikir." />;

  const [days, stats] = await Promise.all([
    getJournal(user.id),
    getReadingStats(user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <p className="font-label text-xs uppercase tracking-[0.18em] text-cream-dim">
        Günlüğün
      </p>
      <h1 className="mt-2 font-display text-4xl font-900 italic text-cream">
        Okuma günlüğün
      </h1>

      {stats.currentStreak > 0 && (
        <p className="mt-4 font-body text-lg italic text-cream-dim">
          🔥 <span className="text-red">{stats.currentStreak} gün</span> üst üste okudun
          {stats.longestStreak > stats.currentStreak && (
            <span className="text-cream-faint"> · en uzun seri {stats.longestStreak} gün</span>
          )}
          .
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-y border-white/10 py-5">
        <Stat n={stats.totalDays} label="gün" />
        <Stat n={stats.totalArticles} label="yazı" />
        <Stat n={stats.totalHighlights} label="altı çizili" />
        <Stat n={stats.noteCount} label="not" />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {stats.badges.map((b) => (
          <BadgeChip key={b.key} badge={b} />
        ))}
      </div>

      {days.length === 0 ? (
        <p className="mt-10 font-body text-lg italic text-cream-dim">
          Henüz bir iz bırakmadın. <Link href="/" className="text-red">Bugünün yazısıyla</Link> başla.
        </p>
      ) : (
        <ol className="mt-10 space-y-10">
          {days.map((day) => (
            <li key={day.date.toISOString()} className="relative border-l border-white/15 pl-6">
              <span className="absolute -left-[7px] top-1.5 h-3.5 w-3.5 rounded-full bg-red" />
              <p className="font-label text-xs uppercase tracking-[0.15em] text-cream">
                {relativeDay(day.date)}
              </p>
              <p className="font-label text-[10px] uppercase tracking-[0.12em] text-cream-faint">
                {formatDateLong(day.date)}
              </p>
              <ul className="mt-4 space-y-3">
                {day.articles.map(({ article, count }) => (
                  <li key={article.id}>
                    <Link
                      href={`/oku/${article.publisher.slug}/${article.slug}`}
                      className="flex items-center gap-3 rounded-xl border border-white/10 p-4 hover:border-white/25"
                    >
                      <Avatar seed={article.publisher.avatarSeed} name={article.publisher.name} image={article.publisher.image} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-lg text-cream">{article.title}</p>
                        <p className="font-label text-[10px] uppercase tracking-[0.14em] text-cream-faint">
                          {article.publisher.name}
                        </p>
                      </div>
                      <span className="font-label text-[11px] uppercase tracking-[0.12em] text-red">
                        {count} çizgi
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <span className="font-display text-3xl font-700 text-cream">{n}</span>
      <span className="ml-2 font-body italic text-cream-dim">{label}</span>
    </div>
  );
}

function BadgeChip({ badge }: { badge: Badge }) {
  return (
    <span
      title={badge.hint}
      className={`rounded-full border px-3 py-1 font-label text-[10px] uppercase tracking-[0.12em] ${
        badge.earned
          ? "border-red bg-red/10 text-red"
          : "border-white/10 text-cream-faint opacity-60"
      }`}
    >
      {badge.earned ? "★ " : ""}
      {badge.label}
    </span>
  );
}
