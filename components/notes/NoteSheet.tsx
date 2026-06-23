"use client";

import { NoteThread } from "@/components/notes/NoteThread";
import type { NoteSpan, NoteView } from "@/lib/social-types";

/** Bottom sheet opened from an inline note marker in the reader: the quoted
 * sentence and its full discussion thread. */
export function NoteSheet({
  span,
  notes,
  canPost,
  onClose,
}: {
  span: NoteSpan;
  notes: NoteView[];
  canPost: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-card p-6 pb-10 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-white/20" />
        <p className="font-label text-xs uppercase tracking-[0.18em] text-cream-dim">
          Bu cümle üzerine
        </p>
        <blockquote className="mt-4 border-l-2 border-red pl-4 font-display text-xl italic leading-snug text-cream">
          “{span.text}”
        </blockquote>
        <div className="mt-6">
          <NoteThread span={span} initialNotes={notes} canPost={canPost} showRootComposer />
        </div>
      </div>
    </div>
  );
}
