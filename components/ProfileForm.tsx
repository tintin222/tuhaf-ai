"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePicker } from "@/components/ImagePicker";
import { PasswordField } from "@/components/PasswordField";
import { saveProfile } from "@/lib/actions/profile";
import { INTERESTS, GENDERS } from "@/lib/profile";

export type ProfileFormInitial = {
  displayName: string;
  image: string | null;
  bio: string;
  age: number | null;
  gender: string | null;
  location: string;
  interests: string[];
};

export function ProfileForm({
  initial,
  mode,
  redirectTo,
}: {
  initial: ProfileFormInitial;
  mode: "onboarding" | "edit";
  redirectTo: string;
}) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [image, setImage] = useState<string | null>(initial.image);
  const [bio, setBio] = useState(initial.bio);
  const [age, setAge] = useState(initial.age != null ? String(initial.age) : "");
  const [gender, setGender] = useState(initial.gender ?? "");
  const [location, setLocation] = useState(initial.location);
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const toggleInterest = (i: string) =>
    setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveProfile({
        displayName,
        image,
        bio,
        age: age ? parseInt(age, 10) : null,
        gender: gender || null,
        location,
        interests,
        password: password || undefined,
      });
      if (res.ok) {
        router.push(redirectTo);
        router.refresh();
      } else {
        setError(res.error ?? "Bir şeyler ters gitti.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-7">
      <Field label="Profil fotoğrafı">
        <ImagePicker value={image} onChange={setImage} />
      </Field>

      <Field label="Görünen ad">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Adın"
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Yaş">
          <input
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
            inputMode="numeric"
            placeholder="—"
            className={inputClass}
          />
        </Field>
        <Field label="Cinsiyet">
          <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
            <option value="">Seç</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Konum">
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="İstanbul"
          className={inputClass}
        />
      </Field>

      <Field label="İlgi alanların">
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const on = interests.includes(i);
            return (
              <button
                type="button"
                key={i}
                onClick={() => toggleInterest(i)}
                className={`rounded-full border px-3 py-1.5 font-label text-[11px] uppercase tracking-[0.1em] transition-colors ${
                  on
                    ? "border-red bg-red/10 text-red"
                    : "border-white/15 text-cream-dim hover:border-cream hover:text-cream"
                }`}
              >
                {i}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Hakkında">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 280))}
          rows={3}
          placeholder="Kendinden kısaca bahset…"
          className={`${inputClass} resize-none`}
        />
        <p className="mt-1 text-right font-body text-xs text-cream-faint">{bio.length}/280</p>
      </Field>

      <PasswordField
        value={password}
        onChange={setPassword}
        label={mode === "onboarding" ? "Şifre belirle (isteğe bağlı)" : "Yeni şifre"}
        hint={
          mode === "onboarding"
            ? "Bir dahaki sefere şifreyle de girebilirsin. İstersen boş bırak."
            : "Boş bırakırsan şifren değişmez."
        }
      />

      {error && <p className="font-body text-sm text-red">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-red px-6 py-3.5 font-label text-sm uppercase tracking-[0.14em] text-cream hover:bg-red-dark disabled:opacity-60"
      >
        {pending ? "Kaydediliyor…" : mode === "onboarding" ? "Tuhaf Club'a katıl" : "Kaydet"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/15 bg-ink px-3 py-2.5 font-body text-base text-cream placeholder:text-cream-faint focus:border-red focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block font-label text-[11px] uppercase tracking-[0.15em] text-cream-dim">
        {label}
      </label>
      {children}
    </div>
  );
}
