import type { Metadata } from "next";
import { Playfair_Display, EB_Garamond, Oswald } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/TopNav";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadCount, getNotifications } from "@/lib/db/queries";

const display = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  style: ["italic", "normal"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-display",
});
const body = EB_Garamond({
  subsets: ["latin", "latin-ext"],
  style: ["italic", "normal"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});
const label = Oswald({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-label",
});

export const metadata: Metadata = {
  title: "Tuhaf Club — Her güne yeni bir düşünce",
  description:
    "Seçili yazarlardan her sabah bir sayfa. Oku, altını çiz, başkalarının ne çizdiğini gör.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const [unread, notifications] = user
    ? await Promise.all([getUnreadCount(user.id), getNotifications(user.id)])
    : [0, []];

  return (
    <html lang="tr" className={`${display.variable} ${body.variable} ${label.variable}`}>
      <body className="font-body antialiased">
        <TopNav
          user={user ? { id: user.id, displayName: user.displayName, avatarSeed: user.avatarSeed } : null}
          unread={unread}
          notifications={notifications.map((n) => ({ id: n.id, body: n.body, read: n.read }))}
        />
        <main className="min-h-screen">{children}</main>
        <footer className="border-t border-white/10 px-5 py-10 text-center font-label text-xs uppercase tracking-[0.2em] text-cream-faint">
          Tuhaf Club · Her sabah 08.30 · İstediğin zaman çık
        </footer>
      </body>
    </html>
  );
}
