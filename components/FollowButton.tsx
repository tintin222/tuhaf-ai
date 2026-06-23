"use client";

import { useState, useTransition } from "react";
import { toggleFollow } from "@/lib/actions/social";

export function FollowButton({
  targetId,
  initialFollowing,
}: {
  targetId: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, start] = useTransition();

  const onClick = () =>
    start(async () => {
      const res = await toggleFollow(targetId);
      setFollowing(res.following);
    });

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`rounded-full px-6 py-2.5 font-label text-xs uppercase tracking-[0.15em] transition-colors disabled:opacity-60 ${
        following
          ? "border border-white/25 text-cream hover:border-red hover:text-red"
          : "bg-red text-cream hover:bg-red-dark"
      }`}
    >
      {following ? "Takiptesin" : "Takip Et"}
    </button>
  );
}
