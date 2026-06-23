/** Shared serializable types for the social layer (feed, notes, reactions). */

export type ActorLite = {
  id: string;
  displayName: string;
  avatarSeed: string;
};

export type ReactionInfo = {
  count: number;
  reacted: boolean;
};

export type NoteView = {
  id: string;
  body: string;
  createdAt: string; // ISO string — safe across the server/client boundary
  author: ActorLite;
  replies: NoteView[];
};

export type NoteSpan = {
  blockId: string;
  articleId: string;
  start: number;
  end: number;
  text: string;
};

export type NoteThreadView = NoteSpan & {
  notes: NoteView[];
};

export type ArticleLite = {
  title: string;
  slug: string;
  publisherName: string;
  publisherSlug: string;
};

export type FeedItem =
  | {
      kind: "highlight";
      id: string;
      createdAt: string;
      actor: ActorLite;
      highlightId: string;
      text: string;
      article: ArticleLite;
      reactions: ReactionInfo;
    }
  | {
      kind: "note";
      id: string;
      createdAt: string;
      actor: ActorLite;
      body: string;
      text: string;
      article: ArticleLite;
    }
  | {
      kind: "follow";
      id: string;
      createdAt: string;
      actor: ActorLite;
      target: ActorLite;
    };
