"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { TuhafLogo } from "@/components/TuhafLogo";
import { Avatar } from "@/components/Avatar";
import { markNotificationsRead } from "@/lib/actions/social";
import { logoutAction } from "@/lib/actions/auth";

type NavUser = { id: string; displayName: string; avatarSeed: string } | null;
type Notif = { id: string; body: string; read: boolean; link?: string | null };

const TABS = [
  { href: "/", label: "Listen" },
  { href: "/akis", label: "Akış" },
  { href: "/alti-cizdiklerin", label: "Altını Çizdiklerin" },
  { href: "/gunlugun", label: "Günlüğün" },
];

export function TopNav({
  user,
  unread,
  notifications,
}: {
  user: NavUser;
  unread: number;
  notifications: Notif[];
}) {
  const pathname = usePathname();
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const openBell = async () => {
    const next = !bellOpen;
    setBellOpen(next);
    if (next && unread > 0) await markNotificationsRead();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-shell items-center gap-6 px-5">
        <TuhafLogo />

        <nav className="hidden items-center gap-6 md:flex">
          {TABS.map((t) => {
            const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`font-label text-xs uppercase tracking-[0.18em] transition-colors ${
                  active ? "text-cream" : "text-cream-dim hover:text-cream"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link href="/ara" aria-label="Ara" className="rounded-full p-2 text-cream-dim hover:bg-white/5 hover:text-cream">
            <SearchIcon />
          </Link>

          {user && (
            <div className="relative">
              <button
                onClick={openBell}
                aria-label="Bildirimler"
                className="relative rounded-full p-2 text-cream-dim hover:bg-white/5 hover:text-cream"
              >
                <BellIcon />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 text-[10px] font-600 text-cream">
                    {unread}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-white/10 bg-ink-card shadow-2xl">
                  <div className="border-b border-white/10 px-4 py-3 font-label text-xs uppercase tracking-[0.18em] text-cream-dim">
                    Bildirimler
                  </div>
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-cream-faint">Henüz bildirim yok.</p>
                  ) : (
                    <ul className="max-h-96 overflow-auto">
                      {notifications.map((n) =>
                        n.link ? (
                          <li key={n.id} className="border-b border-white/5">
                            <Link
                              href={n.link}
                              onClick={() => setBellOpen(false)}
                              className={`block px-4 py-3 text-sm hover:bg-white/5 ${
                                n.read ? "text-cream/90" : "text-cream"
                              }`}
                            >
                              {n.body}
                            </Link>
                          </li>
                        ) : (
                          <li
                            key={n.id}
                            className={`border-b border-white/5 px-4 py-3 text-sm ${
                              n.read ? "text-cream/90" : "text-cream"
                            }`}
                          >
                            {n.body}
                          </li>
                        ),
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {user ? (
            <div className="relative">
              <button onClick={() => setMenuOpen((o) => !o)} aria-label="Profil" className="ml-1 rounded-full">
                <Avatar seed={user.avatarSeed} name={user.displayName} size={32} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-ink-card shadow-2xl">
                  <Link href={`/u/${user.id}`} className="block px-4 py-3 text-sm text-cream hover:bg-white/5">
                    Profilin
                  </Link>
                  <form action={logoutAction}>
                    <button className="block w-full px-4 py-3 text-left text-sm text-cream-dim hover:bg-white/5">
                      Çıkış yap
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/giris"
              className="ml-1 rounded-full bg-red px-4 py-2 font-label text-xs uppercase tracking-[0.15em] text-cream hover:bg-red-dark"
            >
              Giriş
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" />
    </svg>
  );
}
