"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { displayName } from "@/lib/people";
import type { Profile } from "@/lib/types";
import Avatar from "../../Avatar";

// Só o dono vê. Libera a entrada no sistema e dá acesso ao quadro.
export default function AccessPanel({
  boardId,
  ownerId,
  people,
  onChanged,
  onClose,
}: {
  boardId: string;
  ownerId: string;
  people: Profile[];
  onChanged: () => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);

  async function add() {
    const e = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      setMsg("Digite um e-mail válido.");
      return;
    }
    // A porta do sistema (a tranca de login mora no banco).
    await supabase.from("acesso_permitido").upsert({ valor: e, tipo: "email", nota: "Convidado pelo quadro" });
    const { data: p } = await supabase.from("profiles").select("id").ilike("email", e).maybeSingle();
    if (!p) {
      setMsg(`Entrada liberada para ${e}. Peça para a pessoa entrar uma vez com o Google e volte aqui para dar acesso ao quadro.`);
      return;
    }
    const { error } = await supabase.from("board_members").upsert({ board_id: boardId, user_id: p.id });
    setMsg(error ? error.message : "Acesso dado.");
    setEmail("");
    onChanged();
  }

  async function remove(userId: string) {
    setConfirm(null);
    await supabase.from("board_members").delete().eq("board_id", boardId).eq("user_id", userId);
    onChanged();
  }

  return (
    <div className="popover access-panel">
      <div className="fp-head">
        <strong>Acesso ao quadro</strong>
        <button className="link" onClick={onClose}>
          ✕
        </button>
      </div>
      {people.map((p) => (
        <div key={p.id} className="fp-row between">
          <span className="row">
            <Avatar p={p} />
            <span>
              {displayName(p)}
              <br />
              <span className="muted small">{p.email}</span>
            </span>
          </span>
          {p.id === ownerId ? (
            <span className="muted small">dono · sempre</span>
          ) : confirm === p.id ? (
            <button className="btn btn-danger btn-sm" onClick={() => remove(p.id)}>
              Confirmar
            </button>
          ) : (
            <button className="link" onClick={() => setConfirm(p.id)}>
              remover
            </button>
          )}
        </div>
      ))}
      <h4>Convidar alguém</h4>
      <div className="row">
        <input
          className="input"
          placeholder="email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="btn btn-gold" onClick={add}>
          Dar acesso
        </button>
      </div>
      {msg && <p className="small muted">{msg}</p>}
    </div>
  );
}
