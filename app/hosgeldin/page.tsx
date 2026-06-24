import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { ProfileForm } from "@/components/ProfileForm";
import { parseInterests } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  if (user.onboarded) redirect("/");

  return (
    <div className="mx-auto max-w-lg px-5 py-12">
      <p className="font-label text-xs uppercase tracking-[0.18em] text-cream-dim">
        Tuhaf Club'a hoş geldin
      </p>
      <h1 className="mt-2 font-display text-4xl font-900 italic text-cream">Kendini tanıt</h1>
      <p className="mt-3 font-body text-lg text-cream-dim">
        Birkaç bilgi, seni senin gibi okuyanlarla buluşturmamıza yardımcı olur.
      </p>

      <div className="mt-8">
        <ProfileForm
          mode="onboarding"
          redirectTo="/"
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
