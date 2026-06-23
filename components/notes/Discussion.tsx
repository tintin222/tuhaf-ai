import { NoteThread } from "@/components/notes/NoteThread";
import type { NoteThreadView } from "@/lib/social-types";

/** The "Tartışma" section under an article: every note thread, anchored to the
 * sentence it discusses. New threads are started from the reader (underline →
 * sheet); here readers read and reply. */
export function Discussion({
  threads,
  canPost,
}: {
  threads: NoteThreadView[];
  canPost: boolean;
}) {
  if (threads.length === 0) return null;

  return (
    <section className="mt-14 border-t border-white/10 pt-10">
      <h2 className="font-label text-xs uppercase tracking-[0.18em] text-cream-dim">
        Tartışma · {threads.length} cümle
      </h2>
      <div className="mt-6 space-y-9">
        {threads.map((t) => (
          <div key={`${t.blockId}:${t.start}:${t.end}`}>
            <blockquote className="border-l-2 border-red pl-4 font-display text-lg italic leading-snug text-cream">
              “{t.text}”
            </blockquote>
            <div className="mt-3">
              <NoteThread
                span={{
                  blockId: t.blockId,
                  articleId: t.articleId,
                  start: t.start,
                  end: t.end,
                  text: t.text,
                }}
                initialNotes={t.notes}
                canPost={canPost}
                showRootComposer={false}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
