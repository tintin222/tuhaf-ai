"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { readSelection, snapToWords } from "@/lib/highlights/offsets";
import { intensityBand, type Segment } from "@/lib/highlights/segmentation";
import { createHighlight, deleteHighlight } from "@/lib/actions/highlights";
import { HighlightSheet } from "@/components/reader/HighlightSheet";
import type { NoteThreadView } from "@/lib/social-types";

export type ReaderBlock = {
  id: string;
  index: number;
  type: string;
  text: string;
  segments: Segment[];
  maxCount: number;
  mine: { id: string; start: number; end: number }[];
};

type ViewMode = "everyone" | "mine";

type Pending = {
  blockId: string;
  start: number;
  end: number;
  text: string;
  top: number;
  left: number;
};

type ActiveMark = { id: string; text: string; blockId: string; start: number; end: number };

export function Annotator({
  blocks,
  isLoggedIn,
  article,
  noteThreads,
}: {
  blocks: ReaderBlock[];
  isLoggedIn: boolean;
  article: { id: string; title: string; publisherName: string };
  noteThreads: NoteThreadView[];
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewMode>("everyone");
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeMark, setActiveMark] = useState<ActiveMark | null>(null);

  const notesFor = (blockId: string, start: number, end: number) =>
    noteThreads.find(
      (t) => t.blockId === blockId && t.start === start && t.end === end,
    )?.notes ?? [];

  const blockText = useCallback(
    (blockId: string) => blocks.find((b) => b.id === blockId)?.text ?? "",
    [blocks],
  );

  // Capture selection -> snapped preview + a floating "Altını Çiz" button.
  const onSelect = useCallback(() => {
    if (!rootRef.current) return;
    const result = readSelection(rootRef.current);
    if (!result) {
      setPending(null);
      return;
    }
    const text = blockText(result.blockId);
    const snapped = snapToWords(text, result.raw);
    if (snapped.start >= snapped.end) {
      setPending(null);
      return;
    }
    const rect = window.getSelection()?.getRangeAt(0).getBoundingClientRect();
    if (!rect) return;
    setPending({
      blockId: result.blockId,
      start: snapped.start,
      end: snapped.end,
      text: text.slice(snapped.start, snapped.end),
      top: rect.top - 44,
      left: rect.left + rect.width / 2,
    });
  }, [blockText]);

  useEffect(() => {
    document.addEventListener("selectionchange", onSelect);
    return () => document.removeEventListener("selectionchange", onSelect);
  }, [onSelect]);

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    const res = await createHighlight({
      blockId: pending.blockId,
      start: pending.start,
      end: pending.end,
    });
    setBusy(false);
    setPending(null);
    window.getSelection()?.removeAllRanges();
    if (res.ok) {
      setView("mine");
      router.refresh();
    }
  };

  const removeMark = async (id: string) => {
    await deleteHighlight(id);
    setActiveMark(null);
    router.refresh();
  };

  return (
    <div>
      {/* View toggle */}
      <div className="mb-6 inline-flex rounded-full border border-white/15 p-1 font-label text-xs uppercase tracking-[0.12em]">
        <button
          onClick={() => setView("everyone")}
          className={`rounded-full px-4 py-1.5 transition-colors ${
            view === "everyone" ? "bg-red text-cream" : "text-cream-dim hover:text-cream"
          }`}
        >
          Herkes
        </button>
        <button
          onClick={() => setView("mine")}
          className={`rounded-full px-4 py-1.5 transition-colors ${
            view === "mine" ? "bg-red text-cream" : "text-cream-dim hover:text-cream"
          }`}
        >
          Senin
        </button>
      </div>

      <div ref={rootRef} className="reader-prose font-body text-xl leading-relaxed text-cream/95">
        {blocks.map((b) => (
          <p key={b.id} data-block-id={b.id} className="select-text">
            {view === "everyone"
              ? renderHeatmap(b)
              : renderMine(b, (m) =>
                  setActiveMark({
                    id: m.id,
                    text: b.text.slice(m.start, m.end),
                    blockId: b.id,
                    start: m.start,
                    end: m.end,
                  }),
                )}
          </p>
        ))}
      </div>

      {/* Floating action on selection */}
      {pending && (
        <div
          className="fixed z-50 -translate-x-1/2"
          style={{ top: pending.top, left: pending.left }}
        >
          {isLoggedIn ? (
            <button
              onClick={confirm}
              disabled={busy}
              className="rounded-full bg-red px-4 py-2 font-label text-xs uppercase tracking-[0.12em] text-cream shadow-lg hover:bg-red-dark disabled:opacity-60"
            >
              {busy ? "..." : "Altını Çiz"}
            </button>
          ) : (
            <Link
              href="/giris"
              className="rounded-full bg-ink-card px-4 py-2 font-label text-xs uppercase tracking-[0.12em] text-cream shadow-lg ring-1 ring-white/20"
            >
              Çizmek için giriş yap
            </Link>
          )}
        </div>
      )}

      {activeMark && (
        <HighlightSheet
          highlightId={activeMark.id}
          text={activeMark.text}
          article={{ title: article.title, publisherName: article.publisherName }}
          span={{
            blockId: activeMark.blockId,
            articleId: article.id,
            start: activeMark.start,
            end: activeMark.end,
            text: activeMark.text,
          }}
          notes={notesFor(activeMark.blockId, activeMark.start, activeMark.end)}
          canPost={isLoggedIn}
          onClose={() => setActiveMark(null)}
          onDelete={() => removeMark(activeMark.id)}
        />
      )}
    </div>
  );
}

function renderHeatmap(b: ReaderBlock) {
  return b.segments.map((seg, i) => {
    const band = intensityBand(seg.count, b.maxCount);
    const slice = b.text.slice(seg.start, seg.end);
    if (band === 0) return <span key={i}>{slice}</span>;
    return (
      <span
        key={i}
        className={`hl-band-${band} rounded-[2px]`}
        title={`${seg.count} kişi altını çizdi`}
      >
        {slice}
      </span>
    );
  });
}

function renderMine(
  b: ReaderBlock,
  onClick: (m: { id: string; start: number; end: number }) => void,
) {
  const tiles = tileWithRanges(b.text.length, b.mine);
  return tiles.map((t, i) => {
    const slice = b.text.slice(t.start, t.end);
    if (!t.mark) return <span key={i}>{slice}</span>;
    const mark = t.mark;
    return (
      <span key={i} className="hl-mine rounded-[2px]" onClick={() => onClick(mark)}>
        {slice}
      </span>
    );
  });
}

function tileWithRanges(
  len: number,
  ranges: { id: string; start: number; end: number }[],
) {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const out: { start: number; end: number; mark: { id: string; start: number; end: number } | null }[] = [];
  let cursor = 0;
  for (const r of sorted) {
    const s = Math.max(r.start, cursor);
    if (s > cursor) out.push({ start: cursor, end: s, mark: null });
    if (r.end > cursor) {
      out.push({ start: s, end: r.end, mark: r });
      cursor = r.end;
    }
  }
  if (cursor < len) out.push({ start: cursor, end: len, mark: null });
  return out;
}
