"use client";

import { useState } from "react";
import { X, Sparkles, Check } from "lucide-react";

export default function PaywallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const upgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <button onClick={onClose} className="absolute right-4 top-4 text-neutral-500 hover:text-neutral-300">
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-2 text-brand-400">
          <Sparkles className="h-6 w-6" />
          <h3 className="text-lg font-semibold text-white">Upgrade to Valerie Pro</h3>
        </div>

        <p className="mb-4 text-sm text-neutral-400">
          You've used your 40 free messages. Upgrade for unlimited chat, vision, and image generation.
        </p>

        <ul className="mb-6 space-y-2 text-sm text-neutral-300">
          {["Unlimited messages", "Unlimited AI image generation", "Priority response speed"].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" /> {f}
            </li>
          ))}
        </ul>

        <button
          onClick={upgrade}
          disabled={loading}
          className="w-full rounded-lg bg-brand-500 py-2.5 font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? "Redirecting..." : "Upgrade now"}
        </button>
      </div>
    </div>
  );
}
