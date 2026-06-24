import Link from "next/link";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { listCategories, listPublishersForSelect } from "@/lib/admin/queries";
import { THEME_LIST } from "@/lib/themes";

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const [categories, publishers] = await Promise.all([
    listCategories(),
    listPublishersForSelect(),
  ]);

  return (
    <div>
      <Link href="/admin/icerik" className="font-label text-[11px] uppercase tracking-[0.15em] text-cream-faint hover:text-red">
        ← İçerik
      </Link>
      <h1 className="mb-6 mt-3 font-display text-3xl font-700 text-cream">Yeni içerik</h1>
      <ArticleForm
        initial={{}}
        publishers={publishers.map((p) => ({ value: p.id, label: `${p.name} · ${p.category}` }))}
        categories={categories.map((c) => ({ value: c.name, label: c.name }))}
        themes={THEME_LIST.map((t) => ({ value: t.key, label: t.label }))}
      />
    </div>
  );
}
