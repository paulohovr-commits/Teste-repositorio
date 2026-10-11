"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useMe } from "./MeContext";

export const LAST_BOARD_KEY = "prospeccao:lastBoard";

export default function BottomBar() {
  const me = useMe();
  const path = usePathname();
  const [unread, setUnread] = useState(0);
  const [lastBoard, setLastBoard] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLastBoard(localStorage.getItem(LAST_BOARD_KEY));
    } catch {}
  }, [path]);

  useEffect(() => {
    async function count() {
      const { count } = await supabase
        .from("notifications")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", me.id)
        .is("read_at", null);
      setUnread(count || 0);
    }
    count();
    const ch = supabase
      .channel(`badge-${me.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${me.id}` }, count)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [me.id]);

  const tabs = [
    { href: lastBoard ? `/prospeccao/board/${lastBoard}` : "/prospeccao", icon: "🗂️", label: "Quadro", on: path.startsWith("/prospeccao/board") },
    { href: "/prospeccao/inbox", icon: "📥", label: "Caixa de entrada", on: path.startsWith("/prospeccao/inbox"), badge: unread },
    { href: "/prospeccao/agenda", icon: "📅", label: "Agenda", on: path.startsWith("/prospeccao/agenda") },
    { href: "/prospeccao", icon: "▦", label: "Quadros", on: path === "/prospeccao" },
  ];

  return (
    <nav className="bottombar">
      {tabs.map((t) => (
        <Link key={t.label} href={t.href} className={`tab ${t.on ? "on" : ""}`}>
          <span className="tab-icon">
            {t.icon}
            {!!t.badge && <span className="badge">{t.badge > 99 ? "99+" : t.badge}</span>}
          </span>
          <span className="tab-label">{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
