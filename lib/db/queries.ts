import { prisma } from "@/lib/db";
import { segmentBlock, type Segment, type Range } from "@/lib/highlights/segmentation";
import type {
  ActorLite,
  FeedItem,
  NoteThreadView,
  NoteView,
  ReactionInfo,
} from "@/lib/social-types";

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
  image: string | null;
  shared: number;
};

/** Readers who underlined the same words (overlapping offsets in the same
 * block), excluding self and already-followed users. */
export async function getOverlapSuggestions(
  userId: string,
  limit = 8,
): Promise<SuggestedReader[]> {
  const rows = await prisma.$queryRaw<
    { id: string; displayName: string; avatarSeed: string; image: string | null; shared: bigint | number }[]
  >`
    SELECT u.id AS id, u.displayName AS displayName, u.avatarSeed AS avatarSeed,
           u.image AS image, COUNT(*) AS shared
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
    image: r.image,
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
      _count: { select: { highlights: true, followers: true, following: true } },
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

/** Follower or following list for a profile, with the viewer's follow state on
 * each listed user (for follow buttons + "takip ediyor" badges). */
export async function getConnections(
  userId: string,
  kind: "followers" | "following",
  viewerId?: string,
) {
  const people =
    kind === "followers"
      ? (
          await prisma.follow.findMany({
            where: { followeeId: userId },
            include: { follower: true },
            orderBy: { createdAt: "desc" },
          })
        ).map((e) => e.follower)
      : (
          await prisma.follow.findMany({
            where: { followerId: userId },
            include: { followee: true },
            orderBy: { createdAt: "desc" },
          })
        ).map((e) => e.followee);

  let viewerFollows = new Set<string>();
  if (viewerId) {
    const vf = await prisma.follow.findMany({
      where: { followerId: viewerId, followeeId: { in: people.map((p) => p.id) } },
      select: { followeeId: true },
    });
    viewerFollows = new Set(vf.map((x) => x.followeeId));
  }

  return people.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    avatarSeed: p.avatarSeed,
    image: p.image,
    viewerFollows: viewerFollows.has(p.id),
    isSelf: p.id === viewerId,
  }));
}

/* ----------------------------- Reactions ------------------------------- */

/** Reaction count + whether the viewer has reacted, for a set of highlights. */
export async function getReactionInfo(
  highlightIds: string[],
  viewerId?: string,
): Promise<Map<string, ReactionInfo>> {
  const out = new Map<string, ReactionInfo>();
  if (highlightIds.length === 0) return out;

  const grouped = await prisma.highlightReaction.groupBy({
    by: ["highlightId"],
    where: { highlightId: { in: highlightIds } },
    _count: { _all: true },
  });
  const counts = new Map(grouped.map((g) => [g.highlightId, g._count._all]));

  let mine = new Set<string>();
  if (viewerId) {
    const rows = await prisma.highlightReaction.findMany({
      where: { highlightId: { in: highlightIds }, userId: viewerId },
      select: { highlightId: true },
    });
    mine = new Set(rows.map((r) => r.highlightId));
  }

  for (const id of highlightIds) {
    out.set(id, { count: counts.get(id) ?? 0, reacted: mine.has(id) });
  }
  return out;
}

/* -------------------------------- Notes -------------------------------- */

function toNoteView(n: {
  id: string;
  body: string;
  createdAt: Date;
  user: ActorLite;
  replies?: { id: string; body: string; createdAt: Date; user: ActorLite }[];
}): NoteView {
  return {
    id: n.id,
    body: n.body,
    createdAt: n.createdAt.toISOString(),
    author: { id: n.user.id, displayName: n.user.displayName, avatarSeed: n.user.avatarSeed, image: n.user.image ?? null },
    replies: (n.replies ?? []).map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      author: { id: r.user.id, displayName: r.user.displayName, avatarSeed: r.user.avatarSeed, image: r.user.image ?? null },
      replies: [],
    })),
  };
}

/** All note threads on an article, grouped by the span they anchor to. */
export async function getArticleNotes(articleId: string): Promise<NoteThreadView[]> {
  const notes = await prisma.note.findMany({
    where: { articleId, parentId: null },
    include: {
      user: true,
      replies: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  const threads = new Map<string, NoteThreadView>();
  for (const n of notes) {
    const key = `${n.blockId}:${n.startOffset}:${n.endOffset}`;
    const thread =
      threads.get(key) ??
      ({
        blockId: n.blockId,
        articleId,
        start: n.startOffset,
        end: n.endOffset,
        text: n.text,
        notes: [],
      } as NoteThreadView);
    thread.notes.push(toNoteView(n));
    threads.set(key, thread);
  }
  return [...threads.values()];
}

/* ----------------------------- Activity feed --------------------------- */

const articleLite = (a: {
  title: string;
  slug: string;
  publisher: { name: string; slug: string };
}) => ({
  title: a.title,
  slug: a.slug,
  publisherName: a.publisher.name,
  publisherSlug: a.publisher.slug,
});

/** Recent activity from the people a user follows: their underlines, notes,
 * and new follows — merged and time-ordered. */
export async function getActivityFeed(userId: string, limit = 60): Promise<FeedItem[]> {
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followeeId: true },
  });
  const ids = following.map((f) => f.followeeId);
  if (ids.length === 0) return [];

  const [highlights, notes, follows] = await Promise.all([
    prisma.highlight.findMany({
      where: { userId: { in: ids } },
      include: { user: true, article: { include: { publisher: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.note.findMany({
      where: { userId: { in: ids }, parentId: null },
      include: { user: true, article: { include: { publisher: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.follow.findMany({
      where: { followerId: { in: ids } },
      include: { follower: true, followee: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  const reactions = await getReactionInfo(
    highlights.map((h) => h.id),
    userId,
  );

  const actor = (u: ActorLite): ActorLite => ({
    id: u.id,
    displayName: u.displayName,
    avatarSeed: u.avatarSeed,
    image: u.image ?? null,
  });

  const items: FeedItem[] = [
    ...highlights.map(
      (h): FeedItem => ({
        kind: "highlight",
        id: `h-${h.id}`,
        createdAt: h.createdAt.toISOString(),
        actor: actor(h.user),
        highlightId: h.id,
        text: h.text,
        article: articleLite(h.article),
        reactions: reactions.get(h.id) ?? { count: 0, reacted: false },
      }),
    ),
    ...notes.map(
      (n): FeedItem => ({
        kind: "note",
        id: `n-${n.id}`,
        createdAt: n.createdAt.toISOString(),
        actor: actor(n.user),
        body: n.body,
        text: n.text,
        article: articleLite(n.article),
      }),
    ),
    ...follows.map(
      (f): FeedItem => ({
        kind: "follow",
        id: `f-${f.followerId}-${f.followeeId}`,
        createdAt: f.createdAt.toISOString(),
        actor: actor(f.follower),
        target: actor(f.followee),
      }),
    ),
  ];

  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return items.slice(0, limit);
}

/* --------------------------- Discovery / stats ------------------------- */

export type SimilarReader = {
  id: string;
  displayName: string;
  avatarSeed: string;
  image: string | null;
  shared: number;
  viewerFollows: boolean;
};

/** "Senin gibi okuyanlar" — readers with the most overlapping underlines,
 * including ones already followed (each carries follow state for the button). */
export async function getReadersLikeYou(
  userId: string,
  limit = 12,
): Promise<SimilarReader[]> {
  const rows = await prisma.$queryRaw<
    { id: string; displayName: string; avatarSeed: string; image: string | null; shared: bigint | number }[]
  >`
    SELECT u.id AS id, u.displayName AS displayName, u.avatarSeed AS avatarSeed,
           u.image AS image, COUNT(*) AS shared
    FROM "Highlight" mine
    JOIN "Highlight" other
      ON other.blockId = mine.blockId
     AND other.userId <> mine.userId
     AND other.startOffset < mine.endOffset
     AND other.endOffset > mine.startOffset
    JOIN "User" u ON u.id = other.userId
    WHERE mine.userId = ${userId}
    GROUP BY u.id
    ORDER BY shared DESC
    LIMIT ${limit}
  `;

  const ids = rows.map((r) => r.id);
  const following = ids.length
    ? await prisma.follow.findMany({
        where: { followerId: userId, followeeId: { in: ids } },
        select: { followeeId: true },
      })
    : [];
  const fset = new Set(following.map((f) => f.followeeId));

  return rows.map((r) => ({
    id: r.id,
    displayName: r.displayName,
    avatarSeed: r.avatarSeed,
    image: r.image,
    shared: Number(r.shared),
    viewerFollows: fset.has(r.id),
  }));
}

export type Badge = { key: string; label: string; hint: string; earned: boolean };

export type ReadingStats = {
  totalHighlights: number;
  totalArticles: number;
  totalDays: number;
  currentStreak: number;
  longestStreak: number;
  noteCount: number;
  reactionsGiven: number;
  followingCount: number;
  badges: Badge[];
};

function computeStreaks(dayKeys: string[]): { current: number; longest: number } {
  if (dayKeys.length === 0) return { current: 0, longest: 0 };
  const nums = [
    ...new Set(
      dayKeys.map((k) => Math.floor(new Date(k + "T00:00:00").getTime() / 86400000)),
    ),
  ].sort((a, b) => a - b);

  let longest = 1;
  let run = 1;
  for (let i = 1; i < nums.length; i++) {
    run = nums[i] === nums[i - 1]! + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const set = new Set(nums);
  const today = Math.floor(new Date().setHours(0, 0, 0, 0) / 86400000);
  let d = today;
  if (!set.has(today) && set.has(today - 1)) d = today - 1; // streak may end yesterday
  let current = 0;
  while (set.has(d)) {
    current++;
    d--;
  }
  return { current, longest };
}

export async function getReadingStats(userId: string): Promise<ReadingStats> {
  const [highlights, noteCount, reactionsGiven, followingCount] = await Promise.all([
    prisma.highlight.findMany({ where: { userId }, select: { createdAt: true, articleId: true } }),
    prisma.note.count({ where: { userId } }),
    prisma.highlightReaction.count({ where: { userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
  ]);

  const dayKeys = highlights.map((h) => new Date(h.createdAt).toISOString().slice(0, 10));
  const totalDays = new Set(dayKeys).size;
  const totalArticles = new Set(highlights.map((h) => h.articleId)).size;
  const { current, longest } = computeStreaks(dayKeys);
  const totalHighlights = highlights.length;

  const badges: Badge[] = [
    { key: "first", label: "İlk Çizgi", hint: "İlk altını çizişin", earned: totalHighlights >= 1 },
    { key: "streak7", label: "Maraton", hint: "7 gün üst üste", earned: current >= 7 || longest >= 7 },
    { key: "hundred", label: "Yüz Çizgi", hint: "100 altı çizili", earned: totalHighlights >= 100 },
    { key: "social", label: "Sosyal Okur", hint: "5 kişiyi takip et", earned: followingCount >= 5 },
    { key: "noter", label: "Notçu", hint: "İlk notun", earned: noteCount >= 1 },
    { key: "supporter", label: "Destekçi", hint: "10 'ben de'", earned: reactionsGiven >= 10 },
  ];

  return {
    totalHighlights,
    totalArticles,
    totalDays,
    currentStreak: current,
    longestStreak: longest,
    noteCount,
    reactionsGiven,
    followingCount,
    badges,
  };
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
