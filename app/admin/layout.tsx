import Link from "next/link";
import { getAdminUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Genel Bakış" },
  { href: "/admin/icerik", label: "İçerik" },
  { href: "/admin/kategoriler", label: "Kategoriler" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser();

  if (!admin) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-5 text-center">
        <h1 className="font-display text-3xl font-900 italic text-cream">Yönetim paneli</h1>
        <p className="mt-3 font-body text-lg text-cream-dim">
          Bu alan yalnızca yöneticilere açık.
        </p>
        <Link
          href="/"
          className="mx-auto mt-6 rounded-full border border-white/20 px-6 py-3 font-label text-sm uppercase tracking-[0.15em] text-cream hover:border-red hover:text-red"
        >
          Ana sayfaya dön
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-shell px-5 py-10">
      <div className="flex items-center gap-3 border-b border-white/10 pb-5">
        <span className="font-display text-2xl italic text-cream">Tuhaf</span>
        <span className="font-label text-xs uppercase tracking-[0.2em] text-red">Yönetim</span>
        <nav className="ml-auto flex gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-full px-4 py-1.5 font-label text-xs uppercase tracking-[0.12em] text-cream-dim hover:bg-white/5 hover:text-cream"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="py-8">{children}</div>
    </div>
  );
}
