import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { ArticleCard, type CardArticle } from "@/components/ArticleCard";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PublisherPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const publisher = await prisma.publisher.findUnique({
    where: { slug },
    include: {
      articles: {
        where: { status: "published" },
        include: { publisher: true, sponsor: true },
        orderBy: { publishedAt: "desc" },
      },
    },
  });
  if (!publisher) notFound();

  const cards: CardArticle[] = publisher.articles.map((a) => ({
    slug: a.slug, title: a.title, subject: a.subject, pullQuote: a.pullQuote,
    readMinutes: a.readMinutes, category: a.category, posterTheme: a.posterTheme,
    publisher: { slug: publisher.slug, name: publisher.name, title: publisher.title, avatarSeed: publisher.avatarSeed },
    sponsor: a.sponsor ? { name: a.sponsor.name, logoText: a.sponsor.logoText } : null,
  }));

  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <div className="flex items-center gap-5">
        <Avatar seed={publisher.avatarSeed} name={publisher.name} size={80} />
        <div>
          <h1 className="font-display text-4xl font-700 text-cream">{publisher.name}</h1>
          <p className="font-label text-xs uppercase tracking-[0.15em] text-red">{publisher.title}</p>
          <p className="mt-2 max-w-xl font-body text-lg italic text-cream-dim">{publisher.bio}</p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <ArticleCard key={c.slug} article={c} width="w-full" />
        ))}
      </div>
    </div>
  );
}
