export type TrackType = "open" | "listen" | "click";

/** Fire-and-forget analytics ping. Uses sendBeacon when available so it
 * survives navigation; never throws. */
export function track(type: TrackType, opts: { articleId?: string; label?: string } = {}) {
  try {
    const body = JSON.stringify({ type, articleId: opts.articleId, label: opts.label });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/track", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      });
    }
  } catch {
    /* analytics must never break the app */
  }
}
