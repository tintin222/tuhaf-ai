/**
 * Deterministic, network-free avatars. A seed string -> a stable gradient +
 * initials SVG (data URI). Real photos can later be dropped into /public and
 * referenced instead.
 */

const PALETTE = [
  ["#D9291C", "#7A140D"],
  ["#1C4FD9", "#0E2A7A"],
  ["#1C9D5B", "#0E4F2E"],
  ["#B8862A", "#6E4F12"],
  ["#7A2AD9", "#3E0E7A"],
  ["#2A2A2A", "#0A0A0A"],
  ["#0F6F73", "#073A3C"],
  ["#C24A8A", "#6E1F4C"],
];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toLocaleUpperCase("tr");
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toLocaleUpperCase("tr");
}

export function avatarDataUri(seed: string, name: string): string {
  const h = hash(seed);
  const [from, to] = PALETTE[h % PALETTE.length]!;
  const text = initials(name);
  const id = `g${h % 9999}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
  </linearGradient></defs>
  <rect width="120" height="120" fill="url(#${id})"/>
  <text x="60" y="60" dy="0.35em" text-anchor="middle" font-family="Georgia, serif" font-size="46" fill="#F4EDE2">${text}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
