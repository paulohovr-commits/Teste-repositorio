"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LABEL_COLORS } from "@/lib/colors";
import { PROSPECT_CHECKLIST } from "@/lib/config";
import { dateOnlyToIso, isoToDateOnly, isoToLocalInput, localInputToIso } from "@/lib/dates";
import { LEAD_FIELDS, instagramHandle, normalizeField, whatsappUrl, type LeadKey } from "@/lib/leads";
import { displayName } from "@/lib/people";
import type { Board, BoardCard, Checklist, ChecklistItem, Label, List, Profile } from "@/lib/types";
import { useMe } from "../../MeContext";
import Avatar from "../../Avatar";
import RichEditor from "./RichEditor";
import GoogleLinks from "./GoogleLinks";
import Comments from "./Comments";

type CK = Checklist & { items: ChecklistItem[] };

function isTyping(el: Element | null) {
  const h = el as HTMLElement | null;
  return !!h && (h.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(h.tagName));
}

export default function CardModal({
  card,
  board,
  lists,
  labels,
  people,
  patchCard,
  refresh,
  setLabels,
  onClose,
}: {
  card: BoardCard;
  board: Board;
  lists: List[];
  labels: Label[];
  people: Profile[];
  patchCard: (id: string, patch: Partial<BoardCard>) => void;
  refresh: () => void;
  setLabels: React.Dispatch<React.SetStateAction<Label[]>>;
  onClose: () => void;
}) {
  const me = useMe();
  const [title, setTitle] = useState(card.title);
  const [fields, setFields] = useState<Record<LeadKey, string>>(
    () =>
      Object.fromEntries(
        LEAD_FIELDS.map((f) => [f.key, f.key === "instagram" ? instagramHandle(card.instagram) : card[f.key] == null ? "" : String(card[f.key])]),
      ) as Record<LeadKey, string>,
  );
  const [pop, setPop] = useState<"labels" | "members" | null>(null);
  const [editLabel, setEditLabel] = useState<string | null>(null);
  const [delLabel, setDelLabel] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState<{ name: string; color: string } | null>(null);
  const [checks, setChecks] = useState<CK[]>([]);
  const [newItem, setNewItem] = useState<Record<string, string>>({});
  const [delCheck, setDelCheck] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const has = (uid: string) => card.card_members.some((m) => m.user_id === uid);

  // ---------- carga do que o quadro não traz ----------

  const loadChecks = useCallback(async () => {
    const { data } = await supabase
      .from("checklists")
      .select("*, items:checklist_items(*)")
      .eq("card_id", card.id)
      .order("position");
    setChecks(
      ((data as CK[]) || []).map((c) => ({ ...c, items: c.items.slice().sort((a, b) => a.position - b.position) })),
    );
  }, [card.id]);

  useEffect(() => {
    loadChecks();
    supabase
      .from("card_followers")
      .select("user_id")
      .eq("card_id", card.id)
      .eq("user_id", me.id)
      .maybeSingle()
      .then(({ data }) => setFollowing(!!data));
  }, [card.id, me.id, loadChecks]);

  // ---------- gravação ----------

  async function update(patch: Partial<BoardCard>) {
    patchCard(card.id, patch);
    await supabase.from("cards").update(patch).eq("id", card.id);
  }

  async function saveTitle() {
    const t = title.trim();
    if (!t) return setTitle(card.title); // nunca aceita vazio
    if (t !== card.title) update({ title: t });
  }

  async function saveField(key: LeadKey) {
    const v = normalizeField(key, fields[key]);
    if ((card[key] ?? null) === v) return;
    update({ [key]: v } as Partial<BoardCard>);
    if (key === "instagram") setFields((f) => ({ ...f, instagram: instagramHandle(v as string | null) }));
    if (key !== "instagram" && typeof v === "string") setFields((f) => ({ ...f, [key]: v }));
  }

  async function toggleLabel(labelId: string) {
    const on = card.card_labels.some((l) => l.label_id === labelId);
    patchCard(card.id, {
      card_labels: on ? card.card_labels.filter((l) => l.label_id !== labelId) : [...card.card_labels, { label_id: labelId }],
    });
    if (on) await supabase.from("card_labels").delete().eq("card_id", card.id).eq("label_id", labelId);
    else await supabase.from("card_labels").insert({ card_id: card.id, label_id: labelId });
  }

  async function renameLabel(l: Label, name: string) {
    setEditLabel(null);
    if (name === l.name) return;
    setLabels((prev) => prev.map((x) => (x.id === l.id ? { ...x, name } : x)));
    await supabase.from("labels").update({ name }).eq("id", l.id);
  }

  async function deleteLabel(id: string) {
    setDelLabel(null);
    setEditLabel(null);
    setLabels((prev) => prev.filter((x) => x.id !== id));
    await supabase.from("labels").delete().eq("id", id);
    refresh();
  }

  async function createLabel() {
    if (!newLabel) return;
    const { data } = await supabase
      .from("labels")
      .insert({ board_id: board.id, name: newLabel.name.trim(), color: newLabel.color, position: labels.length })
      .select()
      .single();
    setNewLabel(null);
    if (data) setLabels((prev) => [...prev, data as Label]);
  }

  async function toggleMember(uid: string) {
    const on = has(uid);
    patchCard(card.id, {
      card_members: on ? card.card_members.filter((m) => m.user_id !== uid) : [...card.card_members, { user_id: uid }],
    });
    if (on) await supabase.from("card_members").delete().eq("card_id", card.id).eq("user_id", uid);
    else await supabase.from("card_members").insert({ card_id: card.id, user_id: uid });
  }

  async function toggleFollow() {
    setFollowing(!following);
    if (following) await supabase.from("card_followers").delete().eq("card_id", card.id).eq("user_id", me.id);
    else await supabase.from("card_followers").upsert({ card_id: card.id, user_id: me.id });
  }

  // ---------- checklist ----------

  async function addChecklist(script: boolean) {
    const { data } = await supabase
      .from("checklists")
      .insert({ card_id: card.id, title: script ? PROSPECT_CHECKLIST.title : "Checklist", position: checks.length })
      .select()
      .single();
    if (data && script) {
      await supabase
        .from("checklist_items")
        .insert(PROSPECT_CHECKLIST.items.map((text, position) => ({ checklist_id: data.id, text, position })));
    }
    loadChecks();
    refresh();
  }

  async function addItem(ck: CK) {
    const text = (newItem[ck.id] || "").trim();
    if (!text) return;
    setNewItem((s) => ({ ...s, [ck.id]: "" }));
    await supabase.from("checklist_items").insert({ checklist_id: ck.id, text, position: ck.items.length });
    loadChecks();
    refresh();
  }

  async function toggleItem(it: ChecklistItem) {
    setChecks((prev) =>
      prev.map((c) => ({ ...c, items: c.items.map((i) => (i.id === it.id ? { ...i, done: !i.done } : i)) })),
    );
    await supabase.from("checklist_items").update({ done: !it.done }).eq("id", it.id);
    refresh();
  }

  async function editItem(it: ChecklistItem, text: string) {
    const t = text.trim();
    if (t === it.text) return;
    if (!t) await supabase.from("checklist_items").delete().eq("id", it.id);
    else await supabase.from("checklist_items").update({ text: t }).eq("id", it.id);
    loadChecks();
    refresh();
  }

  async function renameChecklist(ck: CK, t: string) {
    const v = t.trim() || "Checklist";
    if (v !== ck.title) await supabase.from("checklists").update({ title: v }).eq("id", ck.id);
  }

  async function removeChecklist(id: string) {
    setDelCheck(null);
    await supabase.from("checklists").delete().eq("id", id);
    loadChecks();
    refresh();
  }

  // ---------- ações ----------

  async function archive() {
    onClose();
    await supabase.from("cards").update({ archived_at: new Date().toISOString() }).eq("id", card.id);
    refresh();
  }

  async function destroy() {
    onClose();
    await supabase.from("cards").delete().eq("id", card.id);
    refresh();
  }

  // ---------- atalhos: Esc fecha; Espaço me atribui ----------

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (pop) setPop(null);
        else if (!isTyping(document.activeElement)) onClose();
        else (document.activeElement as HTMLElement).blur();
      }
      if (e.key === " " && !isTyping(document.activeElement) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleMember(me.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const cardLabels = labels.filter((l) => card.card_labels.some((x) => x.label_id === l.id));
  const wa = whatsappUrl(card.phone);

  return (
    <div className="veil" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal card-modal" role="dialog">
        <header className="modal-top">
          <select className="input list-select" value={card.list_id} onChange={(e) => update({ list_id: e.target.value })}>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
          <button className="x" onClick={onClose} title="Fechar (Esc)">
            ✕
          </button>
        </header>

        <div className="modal-cols">
          <div className="modal-left">
            <textarea
              className="title-input"
              rows={1}
              value={title}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), (e.target as HTMLTextAreaElement).blur())}
            />

            <div className="action-bar">
              <div className="pop-anchor">
                <button className="btn btn-sm" onClick={() => setPop(pop === "labels" ? null : "labels")}>
                  🏷 Etiquetas
                </button>
                {pop === "labels" && (
                  <div className="popover labels-pop">
                    {labels.map((l) =>
                      editLabel === l.id ? (
                        <div key={l.id} className="label-edit">
                          <input
                            className="input"
                            autoFocus
                            defaultValue={l.name}
                            onKeyDown={(e) => e.key === "Enter" && renameLabel(l, (e.target as HTMLInputElement).value)}
                            onBlur={(e) => delLabel !== l.id && renameLabel(l, e.target.value)}
                          />
                          {delLabel === l.id ? (
                            <div className="confirm small">
                              Tira essa etiqueta de TODOS os leads do quadro.
                              <button className="btn btn-danger btn-sm" onMouseDown={(e) => e.preventDefault()} onClick={() => deleteLabel(l.id)}>
                                Excluir
                              </button>
                              <button className="btn btn-sm" onMouseDown={(e) => e.preventDefault()} onClick={() => setDelLabel(null)}>
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button className="link danger" onMouseDown={(e) => e.preventDefault()} onClick={() => setDelLabel(l.id)}>
                              🗑
                            </button>
                          )}
                        </div>
                      ) : (
                        <div key={l.id} className="label-row">
                          <button className="label-pick" style={{ background: l.color }} onClick={() => toggleLabel(l.id)}>
                            {l.name}
                            {card.card_labels.some((x) => x.label_id === l.id) && <span className="check">✓</span>}
                          </button>
                          <button className="link" onClick={() => setEditLabel(l.id)} title="Editar">
                            ✎
                          </button>
                        </div>
                      ),
                    )}
                    {newLabel ? (
                      <div className="label-new">
                        <input
                          className="input"
                          autoFocus
                          placeholder="Nome (opcional)"
                          value={newLabel.name}
                          onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
                          onKeyDown={(e) => e.key === "Enter" && createLabel()}
                        />
                        <div className="swatches">
                          {LABEL_COLORS.map((c) => (
                            <button
                              key={c}
                              className={`swatch ${newLabel.color === c ? "on" : ""}`}
                              style={{ background: c }}
                              onClick={() => setNewLabel({ ...newLabel, color: c })}
                            />
                          ))}
                        </div>
                        <button className="btn btn-gold btn-sm" onClick={createLabel}>
                          Criar etiqueta
                        </button>
                      </div>
                    ) : (
                      <button className="menu-item" onClick={() => setNewLabel({ name: "", color: LABEL_COLORS[0] })}>
                        + Nova etiqueta
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="pop-anchor">
                <button className="btn btn-sm" onClick={() => setPop(pop === "members" ? null : "members")}>
                  👤 Responsáveis
                </button>
                {pop === "members" && (
                  <div className="popover">
                    {people.map((p) => (
                      <button key={p.id} className="menu-item" onClick={() => toggleMember(p.id)}>
                        <Avatar p={p} />
                        <span className="grow">
                          {displayName(p)}
                          <br />
                          <span className="muted small">{p.email}</span>
                        </span>
                        {has(p.id) && <span className="check">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="btn btn-sm" onClick={() => addChecklist(false)}>
                ☑ Checklist
              </button>
              <button className={`btn btn-sm ${following ? "on" : ""}`} onClick={toggleFollow}>
                👁 {following ? "Seguindo" : "Seguir"}
              </button>
            </div>

            {(!!cardLabels.length || !!card.card_members.length) && (
              <div className="chips">
                {cardLabels.map((l) => (
                  <span key={l.id} className="label-chip" style={{ background: l.color }}>
                    {l.name || " "}
                  </span>
                ))}
                {card.card_members.map((m) => (
                  <Avatar key={m.user_id} p={people.find((p) => p.id === m.user_id)} size={26} />
                ))}
              </div>
            )}

            <section className="lead-box">
              <h3 className="sec-title">Dados do lead</h3>
              <div className="lead-grid">
                {LEAD_FIELDS.map((f) => {
                  const link =
                    f.key === "phone" ? wa : f.link && card[f.key] ? String(card[f.key]) : "";
                  return (
                    <label key={f.key} className="lead-field">
                      <span>{f.label}</span>
                      <span className="lead-input">
                        <input
                          className="input"
                          placeholder={f.placeholder}
                          inputMode={f.key === "deal_value" ? "decimal" : f.key === "phone" ? "tel" : undefined}
                          value={fields[f.key]}
                          onChange={(e) => setFields((s) => ({ ...s, [f.key]: e.target.value }))}
                          onBlur={() => saveField(f.key)}
                          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                        />
                        {link && (
                          <a className="open-link" href={link} target="_blank" rel="noreferrer" title="Abrir">
                            {f.key === "phone" ? "💬" : "↗"}
                          </a>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>

            <div className="dates">
              <label>
                <span>Início</span>
                <input
                  type="date"
                  className="input"
                  value={isoToDateOnly(card.start_date)}
                  onChange={(e) => update({ start_date: dateOnlyToIso(e.target.value) })}
                />
              </label>
              <label>
                <span>📞 Próximo contato</span>
                <input
                  type="datetime-local"
                  className="input"
                  value={isoToLocalInput(card.due)}
                  onChange={(e) => update({ due: localInputToIso(e.target.value) })}
                />
              </label>
            </div>

            <section>
              <h3 className="sec-title">Anotações</h3>
              <RichEditor html={card.description || ""} onSave={(description) => update({ description })} />
              <GoogleLinks html={card.description || ""} />
            </section>

            {checks.map((ck) => {
              const done = ck.items.filter((i) => i.done).length;
              const pct = ck.items.length ? Math.round((done / ck.items.length) * 100) : 0;
              return (
                <section key={ck.id} className="checklist">
                  <div className="ck-head">
                    <input className="ck-title" defaultValue={ck.title} onBlur={(e) => renameChecklist(ck, e.target.value)} />
                    {delCheck === ck.id ? (
                      <span className="small">
                        Excluir a checklist?{" "}
                        <button className="link danger" onClick={() => removeChecklist(ck.id)}>
                          sim
                        </button>{" "}
                        <button className="link" onClick={() => setDelCheck(null)}>
                          não
                        </button>
                      </span>
                    ) : (
                      <button className="link small" onClick={() => setDelCheck(ck.id)}>
                        excluir
                      </button>
                    )}
                  </div>
                  <div className="progress">
                    <span className="pct">{pct}%</span>
                    <span className="bar">
                      <span style={{ width: `${pct}%` }} className={pct === 100 ? "full" : ""} />
                    </span>
                  </div>
                  {ck.items.map((it) => (
                    <div key={it.id} className={`ck-item ${it.done ? "done" : ""}`}>
                      <input type="checkbox" checked={it.done} onChange={() => toggleItem(it)} />
                      <input className="ck-text" defaultValue={it.text} onBlur={(e) => editItem(it, e.target.value)} />
                    </div>
                  ))}
                  <input
                    className="input ck-add"
                    placeholder="Adicionar um item (Enter)"
                    value={newItem[ck.id] || ""}
                    onChange={(e) => setNewItem((s) => ({ ...s, [ck.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addItem(ck)}
                  />
                </section>
              );
            })}
            {!checks.some((c) => c.title === PROSPECT_CHECKLIST.title) && (
              <button className="link" onClick={() => addChecklist(true)}>
                + Adicionar o roteiro de prospecção
              </button>
            )}
          </div>

          <aside className="modal-right">
            <h3 className="side-title">Ações</h3>
            <div className="side-actions">
              {wa && (
                <a className="btn btn-wa" href={wa} target="_blank" rel="noreferrer">
                  💬 Chamar no WhatsApp
                </a>
              )}
              <button className="btn" onClick={archive}>
                🗄 Arquivar lead
              </button>
              {confirmDelete ? (
                <button className="btn btn-danger" onClick={destroy}>
                  🗑 Confirmar, apaga o histórico junto
                </button>
              ) : (
                <button className="btn btn-ghost" onClick={() => setConfirmDelete(true)}>
                  🗑 Excluir de vez…
                </button>
              )}
            </div>
            <p className="muted small hint">
              Dica: <kbd>Espaço</kbd> te coloca como responsável · <kbd>Esc</kbd> fecha
            </p>
            <Comments cardId={card.id} people={people} />
          </aside>
        </div>
      </div>
    </div>
  );
}
