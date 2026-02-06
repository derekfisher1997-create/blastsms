"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/store";
import { supabase } from "@/lib/supabase";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/queue", label: "Queue" },
  { href: "/contacts", label: "Contacts" },
  { href: "/inbox", label: "Inbox" },
  { href: "/analytics", label: "Analytics" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const logout = useStore((s) => s.logout);
  const user = useStore((s) => s.user);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchUnread() {
      const { data } = await supabase
        .from("conversations")
        .select("unread_count");
      if (data) {
        const total = data.reduce(
          (sum: number, c: { unread_count: number }) => sum + (c.unread_count || 0),
          0
        );
        setUnreadCount(total);
      }
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-surface border-r border-edge flex flex-col z-40">
      <div className="px-5 py-6 border-b border-edge">
        <Link href="/dashboard" className="block">
          <span className="text-base font-semibold text-fg tracking-tight">BlastSMS</span>
          <span className="block text-[10px] text-fg-dim uppercase tracking-[0.15em] mt-0.5">
            sms platform
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-surface-raised text-fg font-medium"
                    : "text-fg-muted hover:text-fg-secondary hover:bg-surface-raised/50"
                }`}
              >
                {active && (
                  <span className="w-1 h-1 rounded-full bg-fg flex-shrink-0" />
                )}
                <span className="flex-1">{item.label}</span>
                {item.href === "/inbox" && unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-fg text-bg text-[10px] font-medium flex items-center justify-center flex-shrink-0">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-edge space-y-2">
        <div className="px-3 py-1">
          <p className="text-sm text-fg-secondary truncate">{user?.name}</p>
          <p className="text-xs text-fg-dim truncate">{user?.email}</p>
        </div>
        <button
          onClick={() => {
            logout();
            window.location.href = "/";
          }}
          className="w-full text-left px-3 py-2 rounded-md text-sm text-fg-dim hover:text-fg hover:bg-surface-raised transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
