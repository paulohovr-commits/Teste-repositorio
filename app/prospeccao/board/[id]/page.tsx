"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { autoColor } from "@/lib/colors";
import { dueBucket, fmtDue } from "@/lib/dates";
import { stripTags } from "@/lib/html";
import { instagramHandle, parseLeadBlock, whatsappUrl } from "@/lib/leads";
import { downloadCsv, insertLeads } from "@/lib/leadsDb";
import type { Board, BoardCard, Label, List, Profile } from "@/lib/types";
import { useMe } from "../../MeContext";
import { LAST_BOARD_KEY } from "../../BottomBar";
import Breadcrumb from "../../Breadcrumb";
import Avatar from "../../Avatar";
import CardModal from "./CardModal";
import FilterPanel, { emptyFilters, activeCount, matches, type Filters } from "./FilterPanel";
import ImportModal from "./ImportModal";
import AccessPanel from "./AccessPanel";

const PAGE = 1000;

async function fetchCards(listIds: string[]): Promise<BoardCard[]> {
  const out: BoardCard[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("cards")
      .select("*, card_labels(label_id), card_members(user_id), checklists(id, checklist_items(done))")
      .in("list_id", listIds)
      .is("archived_at", null)
      .order("position")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    out.push(...(data as BoardCard[]));
    if (data.length < PAGE) break;
  }
  return out;
}

export default function BoardPage() {
  return (
    <Suspense fallback={<div className="splash">Carregando…</div>}>
      <BoardInner />
    </Suspense>
  );
}

type Drag = {
  kind: "card" | "list";
  id: string;
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  el: HTMLElement;
  ghost?: HTMLElement;
  started: boolean;
};

function BoardInner() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const me = useMe();

  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [cards, setCards] = useState<BoardCard[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);

  const [openCard, setOpenCard] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [onlyMine, setOnlyMine] = useState(false);
  const [panel, setPanel] = useState<"filters" | "import" | "access" | null>(null);

  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editingList, setEditingList] = useState<string | null>(null);
  const [listMenu, setListMenu] = useState<string | null>(null);
  const [confirmList, setConfirmList] = useState<{ id: string; action: "archive" | "delete" } | null>(null);
  const [newList, setNewList] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);

  // ---------- carga e tempo real ----------

  const fetchAll = useCallback(async () => {
    const { data: b } = await supabase.from("boards").select("*").eq("id", id).maybeSingle();
    if (!b) {
      setMissing(true);
      setLoaded(true);
      return;
    }
    const [{ data: ls }, { data: lbs }, { data: bm }] = await Promise.all([
      supabase.from("lists").select("*").eq("board_id", id).order("position"),
      supabase.from("labels").select("*").eq("board_id", id).order("position"),
      supabase.from("board_members").select("user_id").eq("board_id", id),
    ]);
    const listIds = (ls || []).map((l) => l.id as string);
    const [cs, { data: ps }] = await Promise.all([
      listIds.length ? fetchCards(listIds) : Promise.resolve([]),
      supabase
        .from("profiles")
        .select("*")
        .in("id", [b.owner_id, ...(bm || []).map((x) => x.user_id)]),
    ]);
    setBoard(b as Board);
    setLists((ls as List[]) || []);
    setLabels((lbs as Label[]) || []);
    setCards(cs);
    setPeople((ps as Profile[]) || []);
    setLoaded(true);
  }, [id]);

  useEffect(() => {
    fetchAll();
    try {
      localStorage.setItem(LAST_BOARD_KEY, id);
    } catch {}
    // Rebuscar tudo a cada evento é mais simples e mais correto que aplicar patch.
    let t: ReturnType<typeof setTimeout> | undefined;
    const refetch = () => {
      clearTimeout(t);
      t = setTimeout(fetchAll, 250);
    };
    const ch = supabase.channel(`board-${id}`);
    for (const table of ["cards", "lists", "card_members", "labels", "card_labels", "checklists", "checklist_items", "boards"]) {
      ch.on("postgres_changes", { event: "*", schema: "public", table }, refetch);
    }
    ch.subscribe();
    return () => {
      clearTimeout(t);
      supabase.removeChannel(ch);
    };
  }, [id, fetchAll]);

  // Deep link ?card=: abre uma vez, depois que os cartões carregaram.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (!loaded || deepLinked.current) return;
    deepLinked.current = true;
    const c = search.get("card");
    if (c) setOpenCard(c);
  }, [loaded, search]);

  // ---------- filtros e "só os meus" (tecla Q) ----------

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "q" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (openCard || panel === "import") return;
      e.preventDefault();
      setOnlyMine((v) => !v);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openCard, panel]);

  const visible = useMemo(
    () => cards.filter((c) => matches(c, filters) && (!onlyMine || c.card_members.some((m) => m.user_id === me.id))),
    [cards, filters, onlyMine, me.id],
  );
  const byList = useMemo(() => {
    const m = new Map<string, BoardCard[]>();
    for (const l of lists) m.set(l.id, []);
    for (const c of visible) m.get(c.list_id)?.push(c);
    for (const arr of m.values()) arr.sort((a, b) => a.position - b.position);
    return m;
  }, [visible, lists]);
  const countByList = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cards) m.set(c.list_id, (m.get(c.list_id) || 0) + 1);
    return m;
  }, [cards]);
  const nFilters = activeCount(filters) + (onlyMine ? 1 : 0);

  // ---------- edição local ----------

  const patchCard = useCallback((cardId: string, patch: Partial<BoardCard>) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, ...patch } : c)));
  }, []);

  async function createCard(listId: string, text: string) {
    const t = text.trim();
    if (!t) return;
    // Colou um link do Instagram, um site ou um WhatsApp? Vira lead já preenchido.
    const looksLikeLead = /https?:\/\/|www\.|@\w|\d{4}[-\s]?\d{4}/.test(t);
    const d = looksLikeLead ? parseLeadBlock(t) : null;
    const position = Math.max(-1, ...cards.filter((c) => c.list_id === listId).map((c) => c.position)) + 1;
    if (d) {
      await insertLeads([d], {
        boardId: id, meId: me.id, lists, labels, existing: [], defaultListId: listId,
        checklist: false, autoLabels: true, skipDuplicates: false,
      });
      fetchAll();
      return;
    }
    const { data } = await supabase.from("cards").insert({ list_id: listId, title: t, position }).select().single();
    if (data) {
      // Quem cria vira responsável.
      await supabase.from("card_members").insert({ card_id: data.id, user_id: me.id });
      setCards((prev) => [
        ...prev,
        { ...(data as BoardCard), card_labels: [], card_members: [{ user_id: me.id }], checklists: [] },
      ]);
    }
  }

  async function renameList(l: List, title: string) {
    setEditingList(null);
    const t = title.trim();
    if (!t || t === l.title) return;
    setLists((prev) => prev.map((x) => (x.id === l.id ? { ...x, title: t } : x)));
    await supabase.from("lists").update({ title: t }).eq("id", l.id);
  }

  async function addList() {
    const t = (newList || "").trim();
    setNewList(null);
    if (!t) return;
    await supabase.from("lists").insert({ board_id: id, title: t, position: lists.length });
    fetchAll();
  }

  async function listAction(listId: string, action: "archive" | "delete") {
    setConfirmList(null);
    setListMenu(null);
    if (action === "archive") {
      const ids = cards.filter((c) => c.list_id === listId).map((c) => c.id);
      setCards((prev) => prev.filter((c) => c.list_id !== listId));
      for (let i = 0; i < ids.length; i += 200) {
        await supabase.from("cards").update({ archived_at: new Date().toISOString() }).in("id", ids.slice(i, i + 200));
      }
    } else {
      setLists((prev) => prev.filter((l) => l.id !== listId));
      await supabase.from("lists").delete().eq("id", listId);
    }
    fetchAll();
  }

  async function renameBoard(name: string) {
    setEditingName(false);
    const n = name.trim();
    if (!board || !n || n === board.name) return;
    setBoard({ ...board, name: n });
    await supabase.from("boards").update({ name: n }).eq("id", board.id);
  }

  // ---------- arrastar (na mão, nunca HTML5 drag and drop) ----------

  const drag = useRef<Drag | null>(null);
  const cardsRef = useRef(cards);
  const listsRef = useRef(lists);
  cardsRef.current = cards;
  listsRef.current = lists;
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ listId: string; beforeId: string | null } | null>(null);
  const [listDrop, setListDrop] = useState<number | null>(null);
  const dropRef = useRef(drop);
  const listDropRef = useRef(listDrop);
  const canvasRef = useRef<HTMLDivElement>(null);

  const setDropBoth = (v: typeof drop) => {
    const cur = dropRef.current;
    if (cur?.listId === v?.listId && cur?.beforeId === v?.beforeId) return;
    dropRef.current = v;
    setDrop(v);
  };
  const setListDropBoth = (v: number | null) => {
    if (listDropRef.current === v) return;
    listDropRef.current = v;
    setListDrop(v);
  };

  async function moveCard(cardId: string, listId: string, beforeId: string | null) {
    const all = cardsRef.current;
    const card = all.find((c) => c.id === cardId);
    if (!card) return;
    const target = all.filter((c) => c.list_id === listId && c.id !== cardId).sort((a, b) => a.position - b.position);
    let idx = beforeId ? target.findIndex((c) => c.id === beforeId) : target.length;
    if (idx < 0) idx = target.length;
    target.splice(idx, 0, card);
    const changes = new Map<string, { list_id: string; position: number }>();
    target.forEach((c, i) => {
      if (c.position !== i || c.list_id !== listId) changes.set(c.id, { list_id: listId, position: i });
    });
    if (!changes.size) return;
    // A tela responde antes do banco.
    setCards((prev) => prev.map((c) => (changes.has(c.id) ? { ...c, ...changes.get(c.id)! } : c)));
    await Promise.all(Array.from(changes, ([cid, v]) => supabase.from("cards").update(v).eq("id", cid)));
  }

  async function moveList(listId: string, index: number) {
    const rest = listsRef.current.filter((l) => l.id !== listId);
    const moving = listsRef.current.find((l) => l.id === listId);
    if (!moving) return;
    rest.splice(index, 0, moving);
    const changed = rest.map((l, i) => ({ ...l, position: i })).filter((l, i) => rest[i].position !== i);
    setLists(rest.map((l, i) => ({ ...l, position: i })));
    await Promise.all(changed.map((l) => supabase.from("lists").update({ position: l.position }).eq("id", l.id)));
  }

  function onMove(e: PointerEvent) {
    const d = drag.current;
    if (!d) return;
    if (!d.started) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 5) return; // abaixo de 5px é clique
      d.started = true;
      const g = d.el.cloneNode(true) as HTMLElement;
      g.classList.add("ghost");
      g.style.width = `${d.el.offsetWidth}px`;
      if (d.kind === "list") g.style.height = `${Math.min(d.el.offsetHeight, 420)}px`;
      document.body.appendChild(g);
      d.ghost = g;
      document.body.classList.add("is-dragging");
      setDragId(d.id);
    }
    e.preventDefault();
    d.ghost!.style.transform = `translate(${e.clientX - d.dx}px, ${e.clientY - d.dy}px) rotate(2deg)`;

    const canvas = canvasRef.current;
    if (canvas) {
      const r = canvas.getBoundingClientRect();
      if (e.clientX > r.right - 60) canvas.scrollLeft += 18;
      else if (e.clientX < r.left + 60) canvas.scrollLeft -= 18;
    }

    const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    if (d.kind === "card") {
      const listEl = under?.closest<HTMLElement>("[data-list-id]");
      if (!listEl) return setDropBoth(null);
      const cardsEl = listEl.querySelector<HTMLElement>(".list-cards");
      if (cardsEl) {
        const cr = cardsEl.getBoundingClientRect();
        if (e.clientY > cr.bottom - 40) cardsEl.scrollTop += 12;
        else if (e.clientY < cr.top + 40) cardsEl.scrollTop -= 12;
      }
      const els = Array.from(listEl.querySelectorAll<HTMLElement>("[data-card-id]")).filter((x) => x.dataset.cardId !== d.id);
      let beforeId: string | null = null;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) {
          beforeId = el.dataset.cardId!;
          break;
        }
      }
      setDropBoth({ listId: listEl.dataset.listId!, beforeId });
    } else if (canvas) {
      const cols = Array.from(canvas.querySelectorAll<HTMLElement>("[data-list-col]")).filter((x) => x.dataset.listCol !== d.id);
      let index = cols.length;
      for (let i = 0; i < cols.length; i++) {
        const r = cols[i].getBoundingClientRect();
        if (e.clientX < r.left + r.width / 2) {
          index = i;
          break;
        }
      }
      setListDropBoth(index);
    }
  }

  function endDrag(e: PointerEvent, cancelled: boolean) {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.started) {
      if (!cancelled && d.kind === "card") setOpenCard(d.id);
      return;
    }
    d.ghost?.remove();
    document.body.classList.remove("is-dragging");
    setDragId(null);
    const t = dropRef.current;
    const li = listDropRef.current;
    setDropBoth(null);
    setListDropBoth(null);
    if (cancelled) return;
    if (d.kind === "card" && t) moveCard(d.id, t.listId, t.beforeId);
    if (d.kind === "list" && li != null) moveList(d.id, li);
    void e;
  }
  function onUp(e: PointerEvent) {
    endDrag(e, false);
  }
  function onCancel(e: PointerEvent) {
    endDrag(e, true);
  }

  function startDrag(e: React.PointerEvent, kind: Drag["kind"], dragIdArg: string, el: HTMLElement) {
    if (e.button !== 0) return;
    if (kind === "card" && (e.target as HTMLElement).closest("a,button,input,textarea,select")) return;
    const r = el.getBoundingClientRect();
    drag.current = { kind, id: dragIdArg, x0: e.clientX, y0: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, el, started: false };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  }

  // ---------- render ----------

  if (!loaded) return <div className="splash">Carregando o quadro…</div>;
  if (missing || !board) {
    return (
      <div className="page">
        <Breadcrumb items={[{ label: "Quadro" }]} />
        <div className="empty">
          <p>Esse quadro não existe ou você não tem acesso a ele. Peça acesso ao dono, ou volte aos seus quadros.</p>
        </div>
      </div>
    );
  }

  const isOwner = board.owner_id === me.id;
  const listsShown = lists.slice().sort((a, b) => a.position - b.position);
  const open = openCard ? cards.find((c) => c.id === openCard) : null;

  return (
    <div className="board-shell">
      <div className="board-bar">
        <Breadcrumb items={[{ label: board.name }]} />
      </div>
      <header className="board-head">
        {editingName && isOwner ? (
          <input
            className="input board-name-input"
            autoFocus
            defaultValue={board.name}
            onBlur={(e) => renameBoard(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setEditingName(false);
            }}
          />
        ) : (
          <h1 className="board-name" onClick={() => isOwner && setEditingName(true)}>
            {board.name}
          </h1>
        )}
        <span className="pill">
          {nFilters ? `${visible.length} de ${cards.length} leads` : `${cards.length} leads`}
        </span>
        <div className="board-actions">
          <div className="pop-anchor">
            <button className={`btn btn-dark ${nFilters ? "on" : ""}`} onClick={() => setPanel(panel === "filters" ? null : "filters")}>
              ⚲ Filtros{nFilters ? <span className="count">{nFilters}</span> : null}
            </button>
            {panel === "filters" && (
              <FilterPanel
                filters={filters}
                setFilters={setFilters}
                labels={labels}
                people={people}
                onClose={() => setPanel(null)}
                onClear={() => {
                  setFilters(emptyFilters);
                  setOnlyMine(false);
                }}
              />
            )}
          </div>
          <button className={`btn btn-dark ${onlyMine ? "on" : ""}`} onClick={() => setOnlyMine((v) => !v)} title="Atalho: Q">
            👤 Só meus <kbd>Q</kbd>
          </button>
          <button className="btn btn-gold" onClick={() => setPanel("import")}>
            📋 Colar / importar leads
          </button>
          <button
            className="btn btn-dark"
            onClick={() => downloadCsv(`${board.name}.csv`, visible, lists, labels, people)}
            title="Baixa os leads visíveis (com filtros) em CSV para Excel / Google Planilhas"
          >
            ⬇ Planilha
          </button>
          {isOwner && (
            <div className="pop-anchor">
              <button className="btn btn-dark" onClick={() => setPanel(panel === "access" ? null : "access")}>
                👥 Acesso
              </button>
              {panel === "access" && (
                <AccessPanel boardId={board.id} ownerId={board.owner_id} people={people} onChanged={fetchAll} onClose={() => setPanel(null)} />
              )}
            </div>
          )}
        </div>
      </header>

      <div className="board-canvas" ref={canvasRef}>
        {listsShown.map((l, li) => {
          const items = byList.get(l.id) || [];
          const color = autoColor(l.id);
          return (
            <div key={l.id} style={{ display: "contents" }}>
              {listDrop === li && dragId && <div className="list-drop" />}
              <section
                className={`list ${drop?.listId === l.id ? "drop-on" : ""} ${dragId === l.id ? "dragging-src" : ""}`}
                data-list-id={l.id}
                data-list-col={l.id}
              >
                <span className="list-strip" style={{ background: color }} />
                <header className="list-head">
                  <span
                    className="list-handle"
                    title="Arraste para reordenar"
                    onPointerDown={(e) => startDrag(e, "list", l.id, e.currentTarget.closest("section") as HTMLElement)}
                  >
                    ⋮⋮
                  </span>
                  {editingList === l.id ? (
                    <input
                      className="list-title-input"
                      autoFocus
                      defaultValue={l.title}
                      onBlur={(e) => renameList(l, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setEditingList(null);
                      }}
                    />
                  ) : (
                    <h2 className="list-title" onClick={() => setEditingList(l.id)}>
                      {l.title}
                    </h2>
                  )}
                  <span className="dot" style={{ background: color }} />
                  <span className="list-count">{countByList.get(l.id) || 0}</span>
                  <button className="list-menu-btn" onClick={() => setListMenu(listMenu === l.id ? null : l.id)} title="Mais">
                    ⋯
                  </button>
                  {listMenu === l.id && (
                    <div className="popover list-menu" onMouseLeave={() => setListMenu(null)}>
                      {confirmList?.id === l.id ? (
                        <>
                          <p className="small">
                            {confirmList.action === "archive"
                              ? `Arquivar os ${countByList.get(l.id) || 0} leads desta etapa? Eles somem do quadro, mas continuam guardados.`
                              : `Excluir a etapa e os ${countByList.get(l.id) || 0} leads dentro dela? Não dá pra desfazer.`}
                          </p>
                          <div className="row">
                            <button className={`btn ${confirmList.action === "delete" ? "btn-danger" : "btn-gold"}`} onClick={() => listAction(l.id, confirmList.action)}>
                              {confirmList.action === "archive" ? "🗄 Arquivar" : "🗑 Excluir de vez"}
                            </button>
                            <button className="btn" onClick={() => setConfirmList(null)}>
                              Cancelar
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <button className="menu-item" onClick={() => setConfirmList({ id: l.id, action: "archive" })} disabled={!countByList.get(l.id)}>
                            🗄 Arquivar todos os leads
                          </button>
                          {isOwner && (
                            <button className="menu-item danger" onClick={() => setConfirmList({ id: l.id, action: "delete" })}>
                              🗑 Excluir etapa…
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </header>

                <div className="list-cards">
                  {items.map((c) => (
                    <div key={c.id} style={{ display: "contents" }}>
                      {drop?.listId === l.id && drop.beforeId === c.id && <div className="drop-slot" />}
                      <CardFace
                        c={c}
                        labels={labels}
                        people={people}
                        dragging={dragId === c.id}
                        onPointerDown={(e) => startDrag(e, "card", c.id, e.currentTarget)}
                      />
                    </div>
                  ))}
                  {drop?.listId === l.id && drop.beforeId === null && <div className="drop-slot" />}
                  {!items.length && !drop && (
                    <p className="list-empty">
                      {nFilters ? "Nenhum lead com esses filtros." : li === 0 ? "Cole aqui o link do Instagram ou do site de um lead." : "Arraste leads para cá."}
                    </p>
                  )}
                </div>

                <footer className="list-foot">
                  {adding === l.id ? (
                    <div className="composer">
                      <textarea
                        autoFocus
                        rows={2}
                        className="input"
                        placeholder="Nome do lead, ou cole o link do Instagram / site / WhatsApp"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            createCard(l.id, draft);
                            setDraft("");
                          }
                          if (e.key === "Escape") setAdding(null);
                        }}
                      />
                      <div className="row">
                        <button
                          className="btn btn-gold"
                          onClick={() => {
                            createCard(l.id, draft);
                            setDraft("");
                          }}
                        >
                          Adicionar lead
                        </button>
                        <button className="btn btn-ghost-dark" onClick={() => setAdding(null)}>
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="add-card"
                      onClick={() => {
                        setAdding(l.id);
                        setDraft("");
                      }}
                    >
                      + Adicionar lead
                    </button>
                  )}
                </footer>
              </section>
            </div>
          );
        })}
        {listDrop === listsShown.length && dragId && <div className="list-drop" />}

        {isOwner &&
          (newList !== null ? (
            <div className="list list-new">
              <input
                className="input"
                autoFocus
                placeholder="Nome da etapa"
                value={newList}
                onChange={(e) => setNewList(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addList();
                  if (e.key === "Escape") setNewList(null);
                }}
              />
              <div className="row">
                <button className="btn btn-gold" onClick={addList}>
                  Criar etapa
                </button>
                <button className="btn btn-ghost-dark" onClick={() => setNewList(null)}>
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <button className="add-list" onClick={() => setNewList("")}>
              + Adicionar etapa
            </button>
          ))}
      </div>

      {open && (
        <CardModal
          key={open.id}
          card={open}
          board={board}
          lists={listsShown}
          labels={labels}
          people={people}
          patchCard={patchCard}
          refresh={fetchAll}
          setLabels={setLabels}
          onClose={() => {
            setOpenCard(null);
            if (search.get("card")) history.replaceState(null, "", window.location.pathname);
          }}
        />
      )}
      {openCard && !open && loaded && (
        <div className="toast" onClick={() => setOpenCard(null)}>
          Esse lead não está mais no quadro (pode ter sido arquivado). Clique para fechar.
        </div>
      )}

      {panel === "import" && (
        <ImportModal
          board={board}
          lists={listsShown}
          labels={labels}
          existing={cards}
          isOwner={isOwner}
          onClose={() => setPanel(null)}
          onDone={() => {
            setPanel(null);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}

// ---------- o cartão no quadro ----------

function CardFace({
  c,
  labels,
  people,
  dragging,
  onPointerDown,
}: {
  c: BoardCard;
  labels: Label[];
  people: Profile[];
  dragging: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
}) {
  const lbs = c.card_labels.map((x) => labels.find((l) => l.id === x.label_id)).filter(Boolean) as Label[];
  const items = c.checklists.flatMap((k) => k.checklist_items);
  const done = items.filter((i) => i.done).length;
  const bucket = dueBucket(c.due);
  const meta = [c.city, c.niche].filter(Boolean).join(" · ");
  const hasDesc = !!stripTags(c.description || "");
  const wa = whatsappUrl(c.phone);
  const stop = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <article className={`card ${dragging ? "dragging-src" : ""}`} data-card-id={c.id} onPointerDown={onPointerDown}>
      {!!lbs.length && (
        <div className="card-labels">
          {lbs.map((l) => (
            <span key={l.id} className="label-bar" style={{ background: l.color }} title={l.name || undefined} />
          ))}
        </div>
      )}
      <div className="card-title">{c.title}</div>
      {meta && <div className="card-meta">{meta}</div>}
      {(c.instagram || c.website || c.ad_url || wa || c.maps_url) && (
        <div className="card-links">
          {c.instagram && (
            <a href={c.instagram} target="_blank" rel="noreferrer" onPointerDown={stop} title={instagramHandle(c.instagram)}>
              IG
            </a>
          )}
          {c.website && (
            <a href={c.website} target="_blank" rel="noreferrer" onPointerDown={stop} title={c.website}>
              Site
            </a>
          )}
          {c.ad_url && (
            <a href={c.ad_url} target="_blank" rel="noreferrer" onPointerDown={stop} title="Anúncio">
              Anúncio
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" onPointerDown={stop} title={c.phone || ""} className="wa">
              WhatsApp
            </a>
          )}
          {c.maps_url && (
            <a href={c.maps_url} target="_blank" rel="noreferrer" onPointerDown={stop} title="Google Maps">
              Maps
            </a>
          )}
        </div>
      )}
      <div className="card-foot">
        <div className="badges">
          {c.due && (
            <span className={`badge-date ${bucket}`} title="Próximo contato">
              📞 {fmtDue(c.due)}
            </span>
          )}
          {!!items.length && <span className={`badge-check ${done === items.length ? "full" : ""}`}>☑ {done}/{items.length}</span>}
          {c.deal_value != null && (
            <span className="badge-money">R$ {Number(c.deal_value).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
          )}
          {hasDesc && <span className="badge-desc" title="Tem anotações">≡</span>}
        </div>
        <div className="avatars">
          {c.card_members.slice(0, 3).map((m) => (
            <Avatar key={m.user_id} p={people.find((p) => p.id === m.user_id) || { id: m.user_id, name: "", email: "?" }} />
          ))}
        </div>
      </div>
    </article>
  );
}
