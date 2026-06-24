import Link from "next/link";
import { Gate } from "@/components/Gate";
import { ProfileForm } from "@/components/ProfileForm";
import { getCurrentUser } from "@/lib/auth/session";
import { parseInterests } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    return <Gate title="Profilini düzenle." body="Önce giriş yapmalısın." />;
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-12">
      <Link
        href={`/u/${user.id}`}
        className="font-label text-[11px] uppercase tracking-[0.15em] text-cream-faint hover:text-red"
      >
        ← Profiline dön
      </Link>
      <h1 className="mt-3 font-display text-4xl font-900 italic text-cream">Profilini düzenle</h1>

      <div className="mt-8">
        <ProfileForm
          mode="edit"
          redirectTo={`/u/${user.id}`}
          initial={{
            displayName: user.displayName,
            image: user.image,
            bio: user.bio ?? "",
            age: user.age,
            gender: user.gender,
            location: user.location ?? "",
            interests: parseInterests(user.interests),
          }}
        />
      </div>
    </div>
  );
}
