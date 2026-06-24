"use client";

import { useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/format";
import { track } from "@/lib/track";

/** Sticky "Dinle" player. Functional against an <audio> element; when no
 * audioUrl is seeded it shows a "yakında" (coming soon) state. */
export function AudioPlayer({
  audioUrl,
  listenSeconds,
  title,
  articleId,
}: {
  audioUrl: string | null;
  listenSeconds: number;
  title: string;
  articleId?: string;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const listened = useRef(false);
  const duration = listenSeconds;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTime = () => setT(el.currentTime);
    const onEnd = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play()
        .then(() => {
          setPlaying(true);
          if (!listened.current) {
            listened.current = true; // count one listen per page view
            track("listen", { articleId });
          }
        })
        .catch(() => setPlaying(false));
    }
  };

  const disabled = !audioUrl;
  const pct = duration ? Math.min((t / duration) * 100, 100) : 0;

  return (
    <div className="sticky bottom-0 z-30 border-t border-white/10 bg-ink/95 backdrop-blur">
      <div className="mx-auto flex max-w-reader items-center gap-4 px-5 py-3">
        {audioUrl && <audio ref={ref} src={audioUrl} preload="none" />}
        <button
          onClick={toggle}
          disabled={disabled}
          aria-label={playing ? "Duraklat" : "Dinle"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red text-cream disabled:opacity-40"
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-label text-[11px] uppercase tracking-[0.14em] text-cream-dim">
            {disabled ? "Sesli anlatım yakında" : `Dinle · ${title}`}
          </p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-red" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span className="font-label text-[11px] tabular-nums text-cream-faint">
          {formatDuration(Math.floor(t))} / {formatDuration(duration)}
        </span>
      </div>
    </div>
  );
}
