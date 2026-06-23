/**
 * The underlining coordinate system.
 *
 * Article block text is canonical, server-owned, and NFC-normalized. A highlight
 * is a pair of UTF-16 code-unit offsets into that text, snapped to word
 * boundaries so that two readers underlining "the same words" produce identical
 * offsets and therefore match.
 *
 * Everything here is pure and runs identically on client (capture) and server
 * (re-validation) because both operate on the same normalized string.
 */

export type Offsets = { start: number; end: number };

/**
 * Canonicalize text once, at ingest/seed time. The result is the coordinate
 * system: render it verbatim (one text node per block) so DOM Range offsets
 * equal stored offsets.
 *
 * - NFC: collapses Turkish forms (ç ş ğ ı İ ö ü) to one code-unit sequence so
 *   offset N means the same thing everywhere.
 * - Whitespace: collapsed to single spaces and trimmed (no newlines/tabs inside
 *   a block).
 */
export function normalizeBlockText(input: string): string {
  return input.normalize("NFC").replace(/\s+/g, " ").trim();
}

// A word character for snapping: Unicode letters, marks, numbers. Never ASCII
// \w, which would exclude Turkish letters.
const WORD_CHAR = /[\p{L}\p{M}\p{N}]/u;

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && WORD_CHAR.test(ch);
}

/**
 * Expand a raw [start, end) selection outward to whole-word boundaries.
 * If the start lands mid-word, move it to the word's start; if the end lands
 * mid-word, move it to the word's end. Then trim leading/trailing whitespace
 * back off so the stored span doesn't include dangling spaces.
 *
 * Works on UTF-16 code units. Surrogate pairs are never split because word
 * boundaries fall between code points, not inside a pair.
 */
export function snapToWords(text: string, raw: Offsets): Offsets {
  const len = text.length;
  let start = Math.max(0, Math.min(raw.start, len));
  let end = Math.max(0, Math.min(raw.end, len));
  if (start > end) [start, end] = [end, start];

  // Expand left while the char before `start` and at `start` are both word chars
  // (i.e. we're inside a word).
  while (start > 0 && isWordChar(text[start - 1]) && isWordChar(text[start])) {
    start--;
  }
  // Expand right while the char at `end` continues the word ending at end-1.
  while (end < len && isWordChar(text[end - 1]) && isWordChar(text[end])) {
    end++;
  }

  // Trim surrounding whitespace/punctuation-only edges back inward.
  while (start < end && !isWordChar(text[start]) && /\s/.test(text[start]!)) {
    start++;
  }
  while (end > start && !isWordChar(text[end - 1]) && /\s/.test(text[end - 1]!)) {
    end--;
  }

  return { start, end };
}

/** A snapped highlight must be non-empty and within bounds. */
export function isValidHighlight(text: string, o: Offsets): boolean {
  return (
    Number.isInteger(o.start) &&
    Number.isInteger(o.end) &&
    o.start >= 0 &&
    o.end <= text.length &&
    o.start < o.end
  );
}

/* ------------------------------------------------------------------ *
 * DOM helpers (browser only). Kept here so capture/restore live with  *
 * the offset math, but guarded so this module stays importable on the *
 * server.                                                             *
 * ------------------------------------------------------------------ */

/**
 * Convert a DOM (node, localOffset) position into a block-global UTF-16 offset
 * by walking the block's text nodes in document order and summing lengths.
 */
export function domPositionToOffset(
  blockEl: Element,
  node: Node,
  localOffset: number,
): number {
  let offset = 0;
  const walker = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT);
  let current: Node | null = walker.nextNode();
  while (current) {
    if (current === node) {
      return offset + localOffset;
    }
    offset += (current as Text).length;
    current = walker.nextNode();
  }
  // Position was on an element boundary, not a text node: count everything
  // before it. Falls back to the full text length.
  return offset;
}

/**
 * Read the current window selection as block-scoped raw offsets, if and only if
 * the whole selection lies inside a single [data-block-id] element.
 * Returns null for collapsed or cross-block selections.
 */
export function readSelection(root: HTMLElement): {
  blockId: string;
  raw: Offsets;
} | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  const anchorBlock = closestBlock(range.startContainer, root);
  const focusBlock = closestBlock(range.endContainer, root);
  if (!anchorBlock || anchorBlock !== focusBlock) return null;

  const blockId = anchorBlock.getAttribute("data-block-id");
  if (!blockId) return null;

  const start = domPositionToOffset(
    anchorBlock,
    range.startContainer,
    range.startOffset,
  );
  const end = domPositionToOffset(
    anchorBlock,
    range.endContainer,
    range.endOffset,
  );

  return { blockId, raw: { start, end } };
}

function closestBlock(node: Node, root: HTMLElement): Element | null {
  let el: Node | null = node;
  while (el && el !== root) {
    if (el.nodeType === Node.ELEMENT_NODE) {
      const e = el as Element;
      if (e.hasAttribute("data-block-id")) return e;
    }
    el = el.parentNode;
  }
  return null;
}
