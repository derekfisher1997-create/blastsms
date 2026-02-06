"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Send,
  CheckCircle2,
  XCircle,
  BarChart3,
  PieChart as PieIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import PageTransition from "@/components/PageTransition";
import { useStore } from "@/store";
import { animateValue } from "@/lib/utils";

const GRAY_SHADES = ["#ffffff", "#cccccc", "#999999", "#666666", "#444444"];

function AnimatedMetric({
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    animateValue(0, value, 1200, (v) => setDisplay(v));
  }, [value]);

  return (
    <span>
      {prefix}
      {decimals > 0
        ? display.toFixed(decimals)
        : Math.round(display).toLocaleString()}
      {suffix}
    </span>
  );
}

const CustomTooltip = {
  contentStyle: {
    background: "#111113",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#fff",
  },
};

export default function AnalyticsPage() {
  const campaigns = useStore((s) => s.campaigns);
  const queueMessages = useStore((s) => s.queueMessages);

  const totalSent = useMemo(
    () => campaigns.reduce((sum, c) => sum + c.delivered + c.failed, 0),
    [campaigns]
  );
  const totalDelivered = useMemo(
    () => campaigns.reduce((sum, c) => sum + c.delivered, 0),
    [campaigns]
  );
  const totalFailed = useMemo(
    () => campaigns.reduce((sum, c) => sum + c.failed, 0),
    [campaigns]
  );
  const deliveryRate = useMemo(
    () => (totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0),
    [totalDelivered, totalSent]
  );

  // Daily volume: group queueMessages by date
  const dailyData = useMemo(() => {
    const byDate: Record<string, { sent: number; delivered: number; failed: number }> = {};
    for (const msg of queueMessages) {
      if (msg.status !== "delivered" && msg.status !== "failed") continue;
      const date = new Date(msg.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (!byDate[date]) byDate[date] = { sent: 0, delivered: 0, failed: 0 };
      byDate[date].sent++;
      if (msg.status === "delivered") byDate[date].delivered++;
      if (msg.status === "failed") byDate[date].failed++;
    }
    return Object.entries(byDate).map(([date, data]) => ({ date, ...data }));
  }, [queueMessages]);

  // Campaign performance: delivered vs failed per campaign
  const campaignPerformance = useMemo(() => {
    return campaigns
      .filter((c) => c.delivered > 0 || c.failed > 0)
      .map((c) => ({
        name: c.name.length > 15 ? c.name.slice(0, 15) + "..." : c.name,
        delivered: c.delivered,
        failed: c.failed,
      }));
  }, [campaigns]);

  // Hourly distribution: group queueMessages by hour of day
  const hourlyData = useMemo(() => {
    const byHour: Record<number, number> = {};
    for (const msg of queueMessages) {
      if (msg.status === "delivered" || msg.status === "failed") {
        const hour = new Date(msg.timestamp).getHours();
        byHour[hour] = (byHour[hour] || 0) + 1;
      }
    }
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, "0")}:00`,
      messages: byHour[i] || 0,
    }));
  }, [queueMessages]);

  // Status breakdown: pie chart of all queue message statuses
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const msg of queueMessages) {
      counts[msg.status] = (counts[msg.status] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [queueMessages]);

  const hasData = queueMessages.length > 0;

  if (!hasData) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-lg font-semibold text-fg">Analytics</h1>
            <p className="text-sm text-fg-muted mt-0.5">
              Campaign performance metrics
            </p>
          </div>
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <BarChart3 className="w-8 h-8 text-fg-dim mb-3" />
            <p className="text-sm text-fg-muted">No analytics yet</p>
            <p className="text-xs text-fg-dim mt-1">
              Send some messages to see performance data
            </p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-fg">Analytics</h1>
          <p className="text-sm text-fg-muted mt-0.5">
            Campaign performance metrics
          </p>
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { label: "Total Sent", value: totalSent, icon: Send },
            { label: "Delivered", value: totalDelivered, icon: CheckCircle2 },
            { label: "Failed", value: totalFailed, icon: XCircle },
            {
              label: "Delivery Rate",
              value: deliveryRate,
              icon: TrendingUp,
              suffix: "%",
              decimals: 1,
            },
          ].map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="card p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-surface-raised">
                  <metric.icon className="w-4 h-4 text-fg-muted" />
                </div>
                <span className="text-xs text-fg-dim uppercase tracking-wider">
                  {metric.label}
                </span>
              </div>
              <p className="text-2xl font-semibold text-fg">
                <AnimatedMetric
                  value={metric.value}
                  suffix={metric.suffix}
                  decimals={metric.decimals}
                />
              </p>
            </motion.div>
          ))}
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Daily Volume */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="lg:col-span-2 card p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-4 h-4 text-fg-dim" />
              <h2 className="text-sm font-medium text-fg">
                Daily Message Volume
              </h2>
            </div>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="aDelivered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="aFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#666666" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#666666" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.04)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                    tickLine={false}
                  />
                  <Tooltip {...CustomTooltip} />
                  <Area
                    type="monotone"
                    dataKey="delivered"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    fill="url(#aDelivered)"
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    stroke="#666666"
                    strokeWidth={1}
                    fill="url(#aFailed)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-sm text-fg-dim">
                No completed messages yet
              </div>
            )}
          </motion.div>

          {/* Campaign Performance */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="card p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <PieIcon className="w-4 h-4 text-fg-dim" />
              <h2 className="text-sm font-medium text-fg">
                Campaign Performance
              </h2>
            </div>
            {campaignPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={campaignPerformance} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.04)"
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip {...CustomTooltip} />
                  <Bar dataKey="delivered" fill="#ffffff" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="failed" fill="#666666" stackId="a" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-fg-dim">
                No campaign data yet
              </div>
            )}
            <div className="space-y-2 mt-4">
              {campaignPerformance.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between"
                >
                  <span className="text-xs text-fg-muted">{c.name}</span>
                  <span className="text-xs text-fg-dim">
                    {c.delivered}d / {c.failed}f
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Second Row Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Hourly Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="card p-6"
          >
            <h2 className="text-sm font-medium text-fg mb-6">
              Hourly Distribution
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourlyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                  tickLine={false}
                />
                <Tooltip {...CustomTooltip} />
                <Bar
                  dataKey="messages"
                  fill="#ffffff"
                  radius={[3, 3, 0, 0]}
                  opacity={0.35}
                />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Status Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="card p-6"
          >
            <h2 className="text-sm font-medium text-fg mb-6">
              Status Breakdown
            </h2>
            {statusBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusBreakdown.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={GRAY_SHADES[index % GRAY_SHADES.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip {...CustomTooltip} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {statusBreakdown.map((item, index) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            background:
                              GRAY_SHADES[index % GRAY_SHADES.length],
                          }}
                        />
                        <span className="text-xs text-fg-muted">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-xs text-fg-dim">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-sm text-fg-dim">
                No status data yet
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
