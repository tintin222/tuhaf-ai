/** Turkish date/number formatting helpers. */

const MONTHS = [
  "OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN",
  "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK",
];

const DAYS = [
  "PAZAR", "PAZARTESİ", "SALI", "ÇARŞAMBA", "PERŞEMBE", "CUMA", "CUMARTESİ",
];

export function formatDateLong(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateWithDay(date: Date): string {
  return `${formatDateLong(date)} · ${DAYS[date.getDay()]}`;
}

export function formatCount(n: number): string {
  return n.toLocaleString("tr-TR");
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function relativeDay(date: Date): string {
  const today = new Date();
  const diff = Math.floor(
    (today.setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) /
      86400000,
  );
  if (diff <= 0) return "Bugün";
  if (diff === 1) return "Dün";
  if (diff < 7) return `${diff} gün önce`;
  return formatDateLong(date);
}
