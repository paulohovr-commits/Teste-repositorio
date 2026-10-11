"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { splitLinks } from "@/lib/html";
import { displayName, handle } from "@/lib/people";
import { fmtWhen } from "@/lib/dates";
import type { Comment, Profile } from "@/lib/types";
import { useMe } from "../../MeContext";
import Avatar from "../../Avatar";

const SELECT = "id, card_id, author_id, body, created_at, author:profiles!comments_author_id_fkey(id,name,email)";

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Comentários = o histórico de contato com o lead. Com @menção.
export default function Comments({ cardId, people }: { cardId: string; people: Profile[] }) {
  const me = useMe();
  const [list, setList] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [pop, setPop] = useState<{ start: number; q: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  async function load() {
    const { data } = await supabase.from("comments").select(SELECT).eq("card_id", cardId).order("created_at", { ascending: false });
    setList((data as unknown as Comment[]) || []);
  }
  useEffect(() => {
    load();
    const ch = supabase
      .channel(`comments-${cardId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `card_id=eq.${cardId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  // Handles dos mais longos para os mais curtos: senão "Ana" casa antes de "Ana Paula".
  const handles = useMemo(
    () => people.map((p) => ({ p, h: handle(p) })).sort((a, b) => b.h.length - a.h.length),
    [people],
  );
  const mentionRe = useMemo(
    () => (handles.length ? new RegExp(`@(${handles.map((x) => escapeRe(x.h)).join("|")})`, "g") : null),
    [handles],
  );

  const suggestions = pop
    ? handles.filter((x) => x.h.toLowerCase().includes(pop.q.toLowerCase())).slice(0, 6)
    : [];

  function onChange(v: string, caret: number) {
    setBody(v);
    const before = v.slice(0, caret);
    const m = before.match(/(^|\s)@([^\s@]*)$/);
    setPop(m ? { start: caret - m[2].length - 1, q: m[2] } : null);
  }

  function choose(h: string) {
    if (!pop) return;
    const caret = taRef.current?.selectionStart ?? body.length;
    const next = body.slice(0, pop.start) + "@" + h + " " + body.slice(caret);
    setBody(next);
    setPop(null);
    requestAnimationFrame(() => {
      const pos = pop.start + h.length + 2;
      taRef.current?.focus();
      taRef.current?.setSelectionRange(pos, pos);
    });
  }

  async function send() {
    const text = body.trim();
    if (!text) return;
    setBody("");
    setPop(null);
    const { data } = await supabase
      .from("comments")
      .insert({ card_id: cardId, author_id: me.id, body: text })
      .select(SELECT)
      .single();
    if (!data) return;
    setList((prev) => [data as unknown as Comment, ...prev.filter((c) => c.id !== (data as { id: string }).id)]);
    // É o insert em comment_mentions que dispara a notificação.
    const ids = new Set<string>();
    if (mentionRe) for (const m of text.matchAll(mentionRe)) {
      const hit = handles.find((x) => x.h === m[1]);
      if (hit) ids.add(hit.p.id);
    }
    if (ids.size) {
      await supabase.from("comment_mentions").insert(Array.from(ids, (user_id) => ({ comment_id: (data as { id: string }).id, user_id })));
    }
    // Quem comenta passa a seguir.
    await supabase.from("card_followers").upsert({ card_id: cardId, user_id: me.id });
  }

  async function remove(id: string) {
    setConfirmDel(null);
    setList((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("comments").delete().eq("id", id);
  }

  function render(text: string) {
    // Primeiro as menções; o texto entre elas passa pela linkificação.
    const parts: React.ReactNode[] = [];
    let last = 0;
    let k = 0;
    const pushText = (t: string) =>
      splitLinks(t).forEach((p) =>
        parts.push(
          p.href ? (
            <a key={k++} href={p.href} target="_blank" rel="noreferrer">
              {p.text}
            </a>
          ) : (
            <span key={k++}>{p.text}</span>
          ),
        ),
      );
    if (mentionRe) {
      for (const m of text.matchAll(mentionRe)) {
        pushText(text.slice(last, m.index));
        parts.push(
          <span key={k++} className="mention">
            {m[0]}
          </span>,
        );
        last = (m.index ?? 0) + m[0].length;
      }
    }
    pushText(text.slice(last));
    return parts;
  }

  return (
    <div className="comments">
      <h3 className="side-title">Histórico e comentários</h3>
      <div className="comment-box">
        <textarea
          ref={taRef}
          className="input"
          rows={3}
          placeholder="Registre o contato: “Mandei msg no WhatsApp, pediu orçamento…”  (@ para citar alguém)"
          value={body}
          onChange={(e) => onChange(e.target.value, e.target.selectionStart)}
          onKeyDown={(e) => {
            if (pop && suggestions.length && e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
              e.preventDefault();
              choose(suggestions[0].h);
              return;
            }
            if (e.key === "Escape" && pop) {
              e.stopPropagation();
              setPop(null);
              return;
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
        />
        {pop && !!suggestions.length && (
          <div className="popover mention-pop">
            {suggestions.map((x) => (
              <button key={x.p.id} className="menu-item" onMouseDown={(e) => { e.preventDefault(); choose(x.h); }}>
                <Avatar p={x.p} /> {displayName(x.p)}
              </button>
            ))}
          </div>
        )}
        <div className="row between">
          <span className="muted small">Ctrl/Cmd + Enter envia</span>
          <button className="btn btn-gold btn-sm" onClick={send} disabled={!body.trim()}>
            Comentar
          </button>
        </div>
      </div>
      {!list.length && <p className="muted small">Nenhum registro ainda. Anote aqui cada contato com o lead para não perder o fio.</p>}
      {list.map((c) => (
        <div key={c.id} className="comment">
          <Avatar p={c.author} />
          <div className="comment-main">
            <div className="comment-head">
              <strong>{displayName(c.author)}</strong>
              <span className="muted small">{fmtWhen(c.created_at)}</span>
              {c.author_id === me.id &&
                (confirmDel === c.id ? (
                  <button className="link danger small" onClick={() => remove(c.id)}>
                    confirmar exclusão
                  </button>
                ) : (
                  <button className="link small" onClick={() => setConfirmDel(c.id)}>
                    excluir
                  </button>
                ))}
            </div>
            <div className="comment-body">{render(c.body)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
