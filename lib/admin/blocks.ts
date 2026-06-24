import { normalizeBlockText } from "@/lib/highlights/offsets";

export type ParsedBlock = { type: string; text: string };

/**
 * Parse an admin textarea body into canonical blocks. Paragraphs are separated
 * by blank lines. A line starting with `# ` is a heading; `> ` a blockquote;
 * everything else a paragraph. Text is NFC-normalized (the highlight offset
 * coordinate system depends on it).
 */
export function parseBody(body: string): ParsedBlock[] {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      let type = "paragraph";
      let text = chunk;
      if (chunk.startsWith("# ")) {
        type = "heading";
        text = chunk.slice(2);
      } else if (chunk.startsWith("> ")) {
        type = "blockquote";
        text = chunk.slice(2);
      }
      // collapse internal newlines inside a single block to spaces
      text = text.replace(/\s*\n\s*/g, " ");
      return { type, text: normalizeBlockText(text) };
    })
    .filter((b) => b.text.length > 0);
}

/** Reconstruct an editable textarea body from stored blocks. */
export function blocksToBody(blocks: { type: string; text: string }[]): string {
  return blocks
    .map((b) => {
      if (b.type === "heading") return `# ${b.text}`;
      if (b.type === "blockquote") return `> ${b.text}`;
      return b.text;
    })
    .join("\n\n");
}

export function slugify(input: string): string {
  return input
    .toLocaleLowerCase("tr")
    .replace(/ç/g, "c").replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
