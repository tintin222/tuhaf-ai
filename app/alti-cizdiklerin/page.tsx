import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserHighlights } from "@/lib/db/queries";
import { ShareCardComposer } from "@/components/ShareCardComposer";

export const dynamic = "force-dynamic";

export default async function MyHighlightsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Gate />
    );
  }

  const highlights = await getUserHighlights(user.id);

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <p className="font-label text-xs uppercase tracking-[0.18em] text-cream-dim">
        Altını Çizdiklerin
      </p>
      <h1 className="mt-2 font-display text-4xl font-900 italic text-cream">
        tuhaf highlight
      </h1>
      <p className="mt-3 font-body text-lg text-cream-dim">
        Çizdiğin her cümle, paylaşabileceğin bir karta dönüşür.
      </p>

      <div className="mt-8">
        <ShareCardComposer
          highlights={highlights.map((h) => ({
            id: h.id,
            text: h.text,
            articleTitle: h.article.title,
            publisherName: h.article.publisher.name,
          }))}
        />
      </div>
    </div>
  );
}

function Gate() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-5 text-center">
      <h1 className="font-display text-3xl font-900 italic text-cream">
        Önce giriş yap.
      </h1>
      <p className="mt-3 font-body text-lg text-cream-dim">
        Altını çizdiklerin sana özel. Görmek için giriş yapmalısın.
      </p>
      <Link href="/giris" className="mx-auto mt-6 rounded-full bg-red px-6 py-3 font-label text-sm uppercase tracking-[0.15em] text-cream hover:bg-red-dark">
        Giriş Yap
      </Link>
    </div>
  );
}
