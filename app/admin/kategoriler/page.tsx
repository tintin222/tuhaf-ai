import { CategoryManager } from "@/components/admin/CategoryManager";
import { listCategories } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await listCategories();
  return (
    <div>
      <h1 className="font-display text-3xl font-700 text-cream">Kategoriler</h1>
      <p className="mb-6 mt-2 font-body text-cream-dim">
        İçerik formundaki kategori seçeneklerini buradan yönet.
      </p>
      <CategoryManager categories={categories} />
    </div>
  );
}
