"use client";

import { useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Square,
  RotateCcw,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useStore } from "@/store";
import PageTransition from "@/components/PageTransition";
import { messageBadge } from "@/components/StatusBadge";

export default function QueuePage() {
  const {
    queueMessages,
    isSending,
    setSending,
    updateMessageStatus,
    clearQueue,
    showToast,
  } = useStore();

  const abortRef = useRef(false);
  const [filter, setFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(50);

  const stats = useMemo(() => {
    const queued = queueMessages.filter((m) => m.status === "queued").length;
    const sending = queueMessages.filter((m) => m.status === "sending").length;
    const delivered = queueMessages.filter((m) => m.status === "delivered").length;
    const failed = queueMessages.filter((m) => m.status === "failed").length;
    return { queued, sending, delivered, failed, total: queueMessages.length };
  }, [queueMessages]);

  const filteredMessages = useMemo(
    () =>
      filter === "all"
        ? queueMessages
        : queueMessages.filter((m) => m.status === filter),
    [queueMessages, filter]
  );

  const progressPercent =
    stats.total > 0
      ? ((stats.delivered + stats.failed) / stats.total) * 100
      : 0;

  const sendAll = useCallback(async () => {
    abortRef.current = false;
    setSending(true);

    const queued = useStore
      .getState()
      .queueMessages.filter((m) => m.status === "queued");

    for (const msg of queued) {
      if (abortRef.current) break;

      updateMessageStatus(msg.id, "sending");

      try {
        const res = await fetch("/api/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: msg.recipient,
            message: msg.messageText,
          }),
        });

        const data = await res.json();

        console.log(`[SMS] ${msg.recipient}:`, JSON.stringify(data));

        const apiData = {
          success: data.success,
          textId: data.textId,
          quotaRemaining: data.quotaRemaining,
          deliveryStatus: data.status || data.network,
        };

        if (data.success === true) {
          updateMessageStatus(msg.id, "delivered", undefined, apiData);
        } else {
          updateMessageStatus(
            msg.id,
            "failed",
            data.error || "Send failed",
            apiData
          );
        }
      } catch (err) {
        console.error(`[SMS] ${msg.recipient}: Network error`, err);
        updateMessageStatus(msg.id, "failed", "Network error");
      }
    }

    setSending(false);
    if (!abortRef.current) {
      showToast("All messages processed");
    }
  }, [setSending, updateMessageStatus, showToast]);

  const stopSending = () => {
    abortRef.current = true;
    setSending(false);
    showToast("Sending stopped");
  };

  const handleClear = () => {
    abortRef.current = true;
    setSending(false);
    clearQueue();
    showToast("Queue cleared");
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-fg">Message Queue</h1>
            <p className="text-sm text-fg-muted mt-0.5">
              Sequential SMS sending via httpSMS
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClear}
              disabled={isSending}
              className="btn-ghost flex items-center gap-2 disabled:opacity-30"
            >
              <RotateCcw className="w-4 h-4" />
              Clear
            </button>
            {isSending ? (
              <button
                onClick={stopSending}
                className="btn-secondary flex items-center gap-2"
              >
                <Square className="w-3.5 h-3.5" />
                Stop
              </button>
            ) : (
              <button
                onClick={sendAll}
                disabled={stats.queued === 0}
                className="btn-primary flex items-center gap-2 disabled:opacity-30"
              >
                <Play className="w-3.5 h-3.5" />
                Send All
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-fg-secondary">
                {isSending
                  ? "Sending..."
                  : stats.total === 0
                  ? "No messages"
                  : progressPercent >= 100
                  ? "Complete"
                  : "Ready"}
              </span>
              {isSending && (
                <motion.span
                  className="w-1.5 h-1.5 rounded-full bg-white"
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </div>
            <span className="text-sm text-fg-dim tabular-nums">
              {stats.delivered + stats.failed} / {stats.total}
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-raised rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Queued", value: stats.queued, icon: Clock },
            { label: "Sending", value: stats.sending, icon: Send },
            { label: "Delivered", value: stats.delivered, icon: CheckCircle2 },
            { label: "Failed", value: stats.failed, icon: XCircle },
          ].map((stat) => (
            <div key={stat.label} className="card p-4 flex items-center gap-3">
              <stat.icon className="w-4 h-4 text-fg-dim" />
              <div>
                <p className="text-xl font-semibold text-fg tabular-nums">
                  {stat.value}
                </p>
                <p className="text-xs text-fg-dim">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {["all", "queued", "sending", "delivered", "failed"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === status
                  ? "bg-surface-raised text-fg border border-edge"
                  : "text-fg-dim hover:text-fg-muted border border-transparent"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== "all" && (
                <span className="ml-1.5 text-fg-dim">
                  {status === "queued"
                    ? stats.queued
                    : status === "sending"
                    ? stats.sending
                    : status === "delivered"
                    ? stats.delivered
                    : stats.failed}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Message Table */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge">
                <th className="text-left text-xs font-medium text-fg-dim uppercase tracking-wider px-4 py-3">
                  Recipient
                </th>
                <th className="text-left text-xs font-medium text-fg-dim uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-fg-dim uppercase tracking-wider px-4 py-3">
                  Time
                </th>
                <th className="text-left text-xs font-medium text-fg-dim uppercase tracking-wider px-4 py-3">
                  API Response
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filteredMessages.slice(0, visibleCount).map((msg) => (
                  <motion.tr
                    key={msg.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-edge/50 last:border-0"
                  >
                    <td className="px-4 py-3 text-sm text-fg font-mono">
                      {msg.recipient}
                    </td>
                    <td className="px-4 py-3">{messageBadge(msg.status)}</td>
                    <td className="px-4 py-3 text-xs text-fg-dim">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-fg-dim">
                      {msg.apiSuccess !== undefined ? (
                        <div className="space-y-0.5">
                          <span>
                            {msg.apiSuccess ? "Accepted" : "Rejected"}
                          </span>
                          {msg.apiDeliveryStatus && (
                            <span className={`block font-semibold ${
                              msg.apiDeliveryStatus === "DELIVERED" ? "text-fg" :
                              msg.apiDeliveryStatus === "FAILED" ? "text-fg-muted" : ""
                            }`}>
                              {msg.apiDeliveryStatus === "DELIVERED" ? "Delivered" :
                               msg.apiDeliveryStatus === "FAILED" ? "Failed" :
                               msg.apiDeliveryStatus === "PENDING" ? "Pending" :
                               msg.apiDeliveryStatus}
                            </span>
                          )}
                          {msg.error && (
                            <span className="flex items-center gap-1 mt-0.5">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              {msg.error}
                            </span>
                          )}
                        </div>
                      ) : msg.error ? (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          {msg.error}
                        </span>
                      ) : null}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {stats.total === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-fg-dim">No messages in queue</p>
              <p className="text-xs text-fg-dim mt-1">
                Create a campaign to add messages
              </p>
            </div>
          )}

          {filteredMessages.length > visibleCount && (
            <div className="text-center py-3 border-t border-edge">
              <button
                onClick={() => setVisibleCount((c) => c + 50)}
                className="text-xs text-fg-muted hover:text-fg transition-colors"
              >
                Show more ({filteredMessages.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
