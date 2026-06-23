/**
 * Heatmap segmentation: turn many overlapping highlight ranges in one block
 * into ordered, non-overlapping segments tagged with how many DISTINCT users
 * cover each one. Segments tile [0, blockLen) exactly (including count==0
 * stretches), so they can be re-emitted as contiguous spans with no gaps.
 */

export type Range = { start: number; end: number; userId: string };

export type Segment = {
  start: number;
  end: number; // exclusive
  count: number; // distinct users covering this segment
};

/**
 * Boundary-sweep algorithm.
 *
 * 1. Dedupe identical spans per user (one user can't inflate a span).
 * 2. Collect boundary points {0, len} ∪ {start, end}.
 * 3. Between consecutive boundaries, count ranges fully covering the gap.
 * 4. Merge adjacent equal-count segments to reduce DOM nodes.
 *
 * O(R log R) sort + O(B·R) counting; fine for per-block counts.
 */
export function segmentBlock(blockLen: number, ranges: Range[]): Segment[] {
  if (blockLen <= 0) return [];
  if (ranges.length === 0) {
    return [{ start: 0, end: blockLen, count: 0 }];
  }

  // 1. Dedupe per user per identical span.
  const seen = new Set<string>();
  const deduped: { start: number; end: number }[] = [];
  for (const r of ranges) {
    const s = Math.max(0, Math.min(r.start, blockLen));
    const e = Math.max(0, Math.min(r.end, blockLen));
    if (s >= e) continue;
    const key = `${r.userId}:${s}:${e}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({ start: s, end: e });
  }
  if (deduped.length === 0) {
    return [{ start: 0, end: blockLen, count: 0 }];
  }

  // 2. Boundary points.
  const points = new Set<number>([0, blockLen]);
  for (const r of deduped) {
    points.add(r.start);
    points.add(r.end);
  }
  const sorted = [...points].sort((a, b) => a - b);

  // 3. Build segments between consecutive boundaries.
  const segments: Segment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const s = sorted[i]!;
    const e = sorted[i + 1]!;
    if (s === e) continue;
    let count = 0;
    for (const r of deduped) {
      if (r.start <= s && r.end >= e) count++;
    }
    segments.push({ start: s, end: e, count });
  }

  // 4. Merge adjacent equal-count segments.
  return mergeAdjacent(segments);
}

function mergeAdjacent(segments: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const seg of segments) {
    const last = out[out.length - 1];
    if (last && last.count === seg.count && last.end === seg.start) {
      last.end = seg.end;
    } else {
      out.push({ ...seg });
    }
  }
  return out;
}

/**
 * Map a segment's distinct-user count to a discrete intensity band 0..4.
 * Discrete bands read better editorially than a continuous gradient.
 */
export function intensityBand(count: number, maxCount: number): number {
  if (count <= 0 || maxCount <= 0) return 0;
  const ratio = Math.min(count / maxCount, 1);
  // 4 visible bands (1..4) above the un-highlighted band (0).
  return Math.max(1, Math.ceil(ratio * 4));
}
