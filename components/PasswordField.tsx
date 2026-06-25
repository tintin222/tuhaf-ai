"use client";

export function PasswordField({
  value,
  onChange,
  label,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  hint: string;
}) {
  return (
    <div>
      <label className="mb-2 block font-label text-[11px] uppercase tracking-[0.15em] text-cream-dim">
        {label}
      </label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={8}
        autoComplete="new-password"
        placeholder="••••••••"
        className="w-full rounded-lg border border-white/15 bg-ink px-3 py-2.5 font-body text-base text-cream placeholder:text-cream-faint focus:border-red focus:outline-none"
      />
      <p className="mt-1 font-body text-xs text-cream-faint">{hint}</p>
    </div>
  );
}
