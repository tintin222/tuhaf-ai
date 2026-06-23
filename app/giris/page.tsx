import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-16">
      <h1 className="font-display text-4xl font-900 italic leading-tight text-cream">
        Tuhaf Club’a gir.
      </h1>
      <p className="mt-4 font-body text-lg text-cream-dim">
        Şimdilik yalnızca davetli okurlara açığız. E-postanı gir; listedeysen
        seni içeri alalım.
      </p>

      <LoginForm />

      <p className="mt-6 font-label text-[11px] uppercase tracking-[0.15em] text-cream-faint">
        Demo: <span className="text-red">efe@infinics.xyz</span>
      </p>
    </div>
  );
}
