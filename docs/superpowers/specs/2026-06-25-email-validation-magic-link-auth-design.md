# Email-validation, magic-link login & optional password — design

Date: 2026-06-25
Status: approved (brainstorming), pre-implementation

## Goal

Let a new reader enter the system by self-signup: submit an email, receive a
validation email, and log in by clicking the link. On first login they may
optionally set a password (for faster future logins) and complete profile
onboarding. Magic link stays the primary login method forever; password is an
optional alternative.

## Decisions (locked)

1. **Open self-signup.** Anyone may submit an email. No allowlist. The
   existing invite-only `loginWithEmail` is removed.
2. **Magic-link primary, password optional.** Email magic link always works.
   A user MAY set a password at/after first login as a faster alternative.
   Both methods work indefinitely.
3. **Email via Resend** (`lib/email.ts`), with a dev fallback that logs the
   link to the server console when no API key is configured.
4. **Account created on link click, not on email submit.** Tokens are tied to
   an email, not a user row — avoids orphan unverified users and email
   enumeration. One unified "enter email → get link" path serves both signup
   and returning-user login.

## Data model (`prisma/schema.prisma`)

`User` gains two nullable, Postgres-portable fields:

```prisma
passwordHash  String?   // null = no password set; magic-link only
emailVerified DateTime? // set on first successful link click
```

New model:

```prisma
model LoginToken {
  id        String   @id @default(cuid())
  email     String                       // normalized lowercase
  tokenHash String   @unique             // sha256(rawToken) — raw never stored
  purpose   String   @default("login")   // 'login' | 'password_reset'
  expiresAt DateTime
  usedAt    DateTime?                     // single-use; set when consumed
  createdAt DateTime @default(now())

  @@index([email])
  @@index([expiresAt])
}
```

`purpose` is included now for a future password-reset flow; only `'login'` is
used in this iteration.

## Flow

### Request a link (`/giris`, magic-link path)

1. User submits email. Normalize: `trim().toLowerCase()`. Validate it contains
   `@`.
2. Resend cooldown: reject if an unexpired token for this email was created
   < 60 s ago (soft "az önce yolladık" message).
3. `rawToken = randomBytes(32).toString("hex")`. Store a `LoginToken` row with
   `tokenHash = sha256(rawToken)`, `expiresAt = now + 30 min`.
4. Mail link: `${APP_URL}/giris/dogrula?token=${rawToken}`.
5. Always show the same confirmation screen ("Sana bir bağlantı yolladık")
   regardless of whether the email already has an account.

### Consume a link (`app/giris/dogrula/route.ts`)

1. Look up token by `sha256(query.token)`. If missing / `usedAt != null` /
   `expiresAt < now` → render a friendly "bağlantı geçersiz" page with a
   "yeni bağlantı iste" action.
2. Mark `usedAt = now`.
3. Find `User` by token email:
   - exists → that user.
   - none → `prisma.user.create({ onboarded:false, emailVerified:now, ... })`
     with sensible defaults (`displayName` derived from email local-part,
     `avatarSeed = email`).
4. If `user.emailVerified` is null, set it now.
5. Set session (`session.userId = user.id; save()`).
6. Redirect: `user.onboarded ? "/" : "/hosgeldin"`.

### Password login (`/giris`, password path)

- Toggle "Şifremle gir" reveals a password field; button becomes "Giriş yap".
- Look up user by email. If found and `passwordHash` set and
  `verifyPassword(input, hash)` → set session, redirect (`onboarded` rule).
- Otherwise soft error + offer to send a magic link instead. Never reveal
  whether the email exists or whether a password is set (same generic copy).

## Password handling (`lib/auth/password.ts`)

- `node:crypto` **scrypt** — zero new dependencies, no native build.
- `hashPassword(plain)`: `salt = randomBytes(16)`, `key = scryptSync(plain,
  salt, 64)`, store `scrypt$<saltHex>$<keyHex>`.
- `verifyPassword(plain, stored)`: recompute, compare with `timingSafeEqual`.
- Min length 8 enforced at the action layer.

## Token helpers (`lib/auth/tokens.ts`)

- `hashToken(raw)` → `crypto.createHash("sha256").update(raw).digest("hex")`.
- `issueLoginToken(email)` → creates row (with cooldown check), returns raw token.
- `consumeLoginToken(raw)` → validates + marks used, returns `{ email }` or null.

## Email (`lib/email.ts`)

- `sendLoginLink(to, url)`: if `RESEND_API_KEY` set → `resend.emails.send({
  from: process.env.EMAIL_FROM, to, subject, html })`. Else → `console.log` the
  url (dev). Returns `{ ok }`; send failure surfaces as an action error while
  the token stays valid for retry.
- Minimal branded HTML (Turkish copy, Tuhaf Club tone).

## Onboarding (`/hosgeldin`)

Already functional (`saveProfile` sets `onboarded:true`). Changes:

- `ProfileForm` gains an optional password field (onboarding mode + profile
  mode), via a shared `components/PasswordField.tsx`.
- `saveProfile` accepts optional `password`; when non-empty (and ≥ 8 chars),
  hash → `passwordHash`. Empty → leave unchanged (stays magic-link only).
- `/profil` exposes the same field so users who skipped can add/change a
  password later.

## Files

**New**
- `lib/email.ts` — Resend sender + console fallback.
- `lib/auth/tokens.ts` — issue / consume / hash login tokens.
- `lib/auth/password.ts` — scrypt hash / verify.
- `app/giris/dogrula/route.ts` — token landing (GET).
- `components/PasswordField.tsx` — shared optional-password input.

**Changed**
- `prisma/schema.prisma` — `User.passwordHash`, `User.emailVerified`, `LoginToken`.
- `lib/auth/session.ts` — drop `loginWithEmail`; add `createOrLoginByEmail(email)`.
- `lib/actions/auth.ts` — `requestLoginLinkAction`, `passwordLoginAction`;
  remove old `loginAction`.
- `components/LoginForm.tsx` — dual path (link default, password toggle) + sent state.
- `app/giris/page.tsx` — drop demo-email hint.
- `lib/actions/profile.ts` — accept optional `password`.
- `components/ProfileForm.tsx` — render `PasswordField`.
- `prisma/seed.ts` — drop allowlist framing; keep demo users (now just
  pre-existing accounts that can request links / set passwords).
- `.env` / `.env.example` — `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`.

## Edge cases

- Already-logged-in user hits `/giris` or `/giris/dogrula` → redirect `/`.
- No Resend key (dev) → link logged to console; flow fully usable locally.
- Email send failure → action error, token remains valid for retry.
- Expired / used / unknown token → friendly page, request-new-link action.
- `npm run db:reset` wipes `LoginToken` along with everything else (fine).
- Stale session cookie after reseed → already handled by `getCurrentUser`
  (reads as logged-out).

## Out of scope (this iteration)

- Password reset flow (model supports it via `purpose`, UI deferred).
- Rate limiting beyond the 60 s resend cooldown.
- Email-change / re-verification flow.
- Admin invite UI (self-signup only for now).

## Testing

- `lib/auth/password.test.ts` — hash round-trips; wrong password fails;
  malformed stored value fails safely.
- `lib/auth/tokens.test.ts` — issue→consume happy path; expired rejected;
  reused (usedAt set) rejected; unknown token rejected; cooldown enforced.
- Token/password helpers are pure-ish (DB via Prisma) — unit-test the crypto
  helpers directly; token DB tests can use the dev SQLite or be kept thin.
