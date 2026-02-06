"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import Sidebar from "@/components/Sidebar";
import DemoBanner from "@/components/DemoBanner";
import DemoToast from "@/components/DemoToast";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const hydrated = useStore((s) => s._hasHydrated);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace("/");
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-fg-dim border-t-fg rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="pl-56">
        <DemoBanner />
        <main className="px-8 py-6">{children}</main>
      </div>
      <DemoToast />
    </div>
  );
}
