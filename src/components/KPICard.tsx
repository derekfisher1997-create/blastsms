"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface KPICardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  detail?: string;
  delay?: number;
}

export default function KPICard({ label, value, suffix = "", prefix = "", detail, delay = 0 }: KPICardProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const start = performance.now();
      const duration = 800;
      function tick(now: number) {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(value * eased);
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  const formatted = suffix === "%"
    ? display.toFixed(1)
    : Math.round(display).toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: delay / 1000, duration: 0.3 }}
      className="card p-5"
    >
      <p className="text-xs text-fg-muted uppercase tracking-wide mb-3">{label}</p>
      <p className="text-2xl font-semibold text-fg tabular-nums">
        {prefix}{formatted}{suffix}
      </p>
      {detail && <p className="text-xs text-fg-dim mt-1.5">{detail}</p>}
    </motion.div>
  );
}
