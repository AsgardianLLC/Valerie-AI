"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Copy, Check, User, Sparkles, Download } from "lucide-react";
import type { ChatMessage } from "@/types";

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative my-2 overflow-hidden rounded-lg border border-neutral-800">
      <div className="flex items-center justify-between bg-neutral-900 px-3 py-1.5 text-xs text-neutral-400">
        <span>{language || "text"}</span>
        <button onClick={copy} className="flex items-center gap-1 hover:text-neutral-200">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter language={language} style={oneDark} customStyle={{ margin: 0, fontSize: "0.85rem" }}>
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 py-4 ${isUser ? "" : "bg-neutral-900/30"} px-4 md:px-8`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-neutral-700" : "bg-brand-500"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || "");
                const isInline = !match;
                if (isInline) {
                  return (
                    <code className="rounded bg-neutral-800 px-1 py-0.5 text-sm" {...props}>
                      {children}
                    </code>
                  );
                }
                return <CodeBlock language={match![1]} code={String(children).replace(/\n$/, "")} />;
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {message.imageUrl && (
          <div className="mt-3 max-w-md overflow-hidden rounded-xl border border-neutral-800">
            <img src={message.imageUrl} alt="Generated" className="w-full" />
            <a
              href={message.imageUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 border-t border-neutral-800 bg-neutral-900 py-2 text-xs text-neutral-300 hover:bg-neutral-800"
            >
              <Download className="h-3.5 w-3.5" /> Download image
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
