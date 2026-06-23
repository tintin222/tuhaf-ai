import { notFound } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { HighlightCard } from "@/components/HighlightCard";
import {
  getReaderProfile,
  getReactionInfo,
  getSharedHighlights,
  isFollowing,
} from "@/lib/db/queries";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const [viewer, profile] = await Promise.all([
    getCurrentUser(),
    getReaderProfile(userId),
  ]);
  if (!profile) notFound();

  const isSelf = viewer?.id === profile.id;
  const [shared, following, followsViewer, reactionInfo] = await Promise.all([
    viewer && !isSelf ? getSharedHighlights(viewer.id, profile.id) : Promise.resolve([]),
    viewer && !isSelf ? isFollowing(viewer.id, profile.id) : Promise.resolve(false),
    viewer && !isSelf ? isFollowing(profile.id, viewer.id) : Promise.resolve(false),
    getReactionInfo(
      profile.highlights.map((h) => h.id),
      viewer?.id,
    ),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <div className="flex items-center gap-5">
        <Avatar seed={profile.avatarSeed} name={profile.displayName} size={72} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-700 text-cream">{profile.displayName}</h1>
            {followsViewer && (
              <span className="rounded-full border border-white/15 px-2 py-0.5 font-label text-[9px] uppercase tracking-[0.12em] text-cream-faint">
                Seni takip ediyor
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 font-label text-[11px] uppercase tracking-[0.15em] text-cream-faint">
            <span>{profile._count.highlights} altı çizili</span>
            <Link href={`/u/${profile.id}/baglanti?t=takipci`} className="hover:text-red">
              {profile._count.followers} takipçi
            </Link>
            <Link href={`/u/${profile.id}/baglanti?t=takip`} className="hover:text-red">
              {profile._count.following} takip
            </Link>
          </div>
        </div>
        {viewer && !isSelf && (
          <FollowButton targetId={profile.id} initialFollowing={following} />
        )}
      </div>

      {isSelf && (
        <Link
          href="/kesfet"
          className="mt-6 inline-block rounded-full border border-white/15 px-4 py-2 font-label text-[11px] uppercase tracking-[0.14em] text-cream-dim hover:border-red hover:text-red"
        >
          Senin gibi okuyanları keşfet →
        </Link>
      )}

      {shared.length > 0 && (
        <section className="mt-8 rounded-2xl border border-red/30 bg-red/5 p-6">
          <h2 className="font-label text-xs uppercase tracking-[0.18em] text-red">
            İkiniz de altını çizdiniz
          </h2>
          <ul className="mt-4 space-y-3">
            {shared.map((s, i) => (
              <li key={i} className="font-display text-lg italic text-cream">
                <Link href={`/oku/x/${s.slug}`} className="hover:text-red">
                  “{s.text}”
                </Link>
                <span className="ml-2 font-body text-sm not-italic text-cream-faint">
                  — {s.articleTitle}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="mt-10 font-label text-xs uppercase tracking-[0.18em] text-cream-dim">
        {isSelf ? "Senin çizdiklerin" : "Çizdikleri"}
      </h2>
      <ul className="mt-4 space-y-4">
        {profile.highlights.map((h) => (
          <li key={h.id}>
            <HighlightCard
              highlightId={h.id}
              text={h.text}
              href={`/oku/${h.article.publisher.slug}/${h.article.slug}`}
              articleTitle={h.article.title}
              publisherName={h.article.publisher.name}
              reactions={reactionInfo.get(h.id) ?? { count: 0, reacted: false }}
              canReact={!!viewer}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
