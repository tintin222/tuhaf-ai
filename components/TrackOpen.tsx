"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/track";

/** Records a single "open" event when an article reader mounts. */
export function TrackOpen({ articleId }: { articleId: string }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track("open", { articleId });
  }, [articleId]);
  return null;
}
