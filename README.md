# Valerie — Multimodal AI Assistant

A Claude-style chat app with vision uploads, native AI image generation, Google sign-in,
message metering, an admin bypass, and Stripe billing — built on **Supabase** (auth +
Postgres) and Prisma, fully independent of any third-party backend builder.

## Architecture

```
valerie-ai/
├── prisma/
│   └── schema.prisma          # User (profile), ChatSession, Message models
├── src/
│   ├── middleware.ts           # Refreshes the Supabase session cookie on every request
│   ├── app/
│   │   ├── page.tsx             # Client-side Supabase auth gate -> AppShell
│   │   ├── layout.tsx
│   │   ├── auth/callback/route.ts   # Exchanges Supabase's OAuth `code` for a session
│   │   └── api/
│   │       ├── chat/route.ts                 # Streaming text/vision chat + inline /image
│   │       ├── image/route.ts                # Dedicated image-generation endpoint
│   │       ├── sessions/route.ts              # List/create chats
│   │       ├── sessions/[id]/route.ts         # Get/rename/delete a chat
│   │       ├── messages/usage/route.ts        # Usage/paywall status for the UI
│   │       └── billing/checkout/route.ts      # Stripe Checkout session
│   │       └── billing/webhook/route.ts       # Stripe webhook -> sync subscription
│   ├── components/
│   │   ├── AppShell.tsx        # Wires sidebar + chat window + paywall together
│   │   ├── Sidebar.tsx         # Chat list, usage indicator, sign-out (Supabase)
│   │   ├── ChatWindow.tsx      # Message list, streaming, uploads, image mode, settings
│   │   ├── MessageBubble.tsx   # Markdown + syntax highlighting + copy + image display
│   │   └── PaywallModal.tsx    # 402 upgrade modal
│   └── lib/
│       ├── db.ts               # Prisma client singleton
│       ├── supabase/client.ts  # Browser-side Supabase client
│       ├── supabase/server.ts  # Server-side Supabase client + getCurrentUser()
│       ├── admin.ts            # ADMIN_EMAILS whitelist check (single source of truth)
│       ├── rateLimit.ts        # 40-message free cap + admin/pro bypass
│       ├── anthropic.ts        # Claude streaming completions (text + vision)
│       ├── imageGen.ts         # DALL-E 3 image generation
│       └── stripe.ts           # Stripe client + customer helper
```

### How auth works now

Supabase Auth owns sign-up, sessions, and Google OAuth in its own `auth.users` table —
we never touch that table directly. Our Prisma `User` model is a **profile** row in the
`public` schema, one-to-one with a Supabase auth user, sharing the same UUID.

`getCurrentUser()` (in `src/lib/supabase/server.ts`) is the one function every API route
calls to identify the caller. It verifies the Supabase session, then upserts the matching
profile row (creating it on first request) and computes `isAdmin` fresh from
`ADMIN_EMAILS` every time — so there's no migration step to promote/demote an admin.

**Sign-in flow:** `page.tsx` calls `supabase.auth.signInWithOAuth({ provider: "google" })`
→ Google → Supabase → redirects to `/auth/callback?code=...` → that route exchanges the
code for a session (sets cookies) → redirects back to `/`. `middleware.ts` keeps that
session cookie refreshed on every subsequent request.

**Admin bypass:** unchanged in spirit — any signed-in user whose email is in
`ADMIN_EMAILS` (comma-separated) always passes `checkUsage()`, regardless of
`messageCount`. `wxwrobjustice@gmail.com` is the default in `.env.example`.

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → New project (free tier).
2. **Authentication → Providers → Google**: enable it, and fill in a Google OAuth
   Client ID/Secret from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (Web application type). Supabase's provider page shows you the exact redirect URI to
   register with Google — it looks like
   `https://xxxxxxxxxxxx.supabase.co/auth/v1/callback`.
3. **Authentication → URL Configuration**: set Site URL to `http://localhost:3000` for
   now (you'll add your Vercel URL later), and add
   `http://localhost:3000/auth/callback` under Redirect URLs.
4. **Project Settings → API**: copy the Project URL and `anon` public key into
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. **Project Settings → Database → Connection string**: copy the pooled ("Transaction
   mode", port 6543) string into `DATABASE_URL`, and the direct (port 5432) string into
   `DIRECT_URL`. Both go in `.env`.

## 2. Local setup

```bash
npm install
cp .env.example .env   # fill in the values from step 1, plus your AI/Stripe keys
npm run db:push        # creates User/ChatSession/Message tables in your Supabase DB
npm run dev
```

Visit http://localhost:3000 and sign in with Google.

### Getting the remaining API keys

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) (DALL·E 3 image generation) |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | [dashboard.stripe.com](https://dashboard.stripe.com) → create a recurring Price, then grab the keys |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen` locally, or the webhook endpoint's signing secret in the Stripe dashboard once deployed |

## 3. Push to GitHub (free)

```bash
git init
git add .
git commit -m "Valerie: Supabase-based auth and database"
git branch -M main
git remote add origin https://github.com/<your-username>/valerie-ai.git
git push -u origin main
```

## 4. Deploy to Vercel (free)

1. [vercel.com/new](https://vercel.com/new) → import the `valerie-ai` repo.
2. Paste in every variable from `.env`, but set `NEXT_PUBLIC_SITE_URL` to your Vercel
   domain (e.g. `https://valerie-ai.vercel.app`).
3. Deploy.
4. Back in Supabase → Authentication → URL Configuration: add
   `https://<your-vercel-domain>/auth/callback` to Redirect URLs (keep the localhost one
   too if you still develop locally), and add the Vercel domain to Site URL if that's
   now your primary domain.
5. In Stripe: add a webhook endpoint at `https://<your-vercel-domain>/api/billing/webhook`,
   subscribed to `checkout.session.completed`, `customer.subscription.updated`, and
   `customer.subscription.deleted`; copy its signing secret into `STRIPE_WEBHOOK_SECRET`
   in Vercel and redeploy.

Vercel redeploys automatically on every push to `main`.

## Notes / what changed from the NextAuth version

- No more `@auth/prisma-adapter`, no `Account`/`Session`/`VerificationToken` tables —
  Supabase manages sessions and OAuth tokens internally.
- `src/lib/auth.ts` and `src/app/api/auth/[...nextauth]/route.ts` are gone, replaced by
  `src/lib/supabase/{client,server}.ts` and `src/app/auth/callback/route.ts`.
- If you add more OAuth providers or email/password sign-in, do it in Supabase's
  Authentication → Providers panel — no code changes needed beyond calling the
  corresponding `supabase.auth.signInWith*` method from the client.
- The 40-message cap is still a global lifetime counter (`User.messageCount`) — adjust
  `checkUsage`/`recordUsage` in `src/lib/rateLimit.ts` for a rolling window instead.
