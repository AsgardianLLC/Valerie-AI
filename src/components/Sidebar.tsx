"use client";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Plus, MessageSquare, Trash2, LogOut, Shield, Sparkles, Menu, X } from "lucide-react";
import type { ChatSessionSummary, UsageInfo } from "@/types";
import { useState } from "react";

export default function Sidebar({
  chats,
  activeChatId,
  usage,
  user,
  onSelectChat,
  onNewChat,
  onDeleteChat,
}: {
  chats: ChatSessionSummary[];
  activeChatId: string | null;
  usage: UsageInfo | null;
  user: User;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
}) {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email;

  return (
    <>
      {/* Mobile Header Toggle Bar */}
      <div className="flex md:hidden items-center justify-between bg-neutral-900 border-b border-neutral-800 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center gap-2 text-lg font-semibold text-white">
          <Sparkles className="h-5 w-5 text-brand-400" />
          Valerie
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-neutral-300 p-1 rounded-lg hover:bg-neutral-800"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Backdrop overlay for mobile when drawer is open */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900 transition-transform duration-300 md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="hidden md:flex items-center gap-2 px-4 py-4 text-lg font-semibold text-white">
          <Sparkles className="h-5 w-5 text-brand-400" />
          Valerie
        </div>

        <button
          onClick={() => {
            onNewChat();
            setIsOpen(false);
          }}
          className="mx-3 mt-4 md:mt-0 mb-3 flex items-center justify-center gap-2 rounded-lg border border-neutral-700 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>

        <div className="flex-1 space-y-1 overflow-y-auto px-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer ${
                activeChatId === chat.id ? "bg-neutral-800 text-white" : "text-neutral-400 hover:bg-neutral-800/60"
              }`}
              onClick={() => {
                onSelectChat(chat.id);
                setIsOpen(false);
              }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate">{chat.title}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-neutral-800 px-4 py-3 text-xs text-neutral-400">
          {usage?.isAdmin ? (
            <div className="flex items-center gap-1.5 text-brand-400">
              <Shield className="h-3.5 w-3.5" /> Admin — unlimited access
            </div>
          ) : usage ? (
            <div>
              {usage.plan === "pro" ? (
                <span className="text-emerald-400">Pro plan — unlimited</span>
              ) : (
                <span>
                  {usage.messageCount}/{usage.limit} free messages used
                </span>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-800 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-neutral-200">{displayName}</p>
            <p className="truncate text-xs text-neutral-500">{user.email}</p>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className="text-neutral-500 hover:text-neutral-300"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  );
}