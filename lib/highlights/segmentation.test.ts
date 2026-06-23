import { describe, it, expect } from "vitest";
import { segmentBlock, intensityBand, type Range } from "./segmentation";

function assertTiles(segments: { start: number; end: number }[], len: number) {
  expect(segments[0]!.start).toBe(0);
  expect(segments[segments.length - 1]!.end).toBe(len);
  for (let i = 1; i < segments.length; i++) {
    expect(segments[i]!.start).toBe(segments[i - 1]!.end); // no gaps/overlaps
  }
}

describe("segmentBlock", () => {
  it("returns a single empty segment when there are no highlights", () => {
    expect(segmentBlock(10, [])).toEqual([{ start: 0, end: 10, count: 0 }]);
  });

  it("tiles the block exactly with correct counts", () => {
    const ranges: Range[] = [
      { start: 2, end: 6, userId: "a" },
      { start: 4, end: 8, userId: "b" },
    ];
    const segs = segmentBlock(10, ranges);
    assertTiles(segs, 10);
    // 0-2: 0, 2-4: 1, 4-6: 2, 6-8: 1, 8-10: 0
    expect(segs).toEqual([
      { start: 0, end: 2, count: 0 },
      { start: 2, end: 4, count: 1 },
      { start: 4, end: 6, count: 2 },
      { start: 6, end: 8, count: 1 },
      { start: 8, end: 10, count: 0 },
    ]);
  });

  it("dedupes identical spans from the same user", () => {
    const ranges: Range[] = [
      { start: 0, end: 5, userId: "a" },
      { start: 0, end: 5, userId: "a" },
      { start: 0, end: 5, userId: "b" },
    ];
    const segs = segmentBlock(5, ranges);
    expect(segs).toEqual([{ start: 0, end: 5, count: 2 }]);
  });

  it("merges adjacent equal-count segments", () => {
    const ranges: Range[] = [
      { start: 0, end: 3, userId: "a" },
      { start: 3, end: 6, userId: "b" },
    ];
    const segs = segmentBlock(6, ranges);
    // both halves have count 1 and are adjacent -> merged into one
    expect(segs).toEqual([{ start: 0, end: 6, count: 1 }]);
  });
});

describe("intensityBand", () => {
  it("maps 0 to band 0", () => {
    expect(intensityBand(0, 5)).toBe(0);
  });
  it("maps the max count to band 4", () => {
    expect(intensityBand(5, 5)).toBe(4);
  });
  it("keeps any positive count at band >= 1", () => {
    expect(intensityBand(1, 100)).toBe(1);
  });
});
