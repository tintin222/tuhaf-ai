"use client";

import { useActionState, useState } from "react";
import { authAction, type AuthState } from "@/lib/actions/auth";

const inputClass =
  "rounded-lg bg-ink-card px-5 py-4 font-body text-lg text-cream placeholder:text-cream-faint focus:outline-none focus:ring-2 focus:ring-red";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    authAction,
    {},
  );
  const [showPw, setShowPw] = useState(false);

  if (state.sent) {
    return (
      <div className="mt-8 rounded-lg border border-white/15 bg-ink-card px-5 py-6">
        <p className="font-body text-lg text-cream">
          Sana bir giriş bağlantısı yolladık.
        </p>
        <p className="mt-2 font-body text-sm text-cream-dim">
          Mailini kontrol et. Bağlantı 30 dakika geçerli.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-3">
      <input
        type="email"
        name="email"
        required
        autoFocus
        placeholder="email@adresin.com"
        className={inputClass}
      />
      {showPw && (
        <input
          type="password"
          name="password"
          minLength={8}
          placeholder="Şifren"
          autoComplete="current-password"
          className={inputClass}
        />
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-red px-8 py-4 font-label text-sm uppercase tracking-[0.18em] text-cream hover:bg-red-dark disabled:opacity-60"
      >
        {pending ? "..." : showPw ? "Giriş yap" : "Giriş bağlantısı yolla"}
      </button>
      <button
        type="button"
        onClick={() => setShowPw((v) => !v)}
        className="self-start font-label text-[11px] uppercase tracking-[0.15em] text-cream-faint hover:text-red"
      >
        {showPw ? "E-posta bağlantısıyla gir" : "Şifren varsa şifrenle gir"}
      </button>
      {state.error && (
        <p className="font-body text-sm text-red">{state.error}</p>
      )}
    </form>
  );
}
