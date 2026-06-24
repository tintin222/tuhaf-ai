import Link from "next/link";
import { listAdminArticles } from "@/lib/admin/queries";
import { formatDateLong } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const articles = await listAdminArticles();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-700 text-cream">İçerik</h1>
        <Link
          href="/admin/icerik/yeni"
          className="rounded-full bg-red px-5 py-2.5 font-label text-xs uppercase tracking-[0.14em] text-cream hover:bg-red-dark"
        >
          + Yeni içerik
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left">
          <thead className="border-b border-white/10 bg-white/[0.02] font-label text-[10px] uppercase tracking-[0.12em] text-cream-faint">
            <tr>
              <th className="px-4 py-3">Başlık</th>
              <th className="px-4 py-3">Yazar</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3 text-right">Altı çizili</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <Link href={`/admin/icerik/${a.id}`} className="font-body text-cream hover:text-red">
                    {a.title}
                  </Link>
                  {a.isLive && (
                    <span className="ml-2 rounded bg-red px-1.5 py-0.5 font-label text-[9px] uppercase tracking-[0.1em] text-cream">
                      Canlı
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-body text-sm text-cream-dim">{a.publisher.name}</td>
                <td className="px-4 py-3 font-body text-sm text-cream-dim">{a.category}</td>
                <td className="px-4 py-3">
                  <span
                    className={`font-label text-[10px] uppercase tracking-[0.1em] ${
                      a.status === "published" ? "text-cream" : "text-cream-faint"
                    }`}
                  >
                    {a.status === "published" ? "Yayında" : "Taslak"}
                  </span>
                </td>
                <td className="px-4 py-3 font-label text-[10px] uppercase tracking-[0.1em] text-cream-faint">
                  {formatDateLong(new Date(a.publishedAt))}
                </td>
                <td className="px-4 py-3 text-right font-body text-sm text-red">
                  {a._count.highlights}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
