"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Search, RefreshCw, MessageSquare } from "lucide-react";
import PageTransition from "@/components/PageTransition";

interface Conversation {
  id: string;
  phone: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  contact_id: string | null;
  contacts: { name: string } | null;
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [search, setSearch] = useState("");

  const fetchConversations = useCallback(async () => {
    const { data } = await supabase
      .from("conversations")
      .select("*, contacts(name)")
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (data) setConversations(data as Conversation[]);
    setLoading(false);
  }, []);

  const pollMessages = useCallback(async () => {
    setPolling(true);
    try {
      await fetch("/api/messages/poll");
      await fetchConversations();
    } catch {
      // ignore poll errors
    }
    setPolling(false);
  }, [fetchConversations]);

  useEffect(() => {
    fetchConversations();
    // Poll every 10 seconds
    const interval = setInterval(pollMessages, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations, pollMessages]);

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = (c.contacts as { name: string } | null)?.name || "";
    return (
      name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.last_message && c.last_message.toLowerCase().includes(q))
    );
  });

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  }

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-fg">Inbox</h1>
            <p className="text-sm text-fg-muted mt-0.5">
              {conversations.length} conversation
              {conversations.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={pollMessages}
            disabled={polling}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={14} className={polling ? "animate-spin" : ""} />
            {polling ? "Syncing..." : "Sync"}
          </button>
        </div>

        <div className="relative mb-4">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim"
          />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="px-6 py-12 text-center text-fg-dim text-sm">
              Loading conversations...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-fg-dim text-sm flex flex-col items-center gap-3">
              <MessageSquare size={24} className="text-fg-dim/50" />
              {conversations.length === 0
                ? "No conversations yet. Send an SMS to start one."
                : "No conversations match your search."}
            </div>
          ) : (
            <div className="divide-y divide-edge">
              {filtered.map((conv) => {
                const name =
                  (conv.contacts as { name: string } | null)?.name || conv.phone;
                return (
                  <Link key={conv.id} href={`/inbox/${conv.id}`}>
                    <div className="px-4 py-3.5 hover:bg-surface-raised/50 transition-colors flex items-center gap-3 cursor-pointer">
                      <div className="w-9 h-9 rounded-full bg-surface-raised border border-edge flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-fg-muted">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-fg truncate">
                            {name}
                          </span>
                          {conv.last_message_at && (
                            <span className="text-xs text-fg-dim ml-2 flex-shrink-0">
                              {timeAgo(conv.last_message_at)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-fg-muted truncate pr-2">
                            {conv.last_message || "No messages yet"}
                          </p>
                          {conv.unread_count > 0 && (
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-fg text-bg text-[10px] font-medium flex items-center justify-center">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
