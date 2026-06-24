"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { THEME_LIST } from "@/lib/themes";
import { deleteHighlight } from "@/lib/actions/highlights";

export type ComposerHighlight = {
  id: string;
  text: string;
  articleTitle: string;
  publisherName: string;
};

export function ShareCardComposer({
  highlights,
}: {
  highlights: ComposerHighlight[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<ComposerHighlight[]>(highlights);
  const [selectedId, setSelectedId] = useState(highlights[0]?.id ?? "");
  const [theme, setTheme] = useState("crimson");
  const [copied, setCopied] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startDelete] = useTransition();

  const remove = (id: string) => {
    if (!confirm("Bu altı çizili cümleyi silmek istiyor musun?")) return;
    setPendingId(id);
    startDelete(async () => {
      const res = await deleteHighlight(id);
      if (res.ok) {
        setItems((prev) => prev.filter((h) => h.id !== id));
        setSelectedId((cur) => (cur === id ? "" : cur));
      }
      setPendingId(null);
      router.refresh();
    });
  };

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-ink-soft p-8 text-center font-body text-lg italic text-cream-dim">
        Henüz altını çizdiğin bir cümle yok. Bir yazıya gir, bir cümle seç.
      </p>
    );
  }

  const selected = items.find((h) => h.id === selectedId) ?? items[0]!;
  const cardUrl = `/api/quote-card?highlightId=${encodeURIComponent(selected.id)}&theme=${theme}`;

  const share = async () => {
    try {
      const res = await fetch(cardUrl);
      const blob = await res.blob();
      const file = new File([blob], "tuhaf-alinti.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Tuhaf Club" });
        return;
      }
    } catch {
      /* ignore */
    }
    window.open(cardUrl, "_blank");
  };

  const copy = async () => {
    try {
      const res = await fetch(cardUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.open(cardUrl, "_blank");
    }
  };

  return (
    <div>
      {/* Preview */}
      <div className="overflow-hidden rounded-2xl border border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={cardUrl} src={cardUrl} alt="Alıntı kartı" className="aspect-square w-full object-cover" />
      </div>

      {/* Themes */}
      <p className="mt-6 font-label text-[11px] uppercase tracking-[0.18em] text-cream-faint">
        Renk Teması
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        {THEME_LIST.map((t) => (
          <button
            key={t.key}
            onClick={() => setTheme(t.key)}
            aria-label={t.label}
            className={`h-9 w-9 rounded-full ring-2 transition ${
              theme === t.key ? "ring-cream" : "ring-transparent hover:ring-white/30"
            }`}
            style={{ background: `linear-gradient(150deg, ${t.bgFrom}, ${t.accent})` }}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <button onClick={share} className="rounded-lg bg-red px-4 py-3 font-label text-xs uppercase tracking-[0.12em] text-cream hover:bg-red-dark">
          Paylaş
        </button>
        <button onClick={copy} className="rounded-lg bg-ink-card px-4 py-3 font-label text-xs uppercase tracking-[0.12em] text-cream ring-1 ring-white/10 hover:ring-white/30">
          {copied ? "Kopyalandı" : "Kopyala"}
        </button>
        <a href={`${cardUrl}&download=1`} className="rounded-lg bg-ink-card px-4 py-3 text-center font-label text-xs uppercase tracking-[0.12em] text-cream ring-1 ring-white/10 hover:ring-white/30">
          İndir
        </a>
      </div>

      {/* All highlights list */}
      <p className="mt-10 font-label text-[11px] uppercase tracking-[0.18em] text-cream-faint">
        Tüm Altı Çizilenlerin
      </p>
      <ul className="mt-3 space-y-3">
        {items.map((h) => (
          <li
            key={h.id}
            className={`flex items-center gap-4 rounded-xl border p-4 transition-opacity ${
              h.id === selected.id ? "border-red/60 bg-red/5" : "border-white/10"
            } ${pendingId === h.id ? "opacity-50" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg italic leading-snug text-cream line-clamp-2">
                “{h.text}”
              </p>
              <p className="mt-1 font-label text-[10px] uppercase tracking-[0.14em] text-cream-faint">
                {h.articleTitle} · {h.publisherName}
              </p>
            </div>
            <button
              onClick={() => setSelectedId(h.id)}
              className="shrink-0 rounded-full border border-white/20 px-4 py-1.5 font-label text-[11px] uppercase tracking-[0.12em] text-cream hover:border-red hover:text-red"
            >
              Seç
            </button>
            <button
              onClick={() => remove(h.id)}
              disabled={pendingId === h.id}
              aria-label="Sil"
              title="Sil"
              className="shrink-0 rounded-full border border-white/15 p-2 text-cream-faint hover:border-red hover:text-red disabled:opacity-50"
            >
              <TrashIcon />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  );
}
