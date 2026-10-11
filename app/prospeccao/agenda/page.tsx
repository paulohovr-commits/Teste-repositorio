"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { dueBucket, fmtDue } from "@/lib/dates";
import { whatsappUrl } from "@/lib/leads";
import { useMe } from "../MeContext";
import Breadcrumb from "../Breadcrumb";

type Row = {
  id: string;
  title: string;
  due: string;
  phone: string | null;
  city: string | null;
  niche: string | null;
  list: { title: string; board_id: string; board: { name: string } | null };
};

// Agenda = os contatos marcados. Só leads onde você é responsável, nunca arquivados.
export default function Agenda() {
  const me = useMe();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    supabase
      .from("card_members")
      .select(
        "card:cards!inner(id,title,due,phone,city,niche,archived_at, list:lists!inner(title,board_id, board:boards(name)))",
      )
      .eq("user_id", me.id)
      .not("card.due", "is", null)
      .is("card.archived_at", null)
      .then(({ data }) => {
        const r = ((data || []) as unknown as { card: Row }[]).map((x) => x.card).filter(Boolean);
        r.sort((a, b) => a.due.localeCompare(b.due));
        setRows(r);
      });
  }, [me.id]);

  const groups: { key: string; title: string; items: Row[] }[] = rows
    ? [
        { key: "late", title: "Atrasados", items: rows.filter((r) => dueBucket(r.due) === "late") },
        { key: "today", title: "Hoje", items: rows.filter((r) => dueBucket(r.due) === "today") },
        { key: "next", title: "Próximos", items: rows.filter((r) => ["week", "later"].includes(dueBucket(r.due))) },
      ]
    : [];

  return (
    <div className="page">
      <Breadcrumb items={[{ label: "Agenda" }]} />
      <h1 className="page-title">📅 Agenda de contatos</h1>
      {rows === null && <p className="muted">Carregando…</p>}
      {rows?.length === 0 && (
        <div className="empty">
          <p>
            Nenhum contato marcado. Abra um lead, preencha <strong>📞 Próximo contato</strong> e ele aparece aqui no dia certo
            — atrasados no topo, em vermelho.
          </p>
        </div>
      )}
      {groups.map(
        (g) =>
          !!g.items.length && (
            <section key={g.key} className="agenda-group">
              <h2 className={`agenda-title ${g.key}`}>
                {g.title} <span className="muted">{g.items.length}</span>
              </h2>
              {g.items.map((r) => {
                const wa = whatsappUrl(r.phone);
                return (
                  <div key={r.id} className="agenda-row">
                    <Link href={`/prospeccao/board/${r.list.board_id}?card=${r.id}`} className="agenda-main">
                      <span className={`badge-date ${dueBucket(r.due)}`}>📞 {fmtDue(r.due)}</span>
                      <strong>{r.title}</strong>
                      <span className="muted small">
                        {[r.city, r.niche].filter(Boolean).join(" · ")}
                        {(r.city || r.niche) && " — "}
                        {r.list.board?.name} › {r.list.title}
                      </span>
                    </Link>
                    {wa && (
                      <a className="btn btn-wa btn-sm" href={wa} target="_blank" rel="noreferrer">
                        💬 WhatsApp
                      </a>
                    )}
                  </div>
                );
              })}
            </section>
          ),
      )}
    </div>
  );
}
