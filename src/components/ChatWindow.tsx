"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Paperclip, Image as ImageIcon, Settings, X, Loader2 } from "lucide-react";
import MessageBubble from "@/components/MessageBubble";
import type { ChatMessage } from "@/types";

type Attachment = { data: string; mediaType: string; previewUrl: string };

export default function ChatWindow({
  chatId,
  onNeedsNewChat,
  onPaywall,
  onUsageChange,
  onTitleChange,
}: {
  chatId: string | null;
  onNeedsNewChat: () => void;
  onPaywall: () => void;
  onUsageChange: () => void;
  onTitleChange: (id: string, title: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are Valerie, a helpful, concise, and friendly multimodal AI assistant."
  );
  const [temperature, setTemperature] = useState(0.7);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    (async () => {
      const res = await fetch(`/api/sessions/${chatId}`);
      if (res.ok) {
        const { messages } = await res.json();
        setMessages(
          messages.map((m: any) => ({ id: m.id, role: m.role, content: m.content, imageUrl: m.imageUrl }))
        );
      }
    })();
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [, base64] = result.split(",");
      setAttachment({ data: base64, mediaType: file.type, previewUrl: result });
    };
    reader.readAsDataURL(file);
  };

  const send = async () => {
    if (!input.trim() || sending) return;

    let activeChatId = chatId;
    if (!activeChatId) {
      onNeedsNewChat();
      return; // AppShell will set the new chat id; user can resend
    }

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    const messageText = input;
    setInput("");
    const currentAttachment = attachment;
    setAttachment(null);

    // Auto-title new chats from the first message.
    if (messages.length === 0) {
      const title = messageText.slice(0, 40) + (messageText.length > 40 ? "…" : "");
      fetch(`/api/sessions/${activeChatId}`, { method: "PATCH", body: JSON.stringify({ title }) });
      onTitleChange(activeChatId, title);
    }

    try {
      if (imageMode) {
        const res = await fetch("/api/image", {
          method: "POST",
          body: JSON.stringify({ chatSessionId: activeChatId, prompt: messageText }),
        });
        const data = await res.json();
        if (res.status === 402) {
          onPaywall();
          setMessages((prev) => prev.slice(0, -1));
          return;
        }
        if (!res.ok) throw new Error(data.error);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: data.revisedPrompt || "Here's your image:", imageUrl: data.url },
        ]);
      } else {
        const res = await fetch("/api/chat", {
          method: "POST",
          body: JSON.stringify({
            chatSessionId: activeChatId,
            message: messageText,
            systemPrompt,
            temperature,
            imageBase64: currentAttachment ? [{ data: currentAttachment.data, mediaType: currentAttachment.mediaType }] : undefined,
          }),
        });

        if (res.status === 402) {
          onPaywall();
          setMessages((prev) => prev.slice(0, -1));
          return;
        }
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Request failed");
        }

        // Non-streaming JSON response = inline image generated via /image command.
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "assistant", content: data.revisedPrompt || "Here's your image:", imageUrl: data.url },
          ]);
        } else {
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          const assistantId = crypto.randomUUID();
          setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

          if (reader) {
            let full = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              full += decoder.decode(value, { stream: true });
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: full } : m))
              );
            }
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: `⚠️ ${err.message || "Something went wrong."}` },
      ]);
    } finally {
      setSending(false);
      onUsageChange();
    }
  };

  if (!chatId) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-neutral-500">
        <p>Select a chat or start a new one.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <h2 className="text-sm font-medium text-neutral-300">Valerie</h2>
        <button onClick={() => setShowSettings((s) => !s)} className="text-neutral-500 hover:text-neutral-300">
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {showSettings && (
        <div className="space-y-3 border-b border-neutral-800 bg-neutral-900/50 px-4 py-3 text-sm">
          <div>
            <label className="mb-1 block text-neutral-400">System prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 p-2 text-neutral-100"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-neutral-400">Temperature: {temperature.toFixed(1)}</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="flex-1"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {sending && (
          <div className="flex items-center gap-2 px-8 py-2 text-sm text-neutral-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Valerie is thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-neutral-800 p-4">
        {attachment && (
          <div className="relative mb-2 inline-block">
            <img src={attachment.previewUrl} className="h-16 w-16 rounded-lg object-cover" />
            <button
              onClick={() => setAttachment(null)}
              className="absolute -right-1 -top-1 rounded-full bg-neutral-800 p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 rounded-xl border border-neutral-700 bg-neutral-900 p-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.txt,.md,.csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
            title="Attach file/image for vision analysis"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            onClick={() => setImageMode((v) => !v)}
            className={`rounded-lg p-2 hover:bg-neutral-800 ${imageMode ? "bg-brand-500/20 text-brand-400" : "text-neutral-400"}`}
            title="Toggle image generation mode"
          >
            <ImageIcon className="h-4 w-4" />
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={imageMode ? "Describe the image to generate... (or use /image <prompt> anytime)" : "Message Valerie..."}
            rows={1}
            className="max-h-40 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-neutral-500"
          />

          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="rounded-lg bg-brand-500 p-2 text-white transition hover:bg-brand-600 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
