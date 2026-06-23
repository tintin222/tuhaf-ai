"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-3">
      <input
        type="email"
        name="email"
        required
        autoFocus
        placeholder="email@adresin.com"
        className="rounded-lg bg-ink-card px-5 py-4 font-body text-lg text-cream placeholder:text-cream-faint focus:outline-none focus:ring-2 focus:ring-red"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-red px-8 py-4 font-label text-sm uppercase tracking-[0.18em] text-cream hover:bg-red-dark disabled:opacity-60"
      >
        {pending ? "..." : "Giriş Yap"}
      </button>
      {state.error && (
        <p className="font-body text-sm text-red">{state.error}</p>
      )}
    </form>
  );
}
