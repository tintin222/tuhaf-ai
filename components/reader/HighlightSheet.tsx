"use client";

/** The "Altını Çizdiklerim" bottom sheet shown when a personal mark is tapped. */
export function HighlightSheet({
  highlightId,
  text,
  article,
  onClose,
  onDelete,
}: {
  highlightId: string;
  text: string;
  article: { title: string; publisherName: string };
  onClose: () => void;
  onDelete: () => void;
}) {
  const cardUrl = `/api/quote-card?highlightId=${encodeURIComponent(highlightId)}`;

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
      /* fall through to opening the image */
    }
    window.open(cardUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-lg rounded-t-3xl border-t border-white/10 bg-ink-card p-6 pb-10 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-white/20" />
        <p className="font-label text-xs uppercase tracking-[0.18em] text-cream-dim">
          Altını Çizdiklerim
        </p>

        <div className="mt-4 flex gap-4">
          <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-lg bg-red font-display text-3xl italic text-cream">
            т
          </div>
          <blockquote className="font-display text-xl italic leading-snug text-cream">
            “{text}”
          </blockquote>
        </div>
        <p className="mt-3 font-body text-sm text-cream-faint">
          {article.title} · {article.publisherName}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={share}
            className="rounded-full bg-red px-6 py-3 font-label text-sm uppercase tracking-[0.12em] text-cream hover:bg-red-dark"
          >
            Instagram’da Paylaş
          </button>
          <a
            href={`${cardUrl}&download=1`}
            className="rounded-full border border-cream/25 px-6 py-3 font-label text-sm uppercase tracking-[0.12em] text-cream hover:border-cream"
          >
            İndir
          </a>
          <button
            onClick={onDelete}
            className="ml-auto rounded-full px-4 py-3 font-label text-sm uppercase tracking-[0.12em] text-cream-faint hover:text-red"
          >
            Sil
          </button>
        </div>
      </div>
    </div>
  );
}
