"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { addNote } from "@/lib/actions/notes";
import { timeAgo } from "@/lib/format";
import type { NoteSpan, NoteView } from "@/lib/social-types";

/** Discussion thread for one underlined span: notes, replies, and composers. */
export function NoteThread({
  span,
  initialNotes,
  canPost,
  showRootComposer = true,
}: {
  span: NoteSpan;
  initialNotes: NoteView[];
  canPost: boolean;
  showRootComposer?: boolean;
}) {
  const [notes, setNotes] = useState<NoteView[]>(initialNotes);
  const router = useRouter();

  const onAddRoot = (note: NoteView) => setNotes((prev) => [...prev, note]);
  const onAddReply = (parentId: string, reply: NoteView) =>
    setNotes((prev) =>
      prev.map((n) =>
        n.id === parentId ? { ...n, replies: [...n.replies, reply] } : n,
      ),
    );

  return (
    <div className="space-y-4">
      {notes.length === 0 && (
        <p className="font-body text-sm italic text-cream-faint">
          Henüz not yok. İlk düşünceyi sen bırak.
        </p>
      )}

      {notes.map((n) => (
        <NoteItem
          key={n.id}
          note={n}
          span={span}
          canPost={canPost}
          onReply={(reply) => {
            onAddReply(n.id, reply);
            router.refresh();
          }}
        />
      ))}

      {showRootComposer && canPost && (
        <Composer
          placeholder="Bu cümle hakkında bir not bırak…"
          submitLabel="Not Ekle"
          onSubmit={(body) =>
            addNote({
              body,
              blockId: span.blockId,
              articleId: span.articleId,
              start: span.start,
              end: span.end,
            })
          }
          onDone={(note) => {
            onAddRoot(note);
            router.refresh();
          }}
        />
      )}

      {!canPost && (
        <Link
          href="/giris"
          className="inline-block font-label text-[11px] uppercase tracking-[0.12em] text-red hover:underline"
        >
          Not yazmak için giriş yap →
        </Link>
      )}
    </div>
  );
}

function NoteItem({
  note,
  span,
  canPost,
  onReply,
}: {
  note: NoteView;
  span: NoteSpan;
  canPost: boolean;
  onReply: (reply: NoteView) => void;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2">
        <Avatar seed={note.author.avatarSeed} name={note.author.displayName} size={24} />
        <Link
          href={`/u/${note.author.id}`}
          className="font-body text-sm italic text-cream hover:text-red"
        >
          {note.author.displayName}
        </Link>
        <span className="font-label text-[10px] uppercase tracking-[0.1em] text-cream-faint">
          {timeAgo(note.createdAt)}
        </span>
      </div>
      <p className="mt-2 font-body text-[15px] leading-relaxed text-cream/90">{note.body}</p>

      {canPost && (
        <button
          onClick={() => setReplying((v) => !v)}
          className="mt-2 font-label text-[10px] uppercase tracking-[0.12em] text-cream-faint hover:text-red"
        >
          {replying ? "Vazgeç" : "Yanıtla"}
        </button>
      )}

      {(note.replies.length > 0 || replying) && (
        <div className="mt-3 space-y-3 border-l border-white/10 pl-4">
          {note.replies.map((r) => (
            <div key={r.id}>
              <div className="flex items-center gap-2">
                <Avatar seed={r.author.avatarSeed} name={r.author.displayName} size={20} />
                <Link
                  href={`/u/${r.author.id}`}
                  className="font-body text-[13px] italic text-cream hover:text-red"
                >
                  {r.author.displayName}
                </Link>
                <span className="font-label text-[10px] uppercase tracking-[0.1em] text-cream-faint">
                  {timeAgo(r.createdAt)}
                </span>
              </div>
              <p className="mt-1 font-body text-sm leading-relaxed text-cream/85">{r.body}</p>
            </div>
          ))}

          {replying && canPost && (
            <Composer
              placeholder={`${note.author.displayName} kişisine yanıt ver…`}
              submitLabel="Yanıtla"
              compact
              onSubmit={(body) => addNote({ body, parentId: note.id })}
              onDone={(reply) => {
                onReply(reply);
                setReplying(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Composer({
  placeholder,
  submitLabel,
  compact = false,
  onSubmit,
  onDone,
}: {
  placeholder: string;
  submitLabel: string;
  compact?: boolean;
  onSubmit: (body: string) => Promise<{ ok: true; note: NoteView } | { ok: false; error: string }>;
  onDone: (note: NoteView) => void;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setError(null);
    start(async () => {
      const res = await onSubmit(trimmed);
      if (res.ok) {
        setBody("");
        onDone(res.note);
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className={compact ? "" : "mt-1"}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        className="w-full resize-none rounded-lg border border-white/15 bg-ink px-3 py-2 font-body text-sm text-cream placeholder:text-cream-faint focus:border-red focus:outline-none"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={pending || !body.trim()}
          className="rounded-full bg-red px-4 py-1.5 font-label text-[11px] uppercase tracking-[0.12em] text-cream hover:bg-red-dark disabled:opacity-50"
        >
          {pending ? "..." : submitLabel}
        </button>
        {error && <span className="font-body text-xs text-red">{error}</span>}
      </div>
    </div>
  );
}
