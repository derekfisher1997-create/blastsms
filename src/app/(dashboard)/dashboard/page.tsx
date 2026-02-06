"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useStore } from "@/store";
import KPICard from "@/components/KPICard";
import PageTransition from "@/components/PageTransition";
import { campaignBadge } from "@/components/StatusBadge";
import { pct } from "@/lib/utils";

export default function DashboardPage() {
  const campaigns = useStore((s) => s.campaigns);

  const stats = useMemo(() => {
    const totalSent = campaigns.reduce((s, c) => s + c.delivered + c.failed, 0);
    const totalDelivered = campaigns.reduce((s, c) => s + c.delivered, 0);
    const totalFailed = campaigns.reduce((s, c) => s + c.failed, 0);
    const active = campaigns.filter((c) => c.status === "running").length;
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    return { totalSent, totalDelivered, totalFailed, active, deliveryRate };
  }, [campaigns]);

  if (campaigns.length === 0) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <h1 className="text-xl font-semibold text-fg mb-2">
            No campaigns yet
          </h1>
          <p className="text-sm text-fg-muted mb-6 max-w-sm">
            Create your first SMS campaign to start sending real messages.
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
      <div className="space-y-8">
        <div>
          <h1 className="text-lg font-semibold text-fg">Dashboard</h1>
          <p className="text-sm text-fg-muted mt-0.5">Campaign overview</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Sent" value={stats.totalSent} delay={0} />
          <KPICard label="Delivered" value={stats.totalDelivered} delay={50} />
          <KPICard label="Failed" value={stats.totalFailed} delay={100} />
          <KPICard
            label="Delivery Rate"
            value={stats.deliveryRate}
            suffix="%"
            delay={150}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-fg">Recent campaigns</h2>
            <Link
              href="/campaigns"
              className="text-xs text-fg-muted hover:text-fg transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-edge">
                  <th className="text-left text-xs font-medium text-fg-dim uppercase tracking-wider px-4 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-medium text-fg-dim uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-fg-dim uppercase tracking-wider px-4 py-3">
                    Recipients
                  </th>
                  <th className="text-left text-xs font-medium text-fg-dim uppercase tracking-wider px-4 py-3">
                    Delivered
                  </th>
                  <th className="text-left text-xs font-medium text-fg-dim uppercase tracking-wider px-4 py-3">
                    Failed
                  </th>
                </tr>
              </thead>
              <tbody>
                {campaigns.slice(0, 5).map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.04 }}
                    className="border-b border-edge/50 last:border-0 hover:bg-surface-raised/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm text-fg">{c.name}</span>
                    </td>
                    <td className="px-4 py-3">{campaignBadge(c.status)}</td>
                    <td className="px-4 py-3 text-sm text-fg-secondary tabular-nums">
                      {c.recipientCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-fg-secondary tabular-nums">
                      {c.delivered > 0
                        ? `${c.delivered.toLocaleString()} (${pct(c.delivered, c.recipientCount)}%)`
                        : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-sm text-fg-secondary tabular-nums">
                      {c.failed > 0 ? c.failed.toLocaleString() : "\u2014"}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
