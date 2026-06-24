"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCategory, deleteCategory } from "@/lib/actions/admin";

type Cat = { id: string; name: string; slug: string; accent: string; order: number };

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [accent, setAccent] = useState("#D9291C");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const add = () => {
    if (!name.trim()) return;
    setError(null);
    start(async () => {
      const res = await saveCategory({ name, accent, order: categories.length });
      if (res.ok) {
        setName("");
        router.refresh();
      } else {
        setError(res.error ?? "Eklenemedi.");
      }
    });
  };

  const remove = (id: string) =>
    start(async () => {
      await deleteCategory(id);
      router.refresh();
    });

  return (
    <div className="max-w-xl">
      <ul className="space-y-2">
        {categories.map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3"
          >
            <span className="h-4 w-4 rounded-full" style={{ background: c.accent }} />
            <span className="font-body text-cream">{c.name}</span>
            <span className="font-label text-[10px] uppercase tracking-[0.12em] text-cream-faint">
              {c.slug}
            </span>
            <button
              onClick={() => remove(c.id)}
              disabled={pending}
              className="ml-auto font-label text-[10px] uppercase tracking-[0.12em] text-cream-faint hover:text-red"
            >
              Sil
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-xl border border-white/10 p-4">
        <p className="mb-3 font-label text-[11px] uppercase tracking-[0.15em] text-cream-dim">
          Yeni kategori
        </p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            className="h-10 w-12 cursor-pointer rounded border border-white/15 bg-ink"
            aria-label="Renk"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Kategori adı"
            className="flex-1 rounded-lg border border-white/15 bg-ink px-3 py-2.5 font-body text-cream placeholder:text-cream-faint focus:border-red focus:outline-none"
          />
          <button
            onClick={add}
            disabled={pending || !name.trim()}
            className="rounded-full bg-red px-5 py-2.5 font-label text-xs uppercase tracking-[0.12em] text-cream hover:bg-red-dark disabled:opacity-50"
          >
            Ekle
          </button>
        </div>
        {error && <p className="mt-2 font-body text-sm text-red">{error}</p>}
      </div>
    </div>
  );
}
