"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useStore } from "@/store";

export default function LoginPage() {
  const router = useRouter();
  const login = useStore((s) => s.login);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const hydrated = useStore((s) => s._hasHydrated);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [hydrated, isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Enter email and password");
      return;
    }
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    login(email, password);
    router.push("/dashboard");
  };

  if (!hydrated) return null;
  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm mx-4"
      >
        <div className="mb-10">
          <h1 className="text-xl font-semibold text-fg">BlastSMS</h1>
          <p className="text-sm text-fg-dim mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-fg-muted mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@company.com"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-fg-muted mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="password"
            />
          </div>

          {error && (
            <p className="text-sm text-fg-muted">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-xs text-fg-dim mt-6 text-center">
          Sign in to continue
        </p>
      </motion.div>
    </div>
  );
}
