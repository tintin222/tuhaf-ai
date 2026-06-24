import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Gate } from "@/components/Gate";
import { HighlightCard } from "@/components/HighlightCard";
import { getCurrentUser } from "@/lib/auth/session";
import { getActivityFeed } from "@/lib/db/queries";
import { timeAgo } from "@/lib/format";
import type { FeedItem } from "@/lib/social-types";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Gate
        title="Akışın burada."
        body="Takip ettiklerinin altını çizdiklerini, notlarını ve yeni bağlantılarını burada gör."
      />
    );
  }

  const items = await getActivityFeed(user.id, 60);

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <p className="font-label text-xs uppercase tracking-[0.18em] text-cream-dim">Akış</p>
      <h1 className="mt-2 font-display text-4xl font-900 italic text-cream">
        Takip ettiklerin
      </h1>

      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-white/10 p-8 text-center">
          <p className="font-body text-lg italic text-cream-dim">
            Akışın henüz boş. Birini takip et ya da{" "}
            <Link href="/kesfet" className="text-red hover:underline">
              senin gibi okuyanları keşfet
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-5">
          {items.map((item) => (
            <li key={item.id}>
              <FeedRow item={item} canReact />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FeedRow({ item, canReact }: { item: FeedItem; canReact: boolean }) {
  if (item.kind === "follow") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/10 px-5 py-4">
        <Avatar seed={item.actor.avatarSeed} name={item.actor.displayName} image={item.actor.image} size={32} />
        <p className="font-body text-sm text-cream/90">
          <Link href={`/u/${item.actor.id}`} className="italic text-cream hover:text-red">
            {item.actor.displayName}
          </Link>{" "}
          <span className="text-cream-dim">artık</span>{" "}
          <Link href={`/u/${item.target.id}`} className="italic text-cream hover:text-red">
            {item.target.displayName}
          </Link>{" "}
          <span className="text-cream-dim">kişisini takip ediyor.</span>
        </p>
        <span className="ml-auto font-label text-[10px] uppercase tracking-[0.1em] text-cream-faint">
          {timeAgo(item.createdAt)}
        </span>
      </div>
    );
  }

  const href = `/oku/${item.article.publisherSlug}/${item.article.slug}`;

  if (item.kind === "note") {
    return (
      <div className="rounded-xl border border-white/10 p-5">
        <Header actorId={item.actor.id} name={item.actor.displayName} seed={item.actor.avatarSeed} image={item.actor.image} verb="not bıraktı" createdAt={item.createdAt} />
        <blockquote className="mt-3 border-l-2 border-red/60 pl-3 font-display text-base italic text-cream-dim">
          “{item.text}”
        </blockquote>
        <p className="mt-3 font-body text-[15px] leading-relaxed text-cream/90">{item.body}</p>
        <Link
          href={href}
          className="mt-3 inline-block font-label text-[10px] uppercase tracking-[0.14em] text-cream-faint hover:text-red"
        >
          {item.article.title} · {item.article.publisherName}
        </Link>
      </div>
    );
  }

  // highlight
  return (
    <div>
      <div className="mb-2">
        <Header actorId={item.actor.id} name={item.actor.displayName} seed={item.actor.avatarSeed} image={item.actor.image} verb="altını çizdi" createdAt={item.createdAt} />
      </div>
      <HighlightCard
        highlightId={item.highlightId}
        text={item.text}
        href={href}
        articleTitle={item.article.title}
        publisherName={item.article.publisherName}
        reactions={item.reactions}
        canReact={canReact}
      />
    </div>
  );
}

function Header({
  actorId,
  name,
  seed,
  image,
  verb,
  createdAt,
}: {
  actorId: string;
  name: string;
  seed: string;
  image?: string | null;
  verb: string;
  createdAt: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar seed={seed} name={name} image={image} size={28} />
      <p className="font-body text-sm text-cream/90">
        <Link href={`/u/${actorId}`} className="italic text-cream hover:text-red">
          {name}
        </Link>{" "}
        <span className="text-cream-dim">bir cümlenin {verb}.</span>
      </p>
      <span className="ml-auto font-label text-[10px] uppercase tracking-[0.1em] text-cream-faint">
        {timeAgo(createdAt)}
      </span>
    </div>
  );
}
