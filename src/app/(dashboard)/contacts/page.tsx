"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Search, Plus, Trash2 } from "lucide-react";
import PageTransition from "@/components/PageTransition";

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  tags: string[];
  created_at: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  async function fetchContacts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setContacts(data);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    await supabase.from("contacts").delete().eq("id", id);
    setDeleteId(null);
    fetchContacts();
  }

  const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags || [])));

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q));
    const matchesTag = !tagFilter || (c.tags && c.tags.includes(tagFilter));
    return matchesSearch && matchesTag;
  });

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-fg">Contacts</h1>
            <p className="text-sm text-fg-muted mt-0.5">
              {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href="/contacts/new" className="btn-primary flex items-center gap-2">
            <Plus size={14} />
            Add Contact
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim"
            />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
          {allTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="input w-auto min-w-[140px]"
            >
              <option value="">All tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="px-6 py-12 text-center text-fg-dim text-sm">
              Loading contacts...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-fg-dim text-sm">
              {contacts.length === 0
                ? "No contacts yet. Add your first contact to get started."
                : "No contacts match your search."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge text-left text-fg-muted">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Tags</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-edge last:border-0 hover:bg-surface-raised/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/contacts/${c.id}`}
                        className="text-fg hover:underline font-medium"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-fg-secondary">{c.phone}</td>
                    <td className="px-4 py-3 text-fg-secondary">
                      {c.email || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {(c.tags || []).map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 text-xs bg-surface-raised border border-edge rounded-full text-fg-muted"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-fg-dim">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {deleteId === c.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-xs text-fg px-2 py-1 bg-surface-raised border border-edge rounded hover:bg-edge transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteId(null)}
                            className="text-xs text-fg-dim px-2 py-1 hover:text-fg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteId(c.id)}
                          className="text-fg-dim hover:text-fg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
