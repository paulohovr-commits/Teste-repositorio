"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isAllowedEmail } from "@/lib/access";
import type { Profile } from "@/lib/types";
import { MeContext } from "./MeContext";
import BottomBar from "./BottomBar";

export default function ProspeccaoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<Profile | null>(null);
  const [blocked, setBlocked] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      if (!isAllowedEmail(user.email)) {
        setBlocked(user.email || "");
        return;
      }
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!alive) return;
      setMe(
        (p as Profile) || { id: user.id, email: user.email || "", name: "", is_owner: false, role: null },
      );
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === "SIGNED_OUT") router.replace("/login");
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  if (blocked) {
    return (
      <main className="login">
        <div className="login-box">
          <p className="error">A conta {blocked} não tem permissão para entrar.</p>
          <button className="btn" onClick={() => supabase.auth.signOut()}>
            Entrar com outra conta
          </button>
        </div>
      </main>
    );
  }
  if (!me) return <div className="splash">Carregando…</div>;

  return (
    <MeContext.Provider value={me}>
      <div className="app">
        <div className="app-main">{children}</div>
        <BottomBar />
      </div>
    </MeContext.Provider>
  );
}
