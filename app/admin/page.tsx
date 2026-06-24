import Link from "next/link";
import { getAnalytics } from "@/lib/admin/queries";
import { formatCount } from "@/lib/format";

export const dynamic = "force-dynamic";

const CLICK_LABELS: Record<string, string> = {
  card: "Kart tıklaması",
  "billboard-oku": "Billboard · Oku",
  "billboard-dinle": "Billboard · Dinle",
};

export default async function AdminOverviewPage() {
  const a = await getAnalytics();
  const maxClick = Math.max(1, ...a.clicksByLabel.map((c) => c.count));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-700 text-cream">Genel Bakış</h1>
        <p className="mt-1 font-body text-cream-dim">Okur etkileşimi ve içerik metrikleri.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Açılma" value={a.totals.opens} accent />
        <Metric label="Dinleme" value={a.totals.listens} accent />
        <Metric label="Tıklama" value={a.totals.clicks} accent />
        <Metric label="Altı çizili" value={a.totals.highlights} />
        <Metric label="İçerik" value={a.totals.articles} />
        <Metric label="Okur" value={a.totals.users} />
        <Metric label="Not" value={a.totals.notes} />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Panel title="En çok açılan içerikler">
          <RankList rows={a.mostOpened} unit="açılma" />
        </Panel>
        <Panel title="En çok dinlenen içerikler">
          <RankList rows={a.mostListened} unit="dinleme" />
        </Panel>
      </div>

      <Panel title="Tıklamalar nereye gidiyor?">
        {a.clicksByLabel.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-3">
            {a.clicksByLabel.map((c) => (
              <li key={c.label} className="flex items-center gap-3">
                <span className="w-40 shrink-0 font-body text-sm text-cream-dim">
                  {CLICK_LABELS[c.label] ?? c.label}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-red" style={{ width: `${(c.count / maxClick) * 100}%` }} />
                </div>
                <span className="w-12 text-right font-label text-xs tabular-nums text-cream">
                  {formatCount(c.count)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 p-4">
      <p className={`font-display text-3xl font-700 ${accent ? "text-red" : "text-cream"}`}>
        {formatCount(value)}
      </p>
      <p className="mt-1 font-label text-[10px] uppercase tracking-[0.14em] text-cream-faint">
        {label}
      </p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 p-6">
      <h2 className="mb-4 font-label text-xs uppercase tracking-[0.16em] text-cream-dim">{title}</h2>
      {children}
    </section>
  );
}

function RankList({
  rows,
  unit,
}: {
  rows: { article: { title: string; slug: string; publisher: { name: string; slug: string } }; count: number }[];
  unit: string;
}) {
  if (rows.length === 0) return <Empty />;
  return (
    <ol className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.article.slug} className="flex items-center gap-3">
          <span className="w-5 font-display text-lg italic text-cream-faint">{i + 1}</span>
          <Link
            href={`/oku/${r.article.publisher.slug}/${r.article.slug}`}
            className="min-w-0 flex-1 truncate font-body text-cream hover:text-red"
          >
            {r.article.title}
            <span className="ml-2 font-body text-sm text-cream-faint">{r.article.publisher.name}</span>
          </Link>
          <span className="font-label text-xs tabular-nums text-red">
            {formatCount(r.count)} {unit}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Empty() {
  return <p className="font-body text-sm italic text-cream-faint">Henüz veri yok.</p>;
}
