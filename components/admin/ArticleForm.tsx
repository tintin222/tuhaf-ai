"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveArticle, deleteArticle, type ArticleInput } from "@/lib/actions/admin";
import { slugify } from "@/lib/admin/blocks";

type Option = { value: string; label: string };

export function ArticleForm({
  initial,
  publishers,
  categories,
  themes,
}: {
  initial: Partial<ArticleInput> & { id?: string };
  publishers: Option[];
  categories: Option[];
  themes: Option[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [f, setF] = useState<ArticleInput>({
    id: initial.id,
    title: initial.title ?? "",
    slug: initial.slug ?? "",
    subject: initial.subject ?? "",
    category: initial.category ?? categories[0]?.value ?? "",
    publisherId: initial.publisherId ?? publishers[0]?.value ?? "",
    pullQuote: initial.pullQuote ?? "",
    readMinutes: initial.readMinutes ?? 4,
    listenSeconds: initial.listenSeconds ?? 240,
    posterTheme: initial.posterTheme ?? "crimson",
    status: initial.status ?? "published",
    isLive: initial.isLive ?? false,
    publishedAt: initial.publishedAt ?? new Date().toISOString().slice(0, 10),
    audioUrl: initial.audioUrl ?? null,
    body: initial.body ?? "",
  });

  const set = <K extends keyof ArticleInput>(k: K, v: ArticleInput[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveArticle(f);
      if (res.ok) {
        router.push("/admin/icerik");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const onDelete = () => {
    if (!f.id) return;
    if (!confirm("Bu içeriği silmek istediğine emin misin?")) return;
    startDelete(async () => {
      await deleteArticle(f.id!);
      router.push("/admin/icerik");
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      <Field label="Başlık">
        <input
          value={f.title}
          onChange={(e) => {
            set("title", e.target.value);
            if (!f.id && !f.slug) set("slug", slugify(e.target.value));
          }}
          className={input}
          placeholder="Beynin En Büyük Yalanı"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Slug (URL)">
          <input value={f.slug} onChange={(e) => set("slug", slugify(e.target.value))} className={input} placeholder="otomatik" />
        </Field>
        <Field label="Yayın tarihi">
          <input type="date" value={f.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} className={input} />
        </Field>
      </div>

      <Field label="Özet (standfirst)">
        <input value={f.subject} onChange={(e) => set("subject", e.target.value)} className={input} placeholder="Tek cümlelik tanıtım." />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Yazar">
          <select value={f.publisherId} onChange={(e) => set("publisherId", e.target.value)} className={input}>
            {publishers.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Kategori">
          <select value={f.category} onChange={(e) => set("category", e.target.value)} className={input}>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="İçerik metni">
        <textarea
          value={f.body}
          onChange={(e) => set("body", e.target.value)}
          rows={12}
          className={`${input} font-body leading-relaxed`}
          placeholder={"Paragrafları boş satırla ayır.\n\n# Başlık satırı\n> Alıntı satırı\n\nNormal paragraf…"}
        />
        <p className="mt-1 font-body text-xs text-cream-faint">
          Boş satır = yeni blok · <code>#</code> başlık · <code>&gt;</code> alıntı. Metin altı-çizme için NFC ile normalize edilir.
        </p>
      </Field>

      <Field label="Öne çıkan alıntı (pull-quote)">
        <input value={f.pullQuote} onChange={(e) => set("pullQuote", e.target.value)} className={input} placeholder="Boş bırakılırsa ilk cümleden alınır." />
      </Field>

      <AudioField value={f.audioUrl} onChange={(v) => set("audioUrl", v)} />

      <div className="grid grid-cols-3 gap-4">
        <Field label="Okuma (dk)">
          <input type="number" min={1} value={f.readMinutes} onChange={(e) => set("readMinutes", Number(e.target.value))} className={input} />
        </Field>
        <Field label="Dinleme (sn)">
          <input type="number" min={0} value={f.listenSeconds} onChange={(e) => set("listenSeconds", Number(e.target.value))} className={input} />
        </Field>
        <Field label="Poster teması">
          <select value={f.posterTheme} onChange={(e) => set("posterTheme", e.target.value)} className={input}>
            {themes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <Field label="Durum">
          <select value={f.status} onChange={(e) => set("status", e.target.value)} className={input}>
            <option value="published">Yayında</option>
            <option value="draft">Taslak</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 pt-6 font-body text-sm text-cream">
          <input type="checkbox" checked={f.isLive} onChange={(e) => set("isLive", e.target.checked)} className="h-4 w-4 accent-red" />
          Billboard'da "Şimdi Yayında" olarak göster
        </label>
      </div>

      {error && <p className="font-body text-sm text-red">{error}</p>}

      <div className="flex items-center gap-3 border-t border-white/10 pt-6">
        <button type="submit" disabled={pending} className="rounded-full bg-red px-6 py-3 font-label text-sm uppercase tracking-[0.14em] text-cream hover:bg-red-dark disabled:opacity-60">
          {pending ? "Kaydediliyor…" : f.id ? "Kaydet" : "Yayınla"}
        </button>
        {f.id && (
          <button type="button" onClick={onDelete} disabled={deleting} className="ml-auto rounded-full px-4 py-3 font-label text-sm uppercase tracking-[0.12em] text-cream-faint hover:text-red disabled:opacity-60">
            {deleting ? "Siliniyor…" : "Sil"}
          </button>
        )}
      </div>
    </form>
  );
}

function AudioField({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const upload = async (file: File) => {
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/audio", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok && json.url) onChange(json.url);
      else setErr(json.error ?? "Yükleme başarısız.");
    } catch {
      setErr("Yükleme başarısız.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Field label="Seslendirme (ses kaydı)">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-full border border-white/20 px-4 py-2 font-label text-[11px] uppercase tracking-[0.12em] text-cream hover:border-red hover:text-red">
            {busy ? "Yükleniyor…" : "Ses dosyası yükle"}
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(file);
                e.target.value = "";
              }}
            />
          </label>
          {value && (
            <button type="button" onClick={() => onChange(null)} className="font-label text-[11px] uppercase tracking-[0.12em] text-cream-faint hover:text-red">
              Kaldır
            </button>
          )}
        </div>
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="…veya bir ses URL'si yapıştır (/audio/… ya da https://…)"
          className={input}
        />
        {value && <audio controls src={value} className="w-full" />}
        {err && <p className="font-body text-xs text-red">{err}</p>}
      </div>
    </Field>
  );
}

const input =
  "w-full rounded-lg border border-white/15 bg-ink px-3 py-2.5 font-body text-base text-cream placeholder:text-cream-faint focus:border-red focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block font-label text-[11px] uppercase tracking-[0.15em] text-cream-dim">{label}</label>
      {children}
    </div>
  );
}
