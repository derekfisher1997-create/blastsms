"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Send, User } from "lucide-react";
import ChatBubble from "@/components/ChatBubble";
import PageTransition from "@/components/PageTransition";

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  content: string;
  status: string;
  created_at: string;
}

interface ConversationDetail {
  id: string;
  phone: string;
  contact_id: string | null;
  contacts: { id: string; name: string } | null;
}

export default function ChatPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (data) {
      setMessages(data);
      setTimeout(scrollToBottom, 100);
    }
  }, [conversationId, scrollToBottom]);

  useEffect(() => {
    async function init() {
      // Fetch conversation details
      const { data: conv } = await supabase
        .from("conversations")
        .select("*, contacts(id, name)")
        .eq("id", conversationId)
        .single();

      if (conv) {
        setConversation(conv as ConversationDetail);
        // Mark as read
        await supabase
          .from("conversations")
          .update({ unread_count: 0 })
          .eq("id", conversationId);
      }

      await fetchMessages();
      setLoading(false);
    }

    init();

    // Poll every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [conversationId, fetchMessages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !conversation || sending) return;

    const text = input.trim();
    setInput("");
    setSending(true);

    // Optimistic update
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      direction: "outbound",
      content: text,
      status: "sending",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: conversation.phone, message: text }),
      });

      const data = await res.json();

      if (data.success) {
        // Refresh messages to get the real entry
        await fetchMessages();
      } else {
        // Replace optimistic with error
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMsg.id ? { ...m, status: "failed" } : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMsg.id ? { ...m, status: "failed" } : m
        )
      );
    }

    setSending(false);
    inputRef.current?.focus();
  }

  // Group messages by date
  function getDateLabel(date: string) {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  }

  const contactName =
    (conversation?.contacts as { id: string; name: string } | null)?.name ||
    conversation?.phone ||
    "...";

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-5 h-5 border-2 border-fg-dim border-t-fg rounded-full animate-spin" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-7rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-edge mb-4">
          <Link
            href="/inbox"
            className="text-fg-muted hover:text-fg transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="w-9 h-9 rounded-full bg-surface-raised border border-edge flex items-center justify-center">
            <span className="text-xs font-medium text-fg-muted">
              {contactName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-fg">{contactName}</p>
            <p className="text-xs text-fg-dim">{conversation?.phone}</p>
          </div>
          {conversation?.contacts && (
            <Link
              href={`/contacts/${(conversation.contacts as { id: string; name: string }).id}`}
              className="btn-ghost flex items-center gap-1.5 text-xs"
            >
              <User size={12} />
              Profile
            </Link>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-1 space-y-1">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-fg-dim">
              No messages yet. Send one below.
            </div>
          ) : (
            <>
              {messages.map((msg, i) => {
                const showDate =
                  i === 0 ||
                  getDateLabel(msg.created_at) !==
                    getDateLabel(messages[i - 1].created_at);
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="text-[10px] text-fg-dim bg-surface-raised px-3 py-1 rounded-full">
                          {getDateLabel(msg.created_at)}
                        </span>
                      </div>
                    )}
                    <ChatBubble
                      direction={msg.direction}
                      content={msg.content}
                      timestamp={msg.created_at}
                      status={msg.status}
                    />
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 pt-4 border-t border-edge mt-4"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="input flex-1"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="btn-primary flex items-center justify-center w-10 h-10 p-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </PageTransition>
  );
}
