import { prisma } from "@/lib/db";
import { segmentBlock, type Segment, type Range } from "@/lib/highlights/segmentation";

const PUBLISHED = { status: "published" as const };

/* ----------------------------- Home rails ----------------------------- */

export async function getLiveArticle() {
  return (
    (await prisma.article.findFirst({
      where: { ...PUBLISHED, isLive: true },
      include: { publisher: true, sponsor: true },
      orderBy: { publishedAt: "desc" },
    })) ??
    (await prisma.article.findFirst({
      where: PUBLISHED,
      include: { publisher: true, sponsor: true },
      orderBy: { publishedAt: "desc" },
    }))
  );
}

export async function getTrendingArticles(limit = 10) {
  const ranked = await mostUnderlinedRaw(limit);
  if (ranked.length === 0) {
    return prisma.article.findMany({
      where: PUBLISHED,
      include: { publisher: true, sponsor: true },
      orderBy: { publishedAt: "desc" },
      take: limit,
    });
  }
  return hydrateRankedArticles(ranked);
}

export async function getClubMembers() {
  return prisma.publisher.findMany({ orderBy: { name: "asc" } });
}

export async function getCategoryRails() {
  const sponsors = await prisma.sponsor.findMany();
  const rails = await Promise.all(
    sponsors.map(async (sponsor) => ({
      sponsor,
      articles: await prisma.article.findMany({
        where: { ...PUBLISHED, category: sponsor.category },
        include: { publisher: true, sponsor: true },
        orderBy: { publishedAt: "desc" },
        take: 8,
      }),
    })),
  );
  return rails.filter((r) => r.articles.length > 0);
}

/* --------------------------- Browse / archive -------------------------- */

export async function getArchiveArticles() {
  return prisma.article.findMany({
    where: PUBLISHED,
    include: { publisher: true, sponsor: true },
    orderBy: { publishedAt: "desc" },
  });
}

export async function getMostUnderlinedArticles(limit = 20) {
  const ranked = await mostUnderlinedRaw(limit);
  const articles = await hydrateRankedArticles(ranked);
  const stats = new Map(ranked.map((r) => [r.id, r]));
  return articles.map((a) => ({
    ...a,
    underliners: Number(stats.get(a.id)?.people ?? 0),
    totalHighlights: Number(stats.get(a.id)?.total ?? 0),
  }));
}

type RankedRow = { id: string; people: number; total: number };

async function mostUnderlinedRaw(limit: number): Promise<RankedRow[]> {
  const rows = await prisma.$queryRaw<
    { id: string; people: bigint | number; total: bigint | number }[]
  >`
    SELECT a.id AS id,
           COUNT(DISTINCT h.userId) AS people,
           COUNT(h.id) AS total
    FROM "Article" a
    JOIN "Highlight" h ON h.articleId = a.id
    WHERE a.status = 'published'
    GROUP BY a.id
    ORDER BY people DESC, total DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: r.id,
    people: Number(r.people),
    total: Number(r.total),
  }));
}

async function hydrateRankedArticles(ranked: RankedRow[]) {
  if (ranked.length === 0) return [];
  const ids = ranked.map((r) => r.id);
  const articles = await prisma.article.findMany({
    where: { id: { in: ids } },
    include: { publisher: true, sponsor: true },
  });
  const order = new Map(ids.map((id, i) => [id, i]));
  return articles.sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  );
}

/* ----------------------------- Reader data ----------------------------- */

export type ReaderBlock = {
  id: string;
  index: number;
  type: string;
  text: string;
  segments: Segment[];
  maxCount: number;
  mine: { id: string; start: number; end: number }[];
};

export async function getArticleForReader(slug: string, currentUserId?: string) {
  const article = await prisma.article.findUnique({
    where: { slug },
    include: {
      publisher: true,
      sponsor: true,
      blocks: { orderBy: { index: "asc" } },
      highlights: { select: { userId: true, blockId: true, startOffset: true, endOffset: true } },
    },
  });
  if (!article) return null;

  const byBlock = new Map<string, Range[]>();
  for (const h of article.highlights) {
    const arr = byBlock.get(h.blockId) ?? [];
    arr.push({ start: h.startOffset, end: h.endOffset, userId: h.userId });
    byBlock.set(h.blockId, arr);
  }

  const mineByBlock = new Map<string, { id: string; start: number; end: number }[]>();
  if (currentUserId) {
    const mine = await prisma.highlight.findMany({
      where: { articleId: article.id, userId: currentUserId },
      select: { id: true, blockId: true, startOffset: true, endOffset: true },
    });
    for (const m of mine) {
      const arr = mineByBlock.get(m.blockId) ?? [];
      arr.push({ id: m.id, start: m.startOffset, end: m.endOffset });
      mineByBlock.set(m.blockId, arr);
    }
  }

  const blocks: ReaderBlock[] = article.blocks.map((b) => {
    const ranges = byBlock.get(b.id) ?? [];
    const segments = segmentBlock(b.text.length, ranges);
    const maxCount = segments.reduce((m, s) => Math.max(m, s.count), 0);
    return {
      id: b.id,
      index: b.index,
      type: b.type,
      text: b.text,
      segments,
      maxCount,
      mine: mineByBlock.get(b.id) ?? [],
    };
  });

  const underliners = new Set(article.highlights.map((h) => h.userId));

  return {
    article,
    blocks,
    underlinerCount: underliners.size,
    highlightCount: article.highlights.length,
  };
}

/* ----------------------- My highlights / journal ----------------------- */

export async function getUserHighlights(userId: string) {
  return prisma.highlight.findMany({
    where: { userId },
    include: {
      article: { include: { publisher: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Articles a user has read (= underlined), grouped by day for the journal. */
export async function getJournal(userId: string) {
  const highlights = await prisma.highlight.findMany({
    where: { userId },
    include: { article: { include: { publisher: true } } },
    orderBy: { createdAt: "desc" },
  });

  const days = new Map<
    string,
    {
      date: Date;
      articles: Map<string, { article: (typeof highlights)[number]["article"]; count: number }>;
    }
  >();
  for (const h of highlights) {
    const key = new Date(h.createdAt).toISOString().slice(0, 10);
    const day = days.get(key) ?? { date: new Date(h.createdAt), articles: new Map() };
    const entry = day.articles.get(h.articleId) ?? { article: h.article, count: 0 };
    entry.count += 1;
    day.articles.set(h.articleId, entry);
    days.set(key, day);
  }

  return [...days.values()].map((d) => ({
    date: d.date,
    articles: [...d.articles.values()],
  }));
}

/* --------------------------- Social discovery -------------------------- */

export type SuggestedReader = {
  id: string;
  displayName: string;
  avatarSeed: string;
  shared: number;
};

/** Readers who underlined the same words (overlapping offsets in the same
 * block), excluding self and already-followed users. */
export async function getOverlapSuggestions(
  userId: string,
  limit = 8,
): Promise<SuggestedReader[]> {
  const rows = await prisma.$queryRaw<
    { id: string; displayName: string; avatarSeed: string; shared: bigint | number }[]
  >`
    SELECT u.id AS id, u.displayName AS displayName, u.avatarSeed AS avatarSeed,
           COUNT(*) AS shared
    FROM "Highlight" mine
    JOIN "Highlight" other
      ON other.blockId = mine.blockId
     AND other.userId <> mine.userId
     AND other.startOffset < mine.endOffset
     AND other.endOffset > mine.startOffset
    JOIN "User" u ON u.id = other.userId
    WHERE mine.userId = ${userId}
      AND other.userId NOT IN (
        SELECT followeeId FROM "Follow" WHERE followerId = ${userId}
      )
    GROUP BY u.id
    ORDER BY shared DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: r.id,
    displayName: r.displayName,
    avatarSeed: r.avatarSeed,
    shared: Number(r.shared),
  }));
}

/** Shared highlights between the viewer and a specific reader (for profile
 * "you both underlined…"). */
export async function getSharedHighlights(viewerId: string, targetId: string) {
  return prisma.$queryRaw<
    { text: string; articleTitle: string; slug: string }[]
  >`
    SELECT other.text AS text, a.title AS articleTitle, a.slug AS slug
    FROM "Highlight" mine
    JOIN "Highlight" other
      ON other.blockId = mine.blockId
     AND other.userId = ${targetId}
     AND other.startOffset < mine.endOffset
     AND other.endOffset > mine.startOffset
    JOIN "Article" a ON a.id = other.articleId
    WHERE mine.userId = ${viewerId}
    LIMIT 20
  `;
}

/* ------------------------------- Profile ------------------------------- */

export async function getReaderProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: { select: { highlights: true, followers: true } },
      highlights: {
        include: { article: { include: { publisher: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });
}

export async function isFollowing(followerId: string, followeeId: string) {
  const edge = await prisma.follow.findUnique({
    where: { followerId_followeeId: { followerId, followeeId } },
  });
  return edge !== null;
}

/* --------------------------- Notifications ----------------------------- */

export async function getNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}

/* ------------------------------- Search -------------------------------- */

export async function search(q: string) {
  const term = q.trim();
  if (!term) return { articles: [], highlights: [] };

  const articles = await prisma.article.findMany({
    where: {
      ...PUBLISHED,
      OR: [
        { title: { contains: term } },
        { subject: { contains: term } },
        { publisher: { name: { contains: term } } },
      ],
    },
    include: { publisher: true, sponsor: true },
    take: 12,
  });

  const highlights = await prisma.highlight.findMany({
    where: { text: { contains: term } },
    include: { article: { include: { publisher: true } }, user: true },
    take: 12,
  });

  return { articles, highlights };
}
