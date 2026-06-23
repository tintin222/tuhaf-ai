# Tuhaf Club

A social reading & annotation platform. Selected publishers post one short page
per day; readers **underline** what moves them, and the app shows what everyone
underlined (a heatmap), suggests readers who underlined the same words, and turns
any underline into a shareable quote card.

Built with **Next.js 15 (App Router) + TypeScript + Prisma/SQLite**, seeded with
synthetic Turkish data.

## Quick start

```bash
npm install
npx prisma db push      # create the SQLite schema (dev.db)
npm run db:seed         # synthetic publishers, articles, users, highlights
npm run dev             # http://localhost:3000
```

Log in at `/giris` with a seeded email. The demo user is **`efe@infinics.xyz`**
(already has highlights, a journal, and overlap suggestions). The seed prints a
few more allowlisted emails.

Other scripts: `npm test` (Vitest), `npm run db:studio` (browse data),
`npm run db:reset` (wipe + reseed), `npm run build`.

## The underlining mechanism

The article text is **our own canonical content**, so highlights anchor with
exact integer offsets — no fuzzy matching, and **no rich-text editor**.

- **Content model** — each article is ordered `ArticleBlock`s of canonical,
  `NFC`-normalized plain text. A highlight is `{ blockId, startOffset, endOffset }`
  scoped to one block. Offsets are **UTF-16 code units** (what the DOM Range API
  uses), so capture/render/storage all agree. NFC is load-bearing for Turkish
  (ç ş ğ ı İ ö ü) — see `lib/highlights/offsets.ts`.
- **Capture** — the browser Selection API → walk the block's text nodes to a
  block-global offset → **snap to word boundaries** (`Intl.Segmenter('tr')` with a
  Unicode-regex fallback) so two readers grabbing different sub-spans of the same
  phrase produce identical offsets and therefore match.
- **Server re-validation** — `createHighlight` never trusts client offsets; it
  re-snaps against the canonical block text (`lib/actions/highlights.ts`).
- **Heatmap** — a boundary-sweep algorithm turns many overlapping ranges into
  non-overlapping segments tagged with distinct-user counts, shaded into discrete
  red bands (`lib/highlights/segmentation.ts`). Pure and unit-tested.
- **Discovery** — readers who underlined overlapping offsets in the same block
  are surfaced as follow suggestions (interval-overlap self-join in
  `lib/db/queries.ts`).

## Structure

```
app/
  page.tsx                         Home: subscribe block · billboard · rails · Club · category rails
  oku/[publisher]/[slug]/page.tsx  Reader (server heatmap) + <Annotator> client island
  alti-cizdiklerin/                My highlights + share-card composer
  gunlugun/                        Reading journal
  arsiv/ · en-cok-alti-cizilenler/ Browse + most-underlined ranking
  u/[userId]/ · yazar/[slug]/      Reader profile (+follow) · publisher
  ara/ · giris/                    Search · allowlist login
  api/quote-card/route.tsx         next/og PNG quote card (1080×1080)
lib/
  highlights/{offsets,segmentation}.ts   the underlining engine (unit-tested)
  db/queries.ts · actions/*               data access + server actions
  auth/session.ts                         iron-session allowlist auth
prisma/{schema.prisma,seed.ts}            data model + synthetic data
components/                                design system (dark · red · cream)
```

## Design tokens

Background `#101010`, Tuhaf red `#D9291C`, cream `#F4EDE2`. Headlines Playfair
Display Italic, body EB Garamond, labels/buttons Oswald.

## Notes & next steps

- **Auth** is a simple allowlist (enter a known email → session). Swap in
  magic-link/email delivery behind `lib/auth/session.ts` later.
- **Audio "Dinle"** ships the player UI; seeded `audioUrl` is null (shows
  "yakında") — wire narration/TTS later.
- **Avatars** are deterministic local SVGs (no network); drop real photos into
  `/public` and reference them later.
- **Database** is SQLite for zero-config dev; the schema is Postgres-portable
  (app-generated ids, no SQLite-only features) — switch the Prisma `provider`
  when you need concurrency/scale. Rendering can move to the CSS Custom Highlight
  API and highlights can support cross-block selections in a later phase.
