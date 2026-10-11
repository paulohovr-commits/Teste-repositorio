"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { autoColor } from "@/lib/colors";
import { createBoard } from "@/lib/boards";
import { APP_NAME } from "@/lib/config";
import type { Board } from "@/lib/types";
import { useMe } from "./MeContext";

export default function Boards() {
  const me = useMe();
  const router = useRouter();
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function load() {
    const { data } = await supabase.from("boards").select("*").order("created_at");
    setBoards((data as Board[]) || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    const n = name.trim();
    if (!n) return;
    setErr("");
    try {
      const b = await createBoard(n, me.id);
      router.push(`/prospeccao/board/${b.id}`);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function remove(id: string) {
    await supabase.from("boards").delete().eq("id", id);
    setConfirmDel(null);
    load();
  }

  return (
    <div className="page">
      <header className="page-head">
        <div className="logo">◆ {APP_NAME}</div>
        <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>
          Sair
        </button>
      </header>
      <h1 className="page-title">Seus quadros</h1>

      {boards === null ? (
        <p className="muted">Carregando…</p>
      ) : (
        <div className="board-grid">
          {boards.map((b) => (
            <div key={b.id} className="board-tile">
              <span className="tile-strip" style={{ background: autoColor(b.id) }} />
              {confirmDel === b.id ? (
                <div className="tile-confirm">
                  <p>Excluir o quadro e todos os leads dentro? Não dá pra desfazer.</p>
                  <div className="row">
                    <button className="btn btn-danger" onClick={() => remove(b.id)}>
                      Excluir
                    </button>
                    <button className="btn" onClick={() => setConfirmDel(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Link href={`/prospeccao/board/${b.id}`} className="tile-body">
                    <strong>{b.name}</strong>
                    <span className="muted small">{new Date(b.created_at).toLocaleDateString("pt-BR")}</span>
                  </Link>
                  {me.is_owner && b.owner_id === me.id && (
                    <button className="tile-del" title="Excluir quadro" onClick={() => setConfirmDel(b.id)}>
                      🗑
                    </button>
                  )}
                </>
              )}
            </div>
          ))}

          {me.is_owner &&
            (creating ? (
              <div className="board-tile new">
                <input
                  autoFocus
                  className="input"
                  placeholder="Ex.: Clínicas de estética — SP"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") create();
                    if (e.key === "Escape") setCreating(false);
                  }}
                />
                <div className="row">
                  <button className="btn btn-gold" onClick={create}>
                    Criar quadro
                  </button>
                  <button className="btn" onClick={() => setCreating(false)}>
                    Cancelar
                  </button>
                </div>
                {err && <p className="error small">{err}</p>}
              </div>
            ) : (
              <button className="board-tile add" onClick={() => setCreating(true)}>
                + Criar quadro
              </button>
            ))}
        </div>
      )}

      {boards?.length === 0 && (
        <div className="empty">
          {me.is_owner ? (
            <p>
              Comece criando um quadro — um por nicho ou por cidade funciona bem (ex.: <em>Restaurantes — Centro</em>).
              Ele já nasce com as etapas do funil e as etiquetas Quente / Morno / Frio.
            </p>
          ) : (
            <p>Você ainda não foi colocado em nenhum quadro. Peça ao dono do sistema para te dar acesso.</p>
          )}
        </div>
      )}
    </div>
  );
}
