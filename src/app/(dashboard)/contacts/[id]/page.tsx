"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageTransition from "@/components/PageTransition";
import { ArrowLeft, MessageSquare } from "lucide-react";
import Link from "next/link";

interface Message {
  id: string;
  direction: string;
  content: string;
  created_at: string;
}

export default function EditContactPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
    tags: "",
  });

  useEffect(() => {
    fetchContact();
  }, [id]);

  async function fetchContact() {
    setLoading(true);
    const { data, error: fetchErr } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !data) {
      router.push("/contacts");
      return;
    }

    setForm({
      name: data.name,
      phone: data.phone,
      email: data.email || "",
      notes: data.notes || "",
      tags: (data.tags || []).join(", "),
    });

    // Fetch linked conversation
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("phone", data.phone)
      .single();

    if (conv) {
      setConversationId(conv.id);
      // Fetch recent messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, direction, content, created_at")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (msgs) setRecentMessages(msgs.reverse());
    }

    setLoading(false);
  }

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.phone.trim()) {
      setError("Name and phone are required.");
      return;
    }

    setSaving(true);

    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const cleanPhone = form.phone.replace(/[\s\-()]/g, "");

    const { error: updateErr } = await supabase
      .from("contacts")
      .update({
        name: form.name.trim(),
        phone: cleanPhone,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
        tags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateErr) {
      setError(updateErr.message);
      setSaving(false);
      return;
    }

    // Update conversation link
    await supabase
      .from("conversations")
      .upsert(
        { phone: cleanPhone, contact_id: id },
        { onConflict: "phone" }
      );

    router.push("/contacts");
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-xl mx-auto">
          <div className="text-sm text-fg-dim">Loading contact...</div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-xl mx-auto">
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Back to Contacts
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold text-fg">Edit Contact</h1>
          {conversationId && (
            <Link
              href={`/inbox/${conversationId}`}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <MessageSquare size={14} />
              Open Chat
            </Link>
          )}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 text-sm text-fg bg-surface-raised border border-edge rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-fg-secondary mb-1.5">
              Name <span className="text-fg-dim">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm text-fg-secondary mb-1.5">
              Phone <span className="text-fg-dim">*</span>
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm text-fg-secondary mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm text-fg-secondary mb-1.5">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className="input min-h-[80px] resize-y"
            />
          </div>

          <div>
            <label className="block text-sm text-fg-secondary mb-1.5">
              Tags <span className="text-fg-dim">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => update("tags", e.target.value)}
              className="input"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <Link href="/contacts" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>

        {recentMessages.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-medium text-fg-secondary mb-3">
              Recent Messages
            </h2>
            <div className="card divide-y divide-edge">
              {recentMessages.map((msg) => (
                <div key={msg.id} className="px-4 py-3 flex items-start gap-3">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      msg.direction === "outbound"
                        ? "bg-surface-raised text-fg-muted"
                        : "bg-surface-raised text-fg-secondary"
                    }`}
                  >
                    {msg.direction === "outbound" ? "Sent" : "Recv"}
                  </span>
                  <p className="text-sm text-fg-secondary flex-1 line-clamp-2">
                    {msg.content}
                  </p>
                  <span className="text-xs text-fg-dim whitespace-nowrap">
                    {new Date(msg.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
