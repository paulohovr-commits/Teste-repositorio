"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { csvToLeads, instagramHandle, matchList, parseCsv, parseLeadsText, trelloToLeads, type LeadDraft } from "@/lib/leads";
import { findDuplicate, insertLeads } from "@/lib/leadsDb";
import type { Board, BoardCard, Label, List } from "@/lib/types";
import { useMe } from "../../MeContext";

type Tab = "paste" | "csv" | "trello";

const EXAMPLE = `Clínica Sorriso
Patrocinado
https://www.clinicasorriso.com.br
https://instagram.com/clinicasorriso
(11) 98888-7777
Cidade: Campinas
Nicho: Odontologia

Pizzaria do Zé
@pizzariadoze
wa.me/5511977776666`;

export default function ImportModal({
  board,
  lists,
  labels,
  existing,
  isOwner,
  onClose,
  onDone,
}: {
  board: Board;
  lists: List[];
  labels: Label[];
  existing: BoardCard[];
  isOwner: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const me = useMe();
  const [tab, setTab] = useState<Tab>("paste");
  const [text, setText] = useState("");
  const [single, setSingle] = useState(false);
  const [fileLeads, setFileLeads] = useState<LeadDraft[]>([]);
  const [trelloLists, setTrelloLists] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [listId, setListId] = useState(lists[0]?.id || "");
  const [checklist, setChecklist] = useState(true);
  const [autoLabels, setAutoLabels] = useState(true);
  const [skipDup, setSkipDup] = useState(true);
  const [createLists, setCreateLists] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const drafts = useMemo(
    () => (tab === "paste" ? parseLeadsText(text, single) : fileLeads),
    [tab, text, single, fileLeads],
  );
  const dupCount = drafts.filter((d) => findDuplicate(d, existing)).length;
  const missingLists =
    tab === "trello" ? trelloLists.filter((n) => !matchList(lists, n)) : [];

  async function onFile(f: File | undefined) {
    setErr("");
    setFileLeads([]);
    setTrelloLists([]);
    if (!f) return;
    setFileName(f.name);
    const content = await f.text();
    try {
      if (tab === "trello") {
        const r = trelloToLeads(JSON.parse(content));
        setTrelloLists(r.lists);
        setFileLeads(r.leads);
      } else {
        const leads = csvToLeads(parseCsv(content));
        if (!leads.length) setErr("Não achei linhas nessa planilha. A primeira linha precisa ser o cabeçalho.");
        setFileLeads(leads);
      }
    } catch (e) {
      setErr(tab === "trello" ? (e as Error).message || "JSON inválido." : "Não consegui ler esse arquivo.");
    }
  }

  async function run() {
    if (!drafts.length) return;
    setBusy(true);
    setErr("");
    try {
      let allLists = lists;
      if (tab === "trello" && createLists && isOwner && missingLists.length) {
        const { data } = await supabase
          .from("lists")
          .insert(missingLists.map((title, i) => ({ board_id: board.id, title, position: lists.length + i })))
          .select();
        allLists = [...lists, ...((data as List[]) || [])];
      }
      const r = await insertLeads(drafts, {
        boardId: board.id,
        meId: me.id,
        lists: allLists,
        labels,
        existing,
        defaultListId: listId,
        checklist,
        autoLabels,
        skipDuplicates: skipDup,
      });
      setBusy(false);
      if (r.skipped && !r.created) {
        setErr(`Todos os ${r.skipped} leads já estavam no quadro.`);
        return;
      }
      onDone();
    } catch (e) {
      setBusy(false);
      setErr((e as Error).message);
    }
  }

  return (
    <div className="veil" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal import-modal">
        <header className="modal-top">
          <strong>Adicionar leads em {board.name}</strong>
          <button className="x" onClick={onClose}>
            ✕
          </button>
        </header>
        <nav className="tabs">
          {(
            [
              ["paste", "📋 Colar"],
              ["csv", "📊 Planilha (CSV)"],
              ["trello", "🟦 Trello (JSON)"],
            ] as [Tab, string][]
          ).map(([t, l]) => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? "on" : ""}`}
              onClick={() => {
                setTab(t);
                setFileLeads([]);
                setTrelloLists([]);
                setFileName("");
                setErr("");
              }}
            >
              {l}
            </button>
          ))}
        </nav>

        {tab === "paste" && (
          <>
            <p className="small muted">
              Cole o que você achou no Google: nome, o texto do anúncio, o link do site, do Instagram, do WhatsApp, do Maps.
              Eu separo cada coisa no campo certo. <strong>Vários leads de uma vez:</strong> deixe uma linha em branco entre eles.
            </p>
            <textarea
              className="input paste-area"
              autoFocus
              rows={9}
              placeholder={EXAMPLE}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <label className="fp-row">
              <input type="checkbox" checked={single} onChange={(e) => setSingle(e.target.checked)} />
              Tudo isso é um lead só (ignorar as linhas em branco)
            </label>
          </>
        )}

        {tab === "csv" && (
          <>
            <p className="small muted">
              No Google Planilhas: <em>Arquivo → Fazer download → Valores separados por vírgula (.csv)</em>. No Excel:
              <em> Salvar como → CSV</em>. Eu reconheço colunas como Nome, Empresa, Telefone, WhatsApp, Instagram, Site,
              Anúncio, Cidade, Nicho, Status/Etapa, Observações e Próximo contato. Colunas desconhecidas viram anotação no lead.
            </p>
            <input type="file" accept=".csv,text/csv,.tsv,.txt" onChange={(e) => onFile(e.target.files?.[0])} />
          </>
        )}

        {tab === "trello" && (
          <>
            <p className="small muted">
              No Trello: abra o quadro → <em>Menu (⋯) → Imprimir, exportar e compartilhar → Exportar como JSON</em>, salve o
              arquivo e escolha ele aqui. Vêm junto: cartões abertos, etapas, descrições, datas, etiquetas e checklists.
            </p>
            <input type="file" accept=".json,application/json" onChange={(e) => onFile(e.target.files?.[0])} />
            {!!missingLists.length && (
              <label className="fp-row">
                <input type="checkbox" checked={createLists && isOwner} disabled={!isOwner} onChange={(e) => setCreateLists(e.target.checked)} />
                Criar as etapas que não existem aqui: {missingLists.join(", ")}
                {!isOwner && " (só o dono cria etapas — esses leads vão para a etapa escolhida abaixo)"}
              </label>
            )}
          </>
        )}

        {fileName && <p className="small muted">Arquivo: {fileName}</p>}

        {!!drafts.length && (
          <div className="preview">
            <div className="preview-head">
              <strong>{drafts.length} lead{drafts.length > 1 ? "s" : ""} encontrado{drafts.length > 1 ? "s" : ""}</strong>
              {dupCount > 0 && <span className="warn small"> · {dupCount} já existe{dupCount > 1 ? "m" : ""} no quadro</span>}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Instagram</th>
                  <th>Site</th>
                  <th>WhatsApp</th>
                  <th>Cidade / Nicho</th>
                  {tab !== "paste" && <th>Etapa</th>}
                </tr>
              </thead>
              <tbody>
                {drafts.slice(0, 50).map((d, i) => (
                  <tr key={i} className={findDuplicate(d, existing) ? "dup" : ""}>
                    <td>
                      {d.title}
                      {d.adDetected && <span className="tag">anúncio</span>}
                    </td>
                    <td>{instagramHandle(d.instagram)}</td>
                    <td>{d.website?.replace(/^https?:\/\/(www\.)?/, "")}</td>
                    <td>{d.phone}</td>
                    <td>{[d.city, d.niche].filter(Boolean).join(" · ")}</td>
                    {tab !== "paste" && <td>{matchList(lists, d.status)?.title || d.status || "—"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            {drafts.length > 50 && <p className="small muted">…e mais {drafts.length - 50}.</p>}
          </div>
        )}

        <div className="import-opts">
          <label>
            {tab === "paste" ? "Entrar na etapa" : "Etapa para quem não tiver status"}
            <select className="input" value={listId} onChange={(e) => setListId(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
          {tab !== "trello" && (
            <label className="fp-row">
              <input type="checkbox" checked={checklist} onChange={(e) => setChecklist(e.target.checked)} />
              Criar o roteiro de prospecção (checklist) em cada lead
            </label>
          )}
          <label className="fp-row">
            <input type="checkbox" checked={autoLabels} onChange={(e) => setAutoLabels(e.target.checked)} />
            Etiquetar sozinho: “Anuncia no Google” e “Sem site”
          </label>
          <label className="fp-row">
            <input type="checkbox" checked={skipDup} onChange={(e) => setSkipDup(e.target.checked)} />
            Pular leads repetidos (mesmo Instagram ou site)
          </label>
        </div>

        {err && <p className="error">{err}</p>}
        <footer className="modal-foot">
          <button className="btn" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn btn-gold" onClick={run} disabled={busy || !drafts.length}>
            {busy
              ? "Adicionando…"
              : `Adicionar ${skipDup ? drafts.length - dupCount : drafts.length} lead${(skipDup ? drafts.length - dupCount : drafts.length) === 1 ? "" : "s"}`}
          </button>
        </footer>
      </div>
    </div>
  );
}
