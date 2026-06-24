import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { getMostUnderlinedArticles } from "@/lib/db/queries";
import { formatCount } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MostUnderlinedPage() {
  const articles = await getMostUnderlinedArticles(30);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="font-label text-xs uppercase tracking-[0.18em] text-cream-dim">
        En Çok Altı Çizilenler
      </p>
      <h1 className="mt-2 font-display text-4xl font-900 italic text-cream">
        Birlikte çizdiklerimiz
      </h1>
      <p className="mt-3 font-body text-lg text-cream-dim">
        En çok okurun iz bıraktığı yazılar.
      </p>

      <ol className="mt-10 space-y-4">
        {articles.map((a, i) => (
          <li key={a.slug}>
            <Link
              href={`/oku/${a.publisher.slug}/${a.slug}`}
              className="flex items-center gap-5 rounded-2xl border border-white/10 p-5 hover:border-white/25"
            >
              <span className="w-8 shrink-0 font-display text-3xl font-700 text-cream-faint">
                {i + 1}
              </span>
              <Avatar seed={a.publisher.avatarSeed} name={a.publisher.name} image={a.publisher.image} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-2xl text-cream">{a.title}</p>
                <p className="font-label text-[10px] uppercase tracking-[0.14em] text-cream-faint">
                  {a.publisher.name} · {a.category}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-2xl font-700 text-red">
                  {formatCount(a.underliners)}
                </p>
                <p className="font-label text-[10px] uppercase tracking-[0.12em] text-cream-faint">
                  kişi · {formatCount(a.totalHighlights)} çizgi
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
