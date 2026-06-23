import { Gate } from "@/components/Gate";
import { UserRow } from "@/components/UserRow";
import { getReadersLikeYou } from "@/lib/db/queries";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Gate
        title="Senin gibi okuyanlar."
        body="Aynı cümlelerin altını çizen okurları görmek için giriş yap."
      />
    );
  }

  const readers = await getReadersLikeYou(user.id, 24);

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <p className="font-label text-xs uppercase tracking-[0.18em] text-cream-dim">Keşfet</p>
      <h1 className="mt-2 font-display text-4xl font-900 italic text-cream">
        Senin gibi okuyanlar
      </h1>
      <p className="mt-3 font-body text-lg text-cream-dim">
        Seninle aynı cümlelerin altını çizenler. Ortak nokta ne kadar çoksa, o kadar yukarıda.
      </p>

      {readers.length === 0 ? (
        <p className="mt-10 font-body text-lg italic text-cream-dim">
          Daha fazla altını çiz; benzer okurları bulmak için birkaç ize ihtiyacımız var.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {readers.map((r) => (
            <li key={r.id}>
              <UserRow
                id={r.id}
                displayName={r.displayName}
                avatarSeed={r.avatarSeed}
                viewerFollows={r.viewerFollows}
                isSelf={false}
                showFollow
                meta={`${r.shared} ortak çizgi`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
