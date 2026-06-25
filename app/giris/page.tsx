import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-16">
      <h1 className="font-display text-4xl font-900 italic leading-tight text-cream">
        Tuhaf Club'a gir.
      </h1>
      <p className="mt-4 font-body text-lg text-cream-dim">
        E-postanı gir; sana bir giriş bağlantısı yollayalım. İlk kez geliyorsan
        hesabın o bağlantıyla oluşur.
      </p>

      {error === "invalid-link" && (
        <p className="mt-4 rounded-lg border border-red/40 bg-red/10 px-4 py-3 font-body text-sm text-red">
          Bağlantı geçersiz veya süresi dolmuş. Aşağıdan yeni bir tane iste.
        </p>
      )}

      <LoginForm />
    </div>
  );
}
