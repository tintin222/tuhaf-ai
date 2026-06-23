import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Gate } from "@/components/Gate";
import { getCurrentUser } from "@/lib/auth/session";
import { getJournal } from "@/lib/db/queries";
import { formatDateLong, relativeDay } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const user = await getCurrentUser();
  if (!user) return <Gate title="Günlüğün seni bekliyor." body="Okuduğun, altını çizdiğin her gün burada birikir." />;

  const days = await getJournal(user.id);
  const totalArticles = new Set(
    days.flatMap((d) => d.articles.map((a) => a.article.id)),
  ).size;
  const totalHighlights = days.reduce(
    (sum, d) => sum + d.articles.reduce((s, a) => s + a.count, 0),
    0,
  );

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <p className="font-label text-xs uppercase tracking-[0.18em] text-cream-dim">
        Günlüğün
      </p>
      <h1 className="mt-2 font-display text-4xl font-900 italic text-cream">
        Okuma günlüğün
      </h1>

      <div className="mt-6 flex gap-8 border-y border-white/10 py-5">
        <Stat n={days.length} label="gün" />
        <Stat n={totalArticles} label="yazı" />
        <Stat n={totalHighlights} label="altı çizili" />
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
                      <Avatar seed={article.publisher.avatarSeed} name={article.publisher.name} size={36} />
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
