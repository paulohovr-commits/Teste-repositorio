"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { displayName } from "@/lib/people";
import { fmtWhen } from "@/lib/dates";
import type { Notification, Profile } from "@/lib/types";
import { useMe } from "../MeContext";
import Breadcrumb from "../Breadcrumb";
import Avatar from "../Avatar";

type Row = Notification & {
  actor: Pick<Profile, "id" | "name" | "email"> | null;
  card: { title: string } | null;
  board: { name: string } | null;
};

const PHRASE: Record<string, string> = {
  mention: "mencionou você",
  comment: "comentou num lead que você segue",
  assigned: "colocou você num lead",
};

export default function Inbox() {
  const me = useMe();
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);

  async function load() {
    const { data } = await supabase
      .from("notifications")
      .select("*, actor:profiles!notifications_actor_id_fkey(id,name,email), card:cards(title), board:boards(name)")
      .eq("user_id", me.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data as unknown as Row[]) || []);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id]);

  async function open(n: Row) {
    if (!n.read_at) await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    if (n.board_id) router.push(`/prospeccao/board/${n.board_id}?card=${n.card_id}`);
  }

  async function readAll() {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", me.id).is("read_at", null);
    load();
  }

  return (
    <div className="page">
      <Breadcrumb items={[{ label: "Caixa de entrada" }]} />
      <div className="row between">
        <h1 className="page-title">📥 Caixa de entrada</h1>
        {rows?.some((r) => !r.read_at) && (
          <button className="btn btn-dark" onClick={readAll}>
            Marcar tudo como lido
          </button>
        )}
      </div>
      {rows === null && <p className="muted">Carregando…</p>}
      {rows?.length === 0 && (
        <div className="empty">
          <p>
            Nada por aqui. Quando alguém te citar com <strong>@</strong> num comentário, ou comentar num lead que você
            segue, aparece aqui.
          </p>
        </div>
      )}
      <div className="inbox">
        {rows?.map((n) => (
          <button key={n.id} className={`inbox-row ${n.read_at ? "" : "unread"}`} onClick={() => open(n)}>
            <Avatar p={n.actor} size={30} />
            <span className="inbox-main">
              <span>
                <strong>{displayName(n.actor)}</strong> {PHRASE[n.type] || n.type}
              </span>
              {n.body && <span className="inbox-body">“{n.body.slice(0, 160)}”</span>}
              <span className="muted small">
                {n.card?.title} · {n.board?.name} · {fmtWhen(n.created_at)}
              </span>
            </span>
            {!n.read_at && <span className="unread-dot" />}
          </button>
        ))}
      </div>
    </div>
  );
}
