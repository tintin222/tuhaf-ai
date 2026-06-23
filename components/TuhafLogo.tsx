import Link from "next/link";

/** The "A" variant wordmark: red "Tuhaf" + italic cream "Club". */
export function TuhafLogo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-baseline gap-2 ${className}`}>
      <span className="font-label text-2xl font-600 lowercase tracking-tight text-red">
        tuhaf
      </span>
      <span className="font-display text-xl italic text-cream">Club</span>
    </Link>
  );
}

/** The red "т" badge stamped on article cards. */
export function TuhafBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`flex h-6 w-6 items-center justify-center rounded-full bg-red font-display text-sm italic text-cream shadow ${className}`}
      aria-hidden
    >
      т
    </span>
  );
}
