import Link from "next/link";

export function Gate({
  title = "Önce giriş yap.",
  body = "Bu sayfa sana özel. Görmek için giriş yapmalısın.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-5 text-center">
      <h1 className="font-display text-3xl font-900 italic text-cream">{title}</h1>
      <p className="mt-3 font-body text-lg text-cream-dim">{body}</p>
      <Link
        href="/giris"
        className="mx-auto mt-6 rounded-full bg-red px-6 py-3 font-label text-sm uppercase tracking-[0.15em] text-cream hover:bg-red-dark"
      >
        Giriş Yap
      </Link>
    </div>
  );
}
