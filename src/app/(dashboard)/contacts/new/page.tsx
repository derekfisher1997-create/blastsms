"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageTransition from "@/components/PageTransition";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewContactPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
    tags: "",
  });

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

    // Upsert contact
    const { data: contact, error: contactErr } = await supabase
      .from("contacts")
      .upsert(
        {
          name: form.name.trim(),
          phone: cleanPhone,
          email: form.email.trim() || null,
          notes: form.notes.trim() || null,
          tags,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "phone" }
      )
      .select()
      .single();

    if (contactErr) {
      setError(contactErr.message);
      setSaving(false);
      return;
    }

    // Upsert conversation for this phone
    await supabase
      .from("conversations")
      .upsert(
        {
          phone: cleanPhone,
          contact_id: contact.id,
        },
        { onConflict: "phone" }
      );

    router.push("/contacts");
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

        <h1 className="text-lg font-semibold text-fg mb-6">New Contact</h1>

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
              placeholder="John Doe"
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
              placeholder="+1 555 123 4567"
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
              placeholder="john@example.com"
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
              placeholder="Any notes about this contact..."
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
              placeholder="vip, client, lead"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Create Contact"}
            </button>
            <Link href="/contacts" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </PageTransition>
  );
}
