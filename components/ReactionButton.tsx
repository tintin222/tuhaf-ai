"use client";

import { useState, useTransition } from "react";
import { toggleReaction } from "@/lib/actions/reactions";

export function ReactionButton({
  highlightId,
  initialCount,
  initialReacted,
  canReact,
}: {
  highlightId: string;
  initialCount: number;
  initialReacted: boolean;
  canReact: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [reacted, setReacted] = useState(initialReacted);
  const [pending, start] = useTransition();

  const onClick = () => {
    if (!canReact) return;
    const next = !reacted;
    // Optimistic update.
    setReacted(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    start(async () => {
      const res = await toggleReaction(highlightId);
      setReacted(res.reacted);
      setCount(res.count);
    });
  };

  return (
    <button
      onClick={onClick}
      disabled={!canReact || pending}
      aria-pressed={reacted}
      title={canReact ? '"ben de"' : "Tepki vermek için giriş yap"}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-label text-[11px] uppercase tracking-[0.1em] transition-colors disabled:cursor-default ${
        reacted
          ? "border-red bg-red/10 text-red"
          : "border-white/15 text-cream-dim hover:border-red hover:text-red"
      } ${!canReact ? "opacity-70" : ""}`}
    >
      <HeartIcon filled={reacted} />
      <span>
        {count > 0 ? count : ""} ben de
      </span>
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
