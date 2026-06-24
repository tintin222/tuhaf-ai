/** Shared profile constants + helpers (interests, gender labels). */

export const INTERESTS = [
  "Gastronomi",
  "Psikoloji",
  "Nörobilim",
  "Günlük Yaşam",
  "Edebiyat",
  "Sinema",
  "Felsefe",
  "Sanat",
  "Bilim",
  "Tarih",
] as const;

export const GENDERS = [
  { value: "kadin", label: "Kadın" },
  { value: "erkek", label: "Erkek" },
  { value: "diger", label: "Diğer" },
  { value: "belirtmek-istemiyorum", label: "Belirtmek istemiyorum" },
] as const;

export function parseInterests(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function genderLabel(value?: string | null): string | null {
  return GENDERS.find((g) => g.value === value)?.label ?? null;
}
