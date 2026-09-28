"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
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
        Loading Aesir...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-4 text-center">
        {/* Valknut Logo & Brand Title */}
        <div className="flex flex-col items-center justify-center gap-3">
          <img 
            src="/Aesir512x512.png" 
            alt="Aesir Valknut Logo" 
            className="w-28 h-28 object-contain drop-shadow-[0_0_15px_rgba(0,240,255,0.3)]"
          />
          <h1 className="text-4xl font-bold tracking-widest text-amber-100 font-serif">
            ÆSIR
          </h1>
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