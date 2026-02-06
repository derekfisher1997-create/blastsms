"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useStore } from "@/store";
import PageTransition from "@/components/PageTransition";
import { campaignBadge } from "@/components/StatusBadge";
import { pct } from "@/lib/utils";
import { format } from "date-fns";

export default function CampaignsPage() {
  const campaigns = useStore((s) => s.campaigns);
  const deleteCampaign = useStore((s) => s.deleteCampaign);
  const updateCampaign = useStore((s) => s.updateCampaign);
  const launchCampaign = useStore((s) => s.launchCampaign);
  const showToast = useStore((s) => s.showToast);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = campaigns.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.status === filter;
    return matchSearch && matchFilter;
  });

  const handleDelete = (id: string) => {
    deleteCampaign(id);
    setConfirmDelete(null);
    showToast("Campaign deleted");
  };

  const handlePause = (id: string) => {
    updateCampaign(id, { status: "paused" });
    showToast("Campaign paused");
  };

  const handleResume = (id: string) => {
    launchCampaign(id);
    showToast("Campaign resumed");
  };

  if (campaigns.length === 0) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <h1 className="text-xl font-semibold text-fg mb-2">No campaigns</h1>
          <p className="text-sm text-fg-muted mb-6">
            Create your first campaign to get started.
          </p>
          <Link href="/campaigns/new">
            <button className="btn-primary">Create campaign</button>
          </Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-fg">Campaigns</h1>
            <p className="text-sm text-fg-muted mt-0.5">
              {campaigns.length} total
            </p>
          </div>
          <Link href="/campaigns/new">
            <button className="btn-primary">New campaign</button>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input max-w-xs"
          />
          <div className="flex gap-1">
            {["all", "draft", "running", "completed", "paused"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  filter === s
                    ? "bg-surface-raised text-fg border border-edge"
                    : "text-fg-dim hover:text-fg-muted"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge">
                <th className="text-left text-xs font-medium text-fg-dim uppercase tracking-wider px-4 py-3">
                  Campaign
                </th>
                <th className="text-left text-xs font-medium text-fg-dim uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-fg-dim uppercase tracking-wider px-4 py-3">
                  Recipients
                </th>
                <th className="text-left text-xs font-medium text-fg-dim uppercase tracking-wider px-4 py-3">
                  Delivery
                </th>
                <th className="text-left text-xs font-medium text-fg-dim uppercase tracking-wider px-4 py-3">
                  Failed
                </th>
                <th className="text-left text-xs font-medium text-fg-dim uppercase tracking-wider px-4 py-3">
                  Created
                </th>
                <th className="text-right text-xs font-medium text-fg-dim uppercase tracking-wider px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-edge/50 last:border-0 hover:bg-surface-raised/30 transition-colors group"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm text-fg">{c.name}</span>
                    <p className="text-xs text-fg-dim mt-0.5 truncate max-w-[220px]" title={c.message}>
                      {c.message}
                    </p>
                  </td>
                  <td className="px-4 py-3">{campaignBadge(c.status)}</td>
                  <td className="px-4 py-3 text-sm text-fg-secondary tabular-nums">
                    {c.recipientCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-fg-secondary tabular-nums">
                    {c.delivered > 0
                      ? `${pct(c.delivered, c.recipientCount)}%`
                      : "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-sm text-fg-secondary tabular-nums">
                    {c.failed > 0 ? c.failed.toLocaleString() : "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-xs text-fg-dim">
                    {format(new Date(c.createdAt), "MMM d, HH:mm")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {c.status === "running" && (
                        <button
                          onClick={() => handlePause(c.id)}
                          className="btn-ghost text-xs py-1 px-2"
                        >
                          Pause
                        </button>
                      )}
                      {c.status === "paused" && (
                        <button
                          onClick={() => handleResume(c.id)}
                          className="btn-ghost text-xs py-1 px-2"
                        >
                          Resume
                        </button>
                      )}
                      {confirmDelete === c.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="btn-danger text-xs py-1 px-2"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="btn-ghost text-xs py-1 px-2"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(c.id)}
                          className="btn-ghost text-xs py-1 px-2"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-fg-dim">
                No campaigns match your filter
              </p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
