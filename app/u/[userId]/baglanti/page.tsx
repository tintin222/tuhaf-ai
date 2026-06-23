import { notFound } from "next/navigation";
import Link from "next/link";
import { UserRow } from "@/components/UserRow";
import { getConnections, getReaderProfile } from "@/lib/db/queries";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { userId } = await params;
  const { t } = await searchParams;
  const kind = t === "takip" ? "following" : "followers";

  const [viewer, profile] = await Promise.all([
    getCurrentUser(),
    getReaderProfile(userId),
  ]);
  if (!profile) notFound();

  const people = await getConnections(userId, kind, viewer?.id);

  const tab = (key: "takipci" | "takip", label: string, active: boolean) => (
    <Link
      href={`/u/${userId}/baglanti?t=${key}`}
      className={`rounded-full px-4 py-1.5 font-label text-xs uppercase tracking-[0.12em] ${
        active ? "bg-red text-cream" : "text-cream-dim hover:text-cream"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <Link
        href={`/u/${userId}`}
        className="font-label text-[11px] uppercase tracking-[0.15em] text-cream-faint hover:text-red"
      >
        ← {profile.displayName}
      </Link>

      <div className="mt-4 inline-flex rounded-full border border-white/15 p-1">
        {tab("takipci", `${profile._count.followers} Takipçi`, kind === "followers")}
        {tab("takip", `${profile._count.following} Takip`, kind === "following")}
      </div>

      {people.length === 0 ? (
        <p className="mt-10 font-body text-lg italic text-cream-dim">
          {kind === "followers" ? "Henüz takipçi yok." : "Henüz kimseyi takip etmiyor."}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {people.map((p) => (
            <li key={p.id}>
              <UserRow
                id={p.id}
                displayName={p.displayName}
                avatarSeed={p.avatarSeed}
                viewerFollows={p.viewerFollows}
                isSelf={p.isSelf}
                showFollow={!!viewer}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
