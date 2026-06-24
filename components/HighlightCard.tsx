import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { ReactionButton } from "@/components/ReactionButton";
import type { ActorLite, ReactionInfo } from "@/lib/social-types";

/** A single underline rendered as a card: the quote, its article, an optional
 * author chip, and a "ben de" reaction. Reused on profiles and the feed. */
export function HighlightCard({
  highlightId,
  text,
  href,
  articleTitle,
  publisherName,
  author,
  reactions,
  canReact,
}: {
  highlightId: string;
  text: string;
  href: string;
  articleTitle: string;
  publisherName: string;
  author?: ActorLite;
  reactions: ReactionInfo;
  canReact: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 p-5">
      {author && (
        <div className="mb-3 flex items-center gap-2">
          <Avatar seed={author.avatarSeed} name={author.displayName} image={author.image} size={24} />
          <Link
            href={`/u/${author.id}`}
            className="font-body text-sm italic text-cream hover:text-red"
          >
            {author.displayName}
          </Link>
        </div>
      )}

      <p className="font-display text-xl italic leading-snug text-cream">“{text}”</p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link
          href={href}
          className="font-label text-[10px] uppercase tracking-[0.14em] text-cream-faint hover:text-red"
        >
          {articleTitle} · {publisherName}
        </Link>
        <span className="ml-auto">
          <ReactionButton
            highlightId={highlightId}
            initialCount={reactions.count}
            initialReacted={reactions.reacted}
            canReact={canReact}
          />
        </span>
      </div>
    </div>
  );
}
