import { describe, it, expect } from "vitest";
import {
  normalizeBlockText,
  snapToWords,
  isValidHighlight,
} from "./offsets";

describe("normalizeBlockText", () => {
  it("collapses whitespace and trims", () => {
    expect(normalizeBlockText("  bir   iki\n\tüç  ")).toBe("bir iki üç");
  });

  it("NFC-normalizes Turkish so offsets are stable", () => {
    // 's' + combining cedilla -> precomposed 'ş'
    const decomposed = "şehir";
    const out = normalizeBlockText(decomposed);
    expect(out).toBe("şehir");
    expect(out.length).toBe(5); // one code unit per Turkish letter
  });
});

describe("snapToWords", () => {
  const text = normalizeBlockText("Sebebi olmayan acı en büyüktür.");

  it("expands a mid-word selection to whole words", () => {
    // select "ebebi olma" -> should snap to "Sebebi olmayan"
    const start = text.indexOf("ebebi");
    const end = text.indexOf("olma") + "olma".length;
    const snapped = snapToWords(text, { start, end });
    expect(text.slice(snapped.start, snapped.end)).toBe("Sebebi olmayan");
  });

  it("two readers grabbing different sub-spans land on the same words", () => {
    const a = snapToWords(text, { start: 0, end: 4 }); // "Seb"
    const b = snapToWords(text, { start: 2, end: 6 }); // "bebi"
    expect(text.slice(a.start, a.end)).toBe("Sebebi");
    expect(text.slice(b.start, b.end)).toBe("Sebebi");
    expect(a).toEqual(b);
  });

  it("trims surrounding whitespace", () => {
    const start = text.indexOf("olmayan") - 1; // the space
    const snapped = snapToWords(text, { start, end: text.indexOf("olmayan") + 7 });
    expect(text.slice(snapped.start, snapped.end)).toBe("olmayan");
  });

  it("clamps out-of-range input to the block bounds", () => {
    const snapped = snapToWords(text, { start: -5, end: 9999 });
    expect(snapped.start).toBe(0);
    expect(snapped.end).toBe(text.length); // only whitespace is trimmed, not "."
  });
});

describe("isValidHighlight", () => {
  const text = "merhaba dünya";
  it("accepts a non-empty in-bounds span", () => {
    expect(isValidHighlight(text, { start: 0, end: 7 })).toBe(true);
  });
  it("rejects empty or out-of-bounds spans", () => {
    expect(isValidHighlight(text, { start: 3, end: 3 })).toBe(false);
    expect(isValidHighlight(text, { start: 5, end: 999 })).toBe(false);
  });
});
