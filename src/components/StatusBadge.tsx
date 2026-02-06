"use client";

type Variant = "default" | "active" | "success" | "error" | "warning";

const STYLES: Record<Variant, string> = {
  default: "bg-surface-raised text-fg-muted border-edge",
  active: "bg-white/10 text-white border-white/20",
  success: "bg-white text-black border-white",
  error: "bg-surface-raised text-fg-dim border-edge border-dashed",
  warning: "bg-surface-raised/50 text-fg-secondary border-edge",
};

const DOT_COLORS: Record<Variant, string> = {
  default: "bg-fg-dim",
  active: "bg-white",
  success: "bg-black",
  error: "bg-fg-dim",
  warning: "bg-fg-muted",
};

export default function StatusBadge({
  label,
  variant = "default",
  dot = false,
}: {
  label: string;
  variant?: Variant;
  dot?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded border ${STYLES[variant]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[variant]}`} />}
      {label}
    </span>
  );
}

export function campaignBadge(status: string) {
  switch (status) {
    case "completed": return <StatusBadge label="Completed" variant="success" />;
    case "running": return <StatusBadge label="Running" variant="active" dot />;
    case "queued": return <StatusBadge label="Queued" variant="warning" dot />;
    case "paused": return <StatusBadge label="Paused" variant="default" />;
    case "draft": return <StatusBadge label="Draft" variant="default" />;
    default: return <StatusBadge label={status} />;
  }
}

export function messageBadge(status: string) {
  switch (status) {
    case "delivered": return <StatusBadge label="Delivered" variant="success" />;
    case "sending": return <StatusBadge label="Sending" variant="active" dot />;
    case "queued": return <StatusBadge label="Queued" variant="warning" />;
    case "failed": return <StatusBadge label="Failed" variant="error" />;
    default: return <StatusBadge label={status} />;
  }
}
