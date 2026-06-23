import Link from "next/link";
import { Avatar } from "@/components/Avatar";

type Member = {
  slug: string;
  name: string;
  title: string;
  avatarSeed: string;
};

/** The "Tuhaf Club" rail — the people who make up the Club. */
export function ClubRail({ members }: { members: Member[] }) {
  if (members.length === 0) return null;
  return (
    <section className="border-y border-white/10 bg-ink-soft py-8">
      <div className="mx-auto flex max-w-shell items-baseline gap-3 px-5">
        <h2 className="font-label text-sm font-500 uppercase tracking-[0.18em] text-cream">
          Tuhaf Club
        </h2>
        <span className="font-body text-sm italic text-cream-faint">
          Club’ı oluşturan {members.length} isim
        </span>
      </div>
      <div className="no-scrollbar mt-5 flex gap-6 overflow-x-auto px-5 pb-2">
        {members.map((m) => (
          <Link
            key={m.slug}
            href={`/yazar/${m.slug}`}
            className="group flex w-20 shrink-0 flex-col items-center gap-2 text-center"
          >
            <Avatar
              seed={m.avatarSeed}
              name={m.name}
              size={64}
              className="ring-2 ring-transparent transition-all group-hover:ring-red"
            />
            <span className="font-body text-xs leading-tight text-cream/90">{m.name}</span>
            <span className="font-label text-[9px] uppercase tracking-[0.12em] text-cream-faint">
              {m.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
