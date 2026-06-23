"use client";

import { useActionState } from "react";
import { subscribeAction, type SubscribeState } from "@/lib/actions/auth";

export function SubscribeBlock() {
  const [state, formAction, pending] = useActionState<SubscribeState, FormData>(
    subscribeAction,
    {},
  );

  return (
    <section className="bg-red">
      <div className="mx-auto max-w-shell px-5 py-14">
        <h2 className="font-display text-4xl font-900 italic leading-tight text-cream md:text-5xl">
          Senin gibi hissedenler var.
        </h2>
        <p className="mt-3 max-w-xl font-body text-lg text-cream/90">
          Her sabah 08.30’da: Okunur. Dinlenir. Hissedilir.
        </p>

        {state.ok ? (
          <p className="mt-8 max-w-xl rounded-lg bg-black/30 px-5 py-4 font-body text-lg italic text-cream">
            Aramıza hoş geldin. Yarın sabah 08.30’da ilk yazı kutunda.
          </p>
        ) : (
          <form action={formAction} className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <input
              type="email"
              name="email"
              required
              placeholder="email@adresin.com"
              className="flex-1 rounded-lg bg-cream px-5 py-4 font-body text-lg text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-black/40"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-ink px-8 py-4 font-label text-sm uppercase tracking-[0.18em] text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "..." : "Abone Ol"}
            </button>
          </form>
        )}
        {state.error && (
          <p className="mt-2 font-body text-sm text-cream">{state.error}</p>
        )}

        <p className="mt-4 font-label text-[11px] uppercase tracking-[0.18em] text-cream/70">
          Ücretsiz · Her sabah 08.30 · İstediğin zaman çık
        </p>
      </div>
    </section>
  );
}
