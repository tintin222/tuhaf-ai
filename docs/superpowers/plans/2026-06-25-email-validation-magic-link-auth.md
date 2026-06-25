# Email-validation, magic-link login & optional password — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a reader self-sign-up by email, log in via a mailed magic link, optionally set a password during onboarding, and complete their profile.

**Architecture:** A `LoginToken` table holds sha256-hashed, single-use, 30-min tokens tied to an email. Submitting an email on `/giris` mails a link; clicking it (`/giris/dogrula`) finds-or-creates the user and sets the iron-session cookie, then routes to onboarding or home. Password is an optional scrypt hash on `User`, set in onboarding/profile, usable as a faster login alternative. Magic link stays primary forever.

**Tech Stack:** Next.js 15 (App Router), Prisma + SQLite (Postgres-portable), iron-session, `node:crypto` scrypt (no new crypto dep), Resend (only new dependency) for email.

## Global Constraints

- Next.js 15 App Router; `searchParams` and `cookies()` are async (await them).
- Prisma schema stays Postgres-portable: app-generated `cuid` IDs, no SQLite-only features, `DateTime` timestamps.
- Only ONE new dependency allowed: `resend`. Passwords use `node:crypto` scrypt — no bcrypt/argon2.
- All user-facing copy in Turkish, matching existing Tuhaf Club tone.
- Token: 32-byte CSPRNG raw, stored only as `sha256` hex, single-use (`usedAt`), 30-min expiry, 60-second resend cooldown.
- Password: minimum 8 characters, stored as `scrypt$<saltHex>$<keyHex>`.
- Raw token only appears in the email URL; never store or log it except the dev console fallback.
- Tests are `*.test.ts`, `environment: node` (existing `vitest.config.ts`). Run with `npm test`.
- Session cookie is set via `cookies()`/iron-session; in route handlers pair it with `redirect()` from `next/navigation` (NOT `NextResponse.redirect`, which would drop the Set-Cookie).

---

### Task 1: Schema — passwordHash, emailVerified, LoginToken

**Files:**
- Modify: `prisma/schema.prisma` (User model + new model + docstring)
- Test: `prisma/schema.test.ts`

**Interfaces:**
- Produces: `prisma.loginToken` Prisma delegate; `User.passwordHash: string | null`; `User.emailVerified: Date | null`.

- [ ] **Step 1: Write the failing test**

```ts
// prisma/schema.test.ts
import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";

describe("schema", () => {
  it("exposes the LoginToken model", () => {
    expect(typeof prisma.loginToken.create).toBe("function");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- prisma/schema.test.ts`
Expected: FAIL — `prisma.loginToken` is undefined (model/client not generated yet).

- [ ] **Step 3: Edit the schema**

In `prisma/schema.prisma`, update the `User` docstring and add two fields after `interests`:

```prisma
/// A reader. Auth: passwordless email magic-link, with an optional password.
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  displayName   String
  avatarSeed    String
  image         String?
  bio           String?
  age           Int?
  gender        String?
  location      String?
  interests     String    @default("[]")
  passwordHash  String?   // null = no password set; magic-link only
  emailVerified DateTime? // set on first successful magic-link click
  onboarded     Boolean   @default(false)
  isAdmin       Boolean   @default(false)
  createdAt     DateTime  @default(now())
  // ...keep all existing relations unchanged...
```

Add this new model after `User`:

```prisma
/// A single-use, expiring magic-link / verification token, tied to an email.
/// Only the sha256 hash of the raw token is stored.
model LoginToken {
  id        String    @id @default(cuid())
  email     String    // normalized lowercase
  tokenHash String    @unique // sha256(rawToken)
  purpose   String    @default("login") // 'login' | 'password_reset'
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([email])
  @@index([expiresAt])
}
```

- [ ] **Step 4: Push schema and regenerate client**

Run: `npm run db:push && npx prisma generate`
Expected: "Your database is now in sync" + "Generated Prisma Client".

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- prisma/schema.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/schema.test.ts
git commit -m "Add passwordHash, emailVerified, and LoginToken to schema"
```

---

### Task 2: Password hashing (`lib/auth/password.ts`)

**Files:**
- Create: `lib/auth/password.ts`
- Test: `lib/auth/password.test.ts`

**Interfaces:**
- Produces: `hashPassword(plain: string): string`; `verifyPassword(plain: string, stored: string): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/auth/password.test.ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("verifies a correct password round-trip", () => {
    const stored = hashPassword("correct horse");
    expect(verifyPassword("correct horse", stored)).toBe(true);
  });
  it("rejects a wrong password", () => {
    const stored = hashPassword("correct horse");
    expect(verifyPassword("wrong", stored)).toBe(false);
  });
  it("produces distinct hashes for the same input (random salt)", () => {
    expect(hashPassword("a")).not.toBe(hashPassword("a"));
  });
  it("fails safely on a malformed stored value", () => {
    expect(verifyPassword("x", "garbage")).toBe(false);
    expect(verifyPassword("x", "scrypt$zz$zz")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/auth/password.test.ts`
Expected: FAIL — cannot find module `./password`.

- [ ] **Step 3: Implement**

```ts
// lib/auth/password.ts
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;

/** Hash a plaintext password as `scrypt$<saltHex>$<keyHex>`. */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(plain, salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

/** Constant-time verify against a stored `scrypt$...` value. */
export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  if (salt.length === 0 || expected.length !== KEYLEN) return false;
  const actual = scryptSync(plain, salt, KEYLEN);
  return timingSafeEqual(actual, expected);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/auth/password.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/auth/password.ts lib/auth/password.test.ts
git commit -m "Add scrypt password hashing helpers"
```

---

### Task 3: Login tokens (`lib/auth/tokens.ts`)

**Files:**
- Create: `lib/auth/tokens.ts`
- Test: `lib/auth/tokens.test.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/db`.
- Produces: `hashToken(raw: string): string`; `isTokenValid(row, now: Date): boolean`; `issueLoginToken(email: string): Promise<string | null>` (null on cooldown); `consumeLoginToken(raw: string): Promise<string | null>` (email on success); constants `TOKEN_TTL_MS`, `RESEND_COOLDOWN_MS`.

- [ ] **Step 1: Write the failing test** (pure helpers only — DB wrappers verified in Task 10 manual e2e)

```ts
// lib/auth/tokens.test.ts
import { describe, it, expect } from "vitest";
import { hashToken, isTokenValid } from "./tokens";

describe("hashToken", () => {
  it("is deterministic and 64 hex chars", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("differs for different inputs", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });
});

describe("isTokenValid", () => {
  const now = new Date("2026-06-25T12:00:00Z");
  const future = new Date("2026-06-25T12:20:00Z");
  const past = new Date("2026-06-25T11:00:00Z");
  it("accepts an unused, unexpired token", () => {
    expect(isTokenValid({ usedAt: null, expiresAt: future }, now)).toBe(true);
  });
  it("rejects null, used, and expired tokens", () => {
    expect(isTokenValid(null, now)).toBe(false);
    expect(isTokenValid({ usedAt: now, expiresAt: future }, now)).toBe(false);
    expect(isTokenValid({ usedAt: null, expiresAt: past }, now)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/auth/tokens.test.ts`
Expected: FAIL — cannot find module `./tokens`.

- [ ] **Step 3: Implement**

```ts
// lib/auth/tokens.ts
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export const TOKEN_TTL_MS = 30 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export type TokenRow = { usedAt: Date | null; expiresAt: Date };

/** Pure validity check: unused and not past expiry. */
export function isTokenValid(row: TokenRow | null, now: Date): boolean {
  if (!row) return false;
  if (row.usedAt) return false;
  return row.expiresAt.getTime() > now.getTime();
}

/** Issue a login token for an email. Returns the raw token, or null if a
 *  non-expired token was issued within the resend cooldown. */
export async function issueLoginToken(email: string): Promise<string | null> {
  const recent = await prisma.loginToken.findFirst({
    where: { email, purpose: "login", usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return null;
  }
  const raw = randomBytes(32).toString("hex");
  await prisma.loginToken.create({
    data: {
      email,
      tokenHash: hashToken(raw),
      purpose: "login",
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });
  return raw;
}

/** Validate and single-use-consume a raw token. Returns the email or null. */
export async function consumeLoginToken(raw: string): Promise<string | null> {
  const row = await prisma.loginToken.findUnique({
    where: { tokenHash: hashToken(raw) },
  });
  if (!isTokenValid(row, new Date())) return null;
  await prisma.loginToken.update({
    where: { id: row!.id },
    data: { usedAt: new Date() },
  });
  return row!.email;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/auth/tokens.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/auth/tokens.ts lib/auth/tokens.test.ts
git commit -m "Add login token issue/consume helpers"
```

---

### Task 4: Email sender (`lib/email.ts`) + install Resend

**Files:**
- Create: `lib/email.ts`
- Test: `lib/email.test.ts`
- Modify: `package.json` (adds `resend` dependency via install)

**Interfaces:**
- Produces: `sendLoginLink(to: string, url: string): Promise<{ ok: boolean }>`.

- [ ] **Step 1: Install Resend**

Run: `npm install resend`
Expected: `resend` added to `dependencies`.

- [ ] **Step 2: Write the failing test** (dev fallback branch — no real network)

```ts
// lib/email.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendLoginLink } from "./email";

describe("sendLoginLink (no API key → console fallback)", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
  });
  it("logs the link and reports ok", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await sendLoginLink("a@b.com", "http://x/giris/dogrula?token=t");
    expect(res.ok).toBe(true);
    expect(spy.mock.calls.flat().join(" ")).toContain("http://x/giris/dogrula?token=t");
    spy.mockRestore();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- lib/email.test.ts`
Expected: FAIL — cannot find module `./email`.

- [ ] **Step 4: Implement**

```ts
// lib/email.ts
import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "Tuhaf Club <onboarding@resend.dev>";

/** Send a magic-link email. With no RESEND_API_KEY (dev), logs the link to the
 *  server console so local sign-in still works end-to-end. */
export async function sendLoginLink(to: string, url: string): Promise<{ ok: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n[Tuhaf Club giriş bağlantısı] → ${to}\n${url}\n`);
    return { ok: true };
  }
  try {
    const resend = new Resend(key);
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Tuhaf Club giriş bağlantın",
      html: loginEmailHtml(url),
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

function loginEmailHtml(url: string): string {
  return `
  <div style="font-family:Georgia,serif;background:#0f0d0c;color:#f4 efe6;padding:32px;max-width:480px;margin:0 auto">
    <h1 style="font-style:italic;color:#f4efe6;margin:0 0 12px">Tuhaf Club'a gir.</h1>
    <p style="color:#cfc7bd;line-height:1.5">Aşağıdaki bağlantıya tıklayarak giriş yap. Bağlantı 30 dakika geçerli ve yalnızca bir kez kullanılabilir.</p>
    <p style="margin:24px 0">
      <a href="${url}" style="background:#D9291C;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;display:inline-block;letter-spacing:.05em">Giriş yap</a>
    </p>
    <p style="color:#8a847c;font-size:13px">Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.</p>
  </div>`;
}
```

> Note: fix the obvious typo when implementing — `#f4 efe6` must be `#f4efe6` (it is split here only to avoid a copy artifact). Verify the rendered hex has no space.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- lib/email.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/email.ts lib/email.test.ts package.json package-lock.json
git commit -m "Add Resend email sender with dev console fallback"
```

---

### Task 5: Session — createOrLoginByEmail, drop allowlist login

**Files:**
- Modify: `lib/auth/session.ts`
- Test: `lib/auth/session.test.ts`

**Interfaces:**
- Consumes: `prisma`, `getSession` (existing in this file).
- Produces: `newUserDefaults(email: string): { email; displayName; avatarSeed; onboarded; emailVerified }`; `createOrLoginByEmail(email: string): Promise<User>`.
- Removes: `loginWithEmail` (replaced).

- [ ] **Step 1: Write the failing test** (pure `newUserDefaults` only)

```ts
// lib/auth/session.test.ts
import { describe, it, expect } from "vitest";
import { newUserDefaults } from "./session";

describe("newUserDefaults", () => {
  it("derives a display name from the email local-part", () => {
    const d = newUserDefaults("ada.lovelace@x.com");
    expect(d.displayName).toBe("ada lovelace");
    expect(d.avatarSeed).toBe("ada.lovelace@x.com");
    expect(d.onboarded).toBe(false);
    expect(d.emailVerified).toBeInstanceOf(Date);
  });
  it("falls back to 'Okur' when local-part is empty after cleanup", () => {
    expect(newUserDefaults("___@x.com").displayName).toBe("Okur");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/auth/session.test.ts`
Expected: FAIL — `newUserDefaults` is not exported.

- [ ] **Step 3: Edit `lib/auth/session.ts`**

Delete the `loginWithEmail` function (lines ~42-52) and its allowlist doc comment. Add:

```ts
/** Default columns for a brand-new self-signup user (email already normalized). */
export function newUserDefaults(email: string) {
  const local = email.split("@")[0] ?? email;
  const displayName = local.replace(/[._\-]+/g, " ").trim() || "Okur";
  return {
    email,
    displayName,
    avatarSeed: email,
    onboarded: false,
    emailVerified: new Date(),
  };
}

/** Find-or-create a user by (already-normalized) email, then set the session
 *  cookie. Used by the magic-link verify route. */
export async function createOrLoginByEmail(email: string) {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: newUserDefaults(email) });
  } else if (!user.emailVerified) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  }
  const session = await getSession();
  session.userId = user.id;
  await session.save();
  return user;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/auth/session.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/auth/session.ts lib/auth/session.test.ts
git commit -m "Replace allowlist login with createOrLoginByEmail"
```

---

### Task 6: Auth server actions (magic-link + password)

**Files:**
- Modify: `lib/actions/auth.ts`
- Test: `lib/actions/auth.test.ts`

**Interfaces:**
- Consumes: `prisma`, `getSession`, `logout`, `issueLoginToken`, `verifyPassword`, `sendLoginLink`.
- Produces: `normalizeEmail(raw: string): string`; `AuthState = { sent?: boolean; error?: string }`; `authAction(prev, formData): Promise<AuthState>`. Keeps existing `logoutAction`, `subscribeAction`.
- Removes: `loginAction`, `LoginState`.

- [ ] **Step 1: Write the failing test** (pure `normalizeEmail`)

```ts
// lib/actions/auth.test.ts
import { describe, it, expect } from "vitest";
import { normalizeEmail } from "./auth";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Efe@Infinics.XYZ ")).toBe("efe@infinics.xyz");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/actions/auth.test.ts`
Expected: FAIL — `normalizeEmail` not exported.

- [ ] **Step 3: Rewrite `lib/actions/auth.ts`**

Replace `loginAction`/`LoginState` with the magic-link + password action. Keep `logoutAction` and `subscribeAction` exactly as they are.

```ts
"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession, logout } from "@/lib/auth/session";
import { issueLoginToken } from "@/lib/auth/tokens";
import { verifyPassword } from "@/lib/auth/password";
import { sendLoginLink } from "@/lib/email";

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export type AuthState = { sent?: boolean; error?: string };

/** Single login action. If a password is supplied, attempt password login;
 *  otherwise issue + mail a magic link. Never reveals whether an account or
 *  password exists. */
export async function authAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!email.includes("@")) return { error: "Geçerli bir e-posta gir." };

  // Password path — only when one was actually typed.
  if (password) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user?.passwordHash && verifyPassword(password, user.passwordHash)) {
      const session = await getSession();
      session.userId = user.id;
      await session.save();
      redirect(user.onboarded ? "/" : "/hosgeldin");
    }
    return {
      error: "E-posta veya şifre hatalı. İstersen sana giriş bağlantısı yollayalım.",
    };
  }

  // Magic-link path. Cooldown (null token) is treated as success — same screen.
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const raw = await issueLoginToken(email);
  if (raw) {
    await sendLoginLink(email, `${appUrl}/giris/dogrula?token=${raw}`);
  }
  return { sent: true };
}

// --- keep below unchanged ---
export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/giris");
}

export type SubscribeState = { ok?: boolean; error?: string };

export async function subscribeAction(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Geçerli bir e-posta gir." };
  }
  await prisma.emailSubscription.upsert({
    where: { email },
    create: { email, status: "confirmed" },
    update: { status: "confirmed" },
  });
  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/actions/auth.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/auth.ts lib/actions/auth.test.ts
git commit -m "Add magic-link + password login action"
```

---

### Task 7: Verify route (`app/giris/dogrula/route.ts`)

**Files:**
- Create: `app/giris/dogrula/route.ts`

**Interfaces:**
- Consumes: `consumeLoginToken`, `createOrLoginByEmail`, `getCurrentUser`.
- Produces: a GET route handler that logs the user in and redirects.

- [ ] **Step 1: Implement** (route handlers are integration-verified in Task 10; no unit test)

```ts
// app/giris/dogrula/route.ts
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { consumeLoginToken } from "@/lib/auth/tokens";
import { createOrLoginByEmail, getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (await getCurrentUser()) redirect("/");

  const token = req.nextUrl.searchParams.get("token");
  if (!token) redirect("/giris?error=invalid-link");

  const email = await consumeLoginToken(token);
  if (!email) redirect("/giris?error=invalid-link");

  const user = await createOrLoginByEmail(email);
  redirect(user.onboarded ? "/" : "/hosgeldin");
}
```

> `redirect()` throws `NEXT_REDIRECT`; the cookie set by `createOrLoginByEmail` via `cookies()` rides along on the redirect response. Do NOT switch to `NextResponse.redirect`.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/giris/dogrula/route.ts
git commit -m "Add magic-link verify route"
```

---

### Task 8: Login form + page (dual path, sent state, error banner)

**Files:**
- Modify: `components/LoginForm.tsx`
- Modify: `app/giris/page.tsx`

**Interfaces:**
- Consumes: `authAction`, `AuthState` from `@/lib/actions/auth`.

- [ ] **Step 1: Rewrite `components/LoginForm.tsx`**

```tsx
"use client";

import { useActionState, useState } from "react";
import { authAction, type AuthState } from "@/lib/actions/auth";

const inputClass =
  "rounded-lg bg-ink-card px-5 py-4 font-body text-lg text-cream placeholder:text-cream-faint focus:outline-none focus:ring-2 focus:ring-red";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    authAction,
    {},
  );
  const [showPw, setShowPw] = useState(false);

  if (state.sent) {
    return (
      <div className="mt-8 rounded-lg border border-white/15 bg-ink-card px-5 py-6">
        <p className="font-body text-lg text-cream">
          Sana bir giriş bağlantısı yolladık.
        </p>
        <p className="mt-2 font-body text-sm text-cream-dim">
          Mailini kontrol et. Bağlantı 30 dakika geçerli.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-3">
      <input
        type="email"
        name="email"
        required
        autoFocus
        placeholder="email@adresin.com"
        className={inputClass}
      />
      {showPw && (
        <input
          type="password"
          name="password"
          minLength={8}
          placeholder="Şifren"
          autoComplete="current-password"
          className={inputClass}
        />
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-red px-8 py-4 font-label text-sm uppercase tracking-[0.18em] text-cream hover:bg-red-dark disabled:opacity-60"
      >
        {pending ? "..." : showPw ? "Giriş yap" : "Giriş bağlantısı yolla"}
      </button>
      <button
        type="button"
        onClick={() => setShowPw((v) => !v)}
        className="self-start font-label text-[11px] uppercase tracking-[0.15em] text-cream-faint hover:text-red"
      >
        {showPw ? "E-posta bağlantısıyla gir" : "Şifren varsa şifrenle gir"}
      </button>
      {state.error && (
        <p className="font-body text-sm text-red">{state.error}</p>
      )}
    </form>
  );
}
```

> Behavior note: if the password field is visible but left empty, the submit takes the magic-link path (empty password = no password supplied). This is intentional.

- [ ] **Step 2: Update `app/giris/page.tsx`** (open-signup copy, drop demo hint, show error banner)

```tsx
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-16">
      <h1 className="font-display text-4xl font-900 italic leading-tight text-cream">
        Tuhaf Club’a gir.
      </h1>
      <p className="mt-4 font-body text-lg text-cream-dim">
        E-postanı gir; sana bir giriş bağlantısı yollayalım. İlk kez geliyorsan
        hesabın o bağlantıyla oluşur.
      </p>

      {error === "invalid-link" && (
        <p className="mt-4 rounded-lg border border-red/40 bg-red/10 px-4 py-3 font-body text-sm text-red">
          Bağlantı geçersiz veya süresi dolmuş. Aşağıdan yeni bir tane iste.
        </p>
      )}

      <LoginForm />
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/LoginForm.tsx app/giris/page.tsx
git commit -m "Dual-path login form: magic link + optional password"
```

---

### Task 9: Optional password in onboarding & profile

**Files:**
- Create: `components/PasswordField.tsx`
- Modify: `lib/actions/profile.ts` (`ProfileInput` + `saveProfile`)
- Modify: `components/ProfileForm.tsx`

**Interfaces:**
- Consumes: `hashPassword` from `@/lib/auth/password`.
- Produces: `ProfileInput` gains `password?: string`; `<PasswordField value onChange label hint />`.

- [ ] **Step 1: Create `components/PasswordField.tsx`**

```tsx
"use client";

export function PasswordField({
  value,
  onChange,
  label,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  hint: string;
}) {
  return (
    <div>
      <label className="mb-2 block font-label text-[11px] uppercase tracking-[0.15em] text-cream-dim">
        {label}
      </label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={8}
        autoComplete="new-password"
        placeholder="••••••••"
        className="w-full rounded-lg border border-white/15 bg-ink px-3 py-2.5 font-body text-base text-cream placeholder:text-cream-faint focus:border-red focus:outline-none"
      />
      <p className="mt-1 font-body text-xs text-cream-faint">{hint}</p>
    </div>
  );
}
```

- [ ] **Step 2: Update `lib/actions/profile.ts`**

Add the import, extend `ProfileInput`, and conditionally set `passwordHash`:

```ts
import { hashPassword } from "@/lib/auth/password";
```

Add to `ProfileInput`:

```ts
  password?: string; // optional; when >=8 chars, sets/updates the password
```

Replace the `prisma.user.update` call with a version that conditionally includes `passwordHash`:

```ts
  if (input.password && input.password.length > 0 && input.password.length < 8) {
    return { ok: false, error: "Şifre en az 8 karakter olmalı." };
  }

  const data: Record<string, unknown> = {
    displayName,
    image: input.image,
    bio: input.bio.trim() || null,
    age,
    gender: input.gender || null,
    location: input.location.trim() || null,
    interests: JSON.stringify(interests),
    onboarded: true,
  };
  if (input.password && input.password.length >= 8) {
    data.passwordHash = hashPassword(input.password);
  }

  await prisma.user.update({ where: { id: user.id }, data });
```

- [ ] **Step 3: Update `components/ProfileForm.tsx`**

Add the import and password state, render the field before the submit button, and pass it into `saveProfile`.

```tsx
import { PasswordField } from "@/components/PasswordField";
```

Add state near the other `useState` calls:

```tsx
  const [password, setPassword] = useState("");
```

Pass into the `saveProfile` call (add the property):

```tsx
        interests,
        password: password || undefined,
```

Render before the submit `<button>` (inside the form):

```tsx
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
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/PasswordField.tsx lib/actions/profile.ts components/ProfileForm.tsx
git commit -m "Add optional password field to onboarding and profile"
```

---

### Task 10: Env, seed cleanup, and full end-to-end verification

**Files:**
- Create: `.env.example`
- Modify: `.env` (append keys)
- Modify: `prisma/seed.ts` (drop allowlist framing in comments/copy)

- [ ] **Step 1: Add env keys**

Append to `.env`:

```
# Magic-link email (Resend). Leave RESEND_API_KEY empty in dev → links print to the server console.
RESEND_API_KEY=""
EMAIL_FROM="Tuhaf Club <onboarding@resend.dev>"
APP_URL="http://localhost:3000"
```

Create `.env.example` with the same keys plus the existing two (no secret values):

```
DATABASE_URL="file:./dev.db"
SESSION_SECRET="change-me-min-32-characters-long-please"
RESEND_API_KEY=""
EMAIL_FROM="Tuhaf Club <onboarding@resend.dev>"
APP_URL="http://localhost:3000"
```

- [ ] **Step 2: Drop allowlist framing in `prisma/seed.ts`**

Find the comment near the demo-user creation that frames auth as an allowlist / "davetli" and reword to reflect open signup (these seeded users are just pre-existing accounts). Update the `console.log` on/near line 313 if it references invite/allowlist. No data shape changes.

- [ ] **Step 3: Full test + type-check**

Run: `npm test && npx tsc --noEmit`
Expected: all tests PASS, no type errors.

- [ ] **Step 4: Manual end-to-end (dev, no Resend key)**

Run: `npm run dev`

Verify each:
1. Visit `/giris`, enter a NEW email (e.g. `newreader@test.com`), submit → "Sana bir giriş bağlantısı yolladık" screen; the link prints in the dev server console.
2. Open the console link → lands on `/hosgeldin` (new account, not onboarded).
3. Fill onboarding incl. a password (≥8 chars) → submit → lands on `/`.
4. Log out (existing logout) → `/giris`.
5. Click "Şifren varsa şifrenle gir", enter same email + password → logs straight in.
6. Log out; request a magic link for the SAME email → console link → lands on `/` (already onboarded).
7. Visit a tampered/old link `/giris/dogrula?token=bogus` → redirected to `/giris` with the "Bağlantı geçersiz" banner.
8. Submit the same email twice within 60s → second still shows the sent screen, but no second link prints (cooldown).

- [ ] **Step 5: Commit**

```bash
git add .env.example prisma/seed.ts
git commit -m "Add email env keys and drop allowlist framing from seed"
```

---

## Self-Review

**Spec coverage:**
- Self-signup → Tasks 6, 7 (issue link, create-on-click). ✓
- Validation email → Task 4. ✓
- Magic-link login → Tasks 3, 6, 7. ✓
- Optional password (set + login) → Tasks 2, 6, 9. ✓
- Onboarding at first registration → Task 7 redirect + existing `/hosgeldin` + Task 9 password. ✓
- Schema (passwordHash, emailVerified, LoginToken) → Task 1. ✓
- Security (sha256 hash, single-use, expiry, cooldown, scrypt) → Tasks 1-3, 2. ✓
- Drop allowlist → Tasks 5, 8, 10. ✓
- Resend + console fallback → Task 4. ✓
- Edge cases (logged-in redirect, invalid token, send failure) → Tasks 6, 7. ✓

**Type consistency:** `AuthState`, `authAction`, `normalizeEmail`, `createOrLoginByEmail`, `newUserDefaults`, `issueLoginToken`/`consumeLoginToken`/`hashToken`/`isTokenValid`, `hashPassword`/`verifyPassword`, `sendLoginLink`, `ProfileInput.password`, `PasswordField` props — names match across producing and consuming tasks. ✓

**Placeholder scan:** No TBD/TODO. The one deliberate copy-artifact (`#f4 efe6`) is flagged with an explicit fix instruction in Task 4. ✓

**Note on DB-touching code:** `issueLoginToken`, `consumeLoginToken`, `createOrLoginByEmail`, and the two server actions are verified by the Task 10 manual e2e rather than unit tests (they require DB + cookies/session). Pure helpers extracted from each are unit-tested.
