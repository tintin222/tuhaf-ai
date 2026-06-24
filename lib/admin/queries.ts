import { prisma } from "@/lib/db";
import { blocksToBody } from "@/lib/admin/blocks";

export async function listAdminArticles() {
  return prisma.article.findMany({
    include: {
      publisher: { select: { name: true } },
      _count: { select: { highlights: true } },
    },
    orderBy: [{ publishedAt: "desc" }],
  });
}

export async function getArticleForEdit(id: string) {
  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      blocks: { orderBy: { index: "asc" } },
      publisher: { select: { slug: true } },
    },
  });
  if (!article) return null;
  return { article, body: blocksToBody(article.blocks) };
}

export async function listCategories() {
  return prisma.category.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });
}

export async function listPublishersForSelect() {
  return prisma.publisher.findMany({
    select: { id: true, name: true, category: true },
    orderBy: { name: "asc" },
  });
}

export async function getAnalytics() {
  const [eventsByType, articles, users, highlights, notes] = await Promise.all([
    prisma.event.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.article.count(),
    prisma.user.count(),
    prisma.highlight.count(),
    prisma.note.count(),
  ]);
  const typeCount = (t: string) => eventsByType.find((e) => e.type === t)?._count._all ?? 0;

  const [opens, listens, clicksByLabel] = await Promise.all([
    prisma.event.groupBy({
      by: ["articleId"],
      where: { type: "open", articleId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { articleId: "desc" } },
      take: 8,
    }),
    prisma.event.groupBy({
      by: ["articleId"],
      where: { type: "listen", articleId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { articleId: "desc" } },
      take: 8,
    }),
    prisma.event.groupBy({
      by: ["label"],
      where: { type: "click" },
      _count: { _all: true },
      orderBy: { _count: { label: "desc" } },
    }),
  ]);

  const ids = [
    ...new Set([...opens, ...listens].map((r) => r.articleId).filter(Boolean) as string[]),
  ];
  const arts = await prisma.article.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, slug: true, publisher: { select: { name: true, slug: true } } },
  });
  const byId = new Map(arts.map((a) => [a.id, a]));
  const hydrate = (rows: { articleId: string | null; _count: { _all: number } }[]) =>
    rows
      .map((r) => ({ article: byId.get(r.articleId!), count: r._count._all }))
      .filter((x): x is { article: NonNullable<typeof x.article>; count: number } => !!x.article);

  return {
    totals: {
      opens: typeCount("open"),
      listens: typeCount("listen"),
      clicks: typeCount("click"),
      articles,
      users,
      highlights,
      notes,
    },
    mostOpened: hydrate(opens),
    mostListened: hydrate(listens),
    clicksByLabel: clicksByLabel.map((c) => ({ label: c.label ?? "—", count: c._count._all })),
  };
}
