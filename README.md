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

## Social layer

The reading loop is social end to end:

- **Reactions** — tap "ben de" on any reader's underline (`HighlightReaction`,
  one per user per highlight). Counts surface on profiles and the feed; the
  author is notified. `components/ReactionButton.tsx`, `lib/actions/reactions.ts`.
- **Notes & discussion** — underline a sentence, then leave a note on it;
  others reply, forming a per-sentence thread. Notes anchor to the span
  `{ blockId, startOffset, endOffset }`, so everyone who underlined the same
  words shares one thread (`Note` self-relation for replies). Surfaced in the
  reader's **Tartışma** section and the highlight sheet.
  `components/notes/*`, `lib/actions/notes.ts`.
- **Activity feed (`/akis`)** — what the people you follow recently underlined,
  noted, and who they followed — merged and time-ordered (`getActivityFeed`).
- **Profiles & discovery** — follower/following lists (`/u/[id]/baglanti`) with
  follow buttons and a "seni takip ediyor" mutual badge; **`/kesfet`** ranks
  "senin gibi okuyanlar" by overlapping underlines; the journal shows reading
  **streaks** and earnable **badges** (`getReadingStats`).
- **Notifications** — the bell now carries `reaction` / `note` / `reply` /
  `follow` events with deep links.

## Structure

```
app/
  page.tsx                         Home: subscribe block · billboard · rails · Club · category rails
  oku/[publisher]/[slug]/page.tsx  Reader (server heatmap) + <Annotator> + Tartışma (notes)
  akis/                            Activity feed of people you follow
  alti-cizdiklerin/                My highlights + share-card composer
  gunlugun/                        Reading journal · streaks · badges
  arsiv/ · en-cok-alti-cizilenler/ Browse + most-underlined ranking
  kesfet/                          "Senin gibi okuyanlar" discovery
  u/[userId]/ · u/[userId]/baglanti/  Reader profile (+follow · reactions) · follower/following
  yazar/[slug]/                    Publisher
  ara/ · giris/                    Search · allowlist login
  api/quote-card/route.tsx         next/og PNG quote card (1080×1080)
lib/
  highlights/{offsets,segmentation}.ts   the underlining engine (unit-tested)
  db/queries.ts · actions/*               data access + server actions
  social-types.ts                         shared feed/note/reaction types
  auth/session.ts                         iron-session allowlist auth
prisma/{schema.prisma,seed.ts}            data model + synthetic data
components/                                design system (dark · red · cream)
```

## Profiles & onboarding

- Users and Club members have real **photos**: `Avatar` prefers an `image`
  (uploaded base64 data URL for users, `/club/<slug>.<ext>` for publishers) and
  falls back to the generated avatar. `ImagePicker` crops/downscales client-side.
- Profile fields: bio, age, gender, location, interests. First login routes to
  **onboarding** (`/hosgeldin`); editing reuses the same form at `/profil`.
- Drop Club photos into `public/club/<slug>.jpg` and reseed (see that folder's
  README). `yeni@tuhaf.test` is a fresh account that triggers onboarding.

## Admin dashboard (`/admin`)

Gated to users with `isAdmin` (the seed makes `efe@infinics.xyz` an admin; the
nav shows a "Yönetim Paneli" link for them).

- **İçerik** — list / create / edit / delete articles. The body is a plain
  textarea: blank line = new block, `#` = heading, `>` = blockquote; text is
  NFC-normalized into `ArticleBlock`s (the highlight coordinate system). Pick
  publisher + category, theme, status, billboard "live" toggle, dates.
- **Kategoriler** — CRUD the `Category` table that drives the content picker.
- **Seslendirme** — upload a voice recording (`POST /api/admin/audio` →
  `/public/audio`, admin-only) or paste an audio URL; stored as the article's
  `audioUrl`. (Local/persistent-disk hosts work as-is; on Vercel swap in blob
  storage.)
- **Genel Bakış** — analytics from a lightweight `Event` model: totals plus
  **most-opened / most-listened content** and a **click breakdown**. Tracking is
  fire-and-forget via `lib/track.ts` → `POST /api/track`: `open` on reader mount
  (`TrackOpen`), `listen` on first play (`AudioPlayer`), `click` on cards and
  billboard CTAs (`TrackedLink`). Seeded with synthetic events so it's populated.

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
