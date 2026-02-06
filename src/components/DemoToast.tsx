"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store";

export default function DemoToast() {
  const toast = useStore((s) => s.toast);
  const clearToast = useStore((s) => s.clearToast);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-5 right-5 z-50"
        >
          <div className="card-raised flex items-center gap-3 px-4 py-3 shadow-lg max-w-sm">
            <p className="text-sm text-fg-secondary flex-1">{toast.message}</p>
            <button
              onClick={clearToast}
              className="text-fg-dim hover:text-fg text-xs transition-colors flex-shrink-0"
            >
              dismiss
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
