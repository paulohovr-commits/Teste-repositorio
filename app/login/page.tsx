"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { APP_NAME } from "@/lib/config";

export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    const msg = h.get("error_description");
    if (msg) {
      setError(
        /fora da empresa|Database error/i.test(msg)
          ? "Essa conta não tem permissão para entrar. Peça ao dono para liberar o seu e-mail."
          : msg.replace(/\+/g, " "),
      );
      // Limpa o hash para recarregar a página não ressuscitar o erro.
      history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function entrar() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <div className="login-box">
        <div className="logo">◆ {APP_NAME}</div>
        <p className="muted">Seu funil de prospecção, organizado.</p>
        <button className="btn btn-gold btn-lg" onClick={entrar} disabled={busy}>
          {busy ? "Abrindo o Google…" : "Entrar com Google"}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}
