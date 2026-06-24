"use client";

import Link from "next/link";
import { track } from "@/lib/track";

/** A Link that records a "click" event (with a label) before navigating. */
export function TrackedLink({
  href,
  articleId,
  label,
  className,
  style,
  children,
}: {
  href: string;
  articleId?: string;
  label: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      style={style}
      onClick={() => track("click", { articleId, label })}
    >
      {children}
    </Link>
  );
}
