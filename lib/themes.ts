/**
 * Color themes shared by article posters and the shareable quote cards
 * ("RENK TEMASI" swatches in the composer).
 */

export type ThemeKey =
  | "crimson"
  | "midnight"
  | "forest"
  | "amber"
  | "violet"
  | "graphite"
  | "ink"
  | "sand";

export type Theme = {
  key: ThemeKey;
  label: string;
  bgFrom: string;
  bgTo: string;
  text: string;
  accent: string;
};

export const THEMES: Record<ThemeKey, Theme> = {
  crimson: { key: "crimson", label: "Kızıl", bgFrom: "#2A0A07", bgTo: "#0E0403", text: "#F4EDE2", accent: "#D9291C" },
  midnight: { key: "midnight", label: "Gece", bgFrom: "#0A1330", bgTo: "#04070F", text: "#E8EDF7", accent: "#3F6FE0" },
  forest: { key: "forest", label: "Orman", bgFrom: "#0A2417", bgTo: "#040D08", text: "#E6F1EA", accent: "#3FB57A" },
  amber: { key: "amber", label: "Kehribar", bgFrom: "#2A1C05", bgTo: "#0E0903", text: "#F6EEDD", accent: "#D69A2A" },
  violet: { key: "violet", label: "Mor", bgFrom: "#1C0A30", bgTo: "#0A0410", text: "#EFE7F7", accent: "#9B5FE0" },
  graphite: { key: "graphite", label: "Grafit", bgFrom: "#1F1F1F", bgTo: "#080808", text: "#ECECEC", accent: "#9A9A9A" },
  ink: { key: "ink", label: "Mürekkep", bgFrom: "#101010", bgTo: "#000000", text: "#F4EDE2", accent: "#D9291C" },
  sand: { key: "sand", label: "Kum", bgFrom: "#2A2418", bgTo: "#0E0C07", text: "#F4EDE2", accent: "#C9A24A" },
};

export const THEME_LIST: Theme[] = Object.values(THEMES);

export function getTheme(key: string | null | undefined): Theme {
  return THEMES[(key as ThemeKey) ?? "crimson"] ?? THEMES.crimson;
}
