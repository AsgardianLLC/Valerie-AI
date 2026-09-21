import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import type { User as PrismaUser } from "@prisma/client";

/**
 * Server-side Supabase client for use inside Route Handlers, Server
 * Components, and Server Actions. Reads the session from cookies set by
 * the browser client / middleware.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component render - middleware refreshes
            // the session instead, so this can be safely ignored.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Same as above.
          }
        },
      },
    }
  );
}

/**
 * The single entry point every API route uses to identify the caller.
 *
 * Unlike NextAuth's Prisma adapter, Supabase does NOT know about our
 * `public.User` profile table - it only manages its own `auth.users` table.
 * So on every request we: (1) verify the Supabase session, then (2) upsert
 * a matching profile row keyed by the same UUID, computing `isAdmin` fresh
 * from ADMIN_EMAILS every time (so promoting/demoting an admin via env var
 * takes effect immediately, no DB migration needed).
 *
 * Returns null if the request is unauthenticated.
 */
export async function getCurrentUser(): Promise<PrismaUser | null> {
  const supabase = createClient();

  // getUser() (not getSession()) re-validates the token against Supabase's
  // auth server rather than trusting the local cookie, which matters
  // inside server-side code that makes access-control decisions.
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser) return null;

  const admin = isAdminEmail(authUser.email);
  const name =
    (authUser.user_metadata?.full_name as string | undefined) ??
    (authUser.user_metadata?.name as string | undefined) ??
    null;
  const image = (authUser.user_metadata?.avatar_url as string | undefined) ?? null;

  const profile = await prisma.user.upsert({
    where: { id: authUser.id },
    update: {
      email: authUser.email ?? undefined,
      isAdmin: admin,
      // Don't clobber a name/avatar the user may have customized in-app;
      // only fill them in if we don't already have one.
      ...(name ? { name } : {}),
      ...(image ? { image } : {}),
    },
    create: {
      id: authUser.id,
      email: authUser.email,
      name,
      image,
      isAdmin: admin,
    },
  });

  return profile;
}
