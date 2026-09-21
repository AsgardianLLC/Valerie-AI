"use client";

import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import PaywallModal from "@/components/PaywallModal";
import type { ChatSessionSummary, UsageInfo } from "@/types";

export default function AppShell({ user }: { user: User }) {
  const [chats, setChats] = useState<ChatSessionSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const refreshChats = useCallback(async () => {
    const res = await fetch("/api/sessions");
    if (res.ok) {
      const { chats } = await res.json();
      setChats(chats);
      if (!activeChatId && chats.length > 0) setActiveChatId(chats[0].id);
    }
  }, [activeChatId]);

  const refreshUsage = useCallback(async () => {
    const res = await fetch("/api/messages/usage");
    if (res.ok) setUsage(await res.json());
  }, []);

  useEffect(() => {
    refreshChats();
    refreshUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewChat = async () => {
    const res = await fetch("/api/sessions", { method: "POST", body: JSON.stringify({}) });
    if (res.ok) {
      const { chat } = await res.json();
      setChats((prev) => [{ id: chat.id, title: chat.title, updatedAt: chat.updatedAt }, ...prev]);
      setActiveChatId(chat.id);
    }
  };

  const handleDeleteChat = async (id: string) => {
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) setActiveChatId(null);
  };

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        usage={usage}
        user={user}
        onSelectChat={setActiveChatId}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />
      <main className="flex-1 min-w-0">
        <ChatWindow
          chatId={activeChatId}
          onNeedsNewChat={handleNewChat}
          onPaywall={() => setPaywallOpen(true)}
          onUsageChange={refreshUsage}
          onTitleChange={(id, title) =>
            setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)))
          }
        />
      </main>
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
}
