export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  imageUrl?: string | null;
  createdAt?: string;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface UsageInfo {
  isAdmin: boolean;
  plan: "free" | "pro";
  messageCount: number;
  limit: number;
}
