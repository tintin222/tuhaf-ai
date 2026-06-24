import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";

/** A person in a list (followers / following / discovery) with a follow button. */
export function UserRow({
  id,
  displayName,
  avatarSeed,
  image,
  viewerFollows,
  showFollow,
  isSelf,
  meta,
}: {
  id: string;
  displayName: string;
  avatarSeed: string;
  image?: string | null;
  viewerFollows: boolean;
  showFollow: boolean;
  isSelf: boolean;
  meta?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3">
      <Link href={`/u/${id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar seed={avatarSeed} name={displayName} image={image} size={40} />
        <div className="min-w-0">
          <p className="truncate font-body text-base italic text-cream">{displayName}</p>
          {meta && (
            <p className="font-label text-[10px] uppercase tracking-[0.12em] text-red">{meta}</p>
          )}
        </div>
      </Link>
      {showFollow && !isSelf && (
        <FollowButton targetId={id} initialFollowing={viewerFollows} />
      )}
    </div>
  );
}
