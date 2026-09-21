"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950 text-neutral-400">
        Loading Valerie...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-4 text-center">
        <div className="flex items-center gap-2 text-3xl font-semibold text-white">
          <Sparkles className="h-8 w-8 text-brand-400" />
          Valerie
        </div>
        <p className="max-w-sm text-neutral-400">
          A multimodal AI assistant with text, vision, and image generation. Sign in to get started —
          your first 40 messages are free.
        </p>
        <button
          onClick={signInWithGoogle}
          className="rounded-lg bg-brand-500 px-6 py-3 font-medium text-white transition hover:bg-brand-600"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return <AppShell user={user} />;
}
