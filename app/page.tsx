"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// O Google devolve para cá. O erro do OAuth vem no FRAGMENTO (#error_description),
// que nunca chega ao servidor: repassamos para /login, que lê e limpa.
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (window.location.hash.includes("error")) {
      window.location.replace("/login" + window.location.hash);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      router.replace(data.session ? "/prospeccao" : "/login");
    });
  }, [router]);
  return <div className="splash">Carregando…</div>;
}
