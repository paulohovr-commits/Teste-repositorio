"use client";

import { useEffect, useRef, useState } from "react";
import { hrefOf, sanitizeHtml } from "@/lib/html";

// contentEditable + execCommand, sem biblioteca. Guarda HTML saneado.
export default function RichEditor({ html, onSave }: { html: string; onSave: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const savedRange = useRef<Range | null>(null);
  const editingAtDown = useRef(false);
  const dirty = useRef(false);
  const latest = useRef(html);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Semeia UMA vez. Re-renderizar o conteúdo a cada tecla faz o cursor pular.
  useEffect(() => {
    const el = ref.current!;
    el.innerHTML = sanitizeHtml(html);
    latest.current = el.innerHTML;
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
      document.execCommand("styleWithCSS", false, "false");
    } catch {}
    // Fechou o cartão com alteração pendente: salva.
    return () => {
      if (dirty.current) onSaveRef.current(sanitizeHtml(latest.current));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function save() {
    const el = ref.current;
    if (!el) return;
    const clean = sanitizeHtml(el.innerHTML);
    el.innerHTML = clean; // reescreve já linkificado, para ficar clicável sem reabrir
    latest.current = clean;
    if (dirty.current) {
      dirty.current = false;
      onSaveRef.current(clean);
    }
  }

  function stopEditing() {
    setEditing(false);
    setLinkOpen(false);
    save();
  }

  // Clicar fora do editor salva (enquanto está editando).
  useEffect(() => {
    if (!editing) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) stopEditing();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function exec(cmd: string, value?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, value);
    dirty.current = true;
    latest.current = ref.current?.innerHTML || "";
  }

  function toggleH3() {
    const block = window.getSelection()?.anchorNode?.parentElement?.closest("h3");
    exec("formatBlock", block ? "p" : "h3");
  }

  function openLink() {
    const sel = window.getSelection();
    savedRange.current = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    setLinkUrl("");
    setLinkOpen(true);
  }

  function applyLink() {
    const url = linkUrl.trim();
    setLinkOpen(false);
    if (!url) return;
    ref.current?.focus();
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
    if (sel && !sel.isCollapsed) exec("createLink", hrefOf(url));
    else exec("insertText", url); // vira link ao salvar
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === "Enter") {
      e.preventDefault();
      ref.current?.blur();
      stopEditing();
      return;
    }
    if (e.key === "Escape") {
      e.stopPropagation();
      ref.current?.blur();
      stopEditing();
      return;
    }
    // Atalhos na mão: deixados para o navegador viram <span style>, que o sanitizador apaga.
    if (mod && !e.altKey && !e.shiftKey) {
      const k = e.key.toLowerCase();
      const cmd = k === "b" ? "bold" : k === "i" ? "italic" : k === "u" || k === "s" ? "underline" : null;
      if (cmd) {
        e.preventDefault(); // Cmd+S sem isso abre o "salvar página"
        exec(cmd);
      }
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    exec("insertText", e.clipboardData.getData("text/plain"));
  }

  function onClick(e: React.MouseEvent) {
    const a = (e.target as HTMLElement).closest("a");
    if (!a) return;
    // Editando: clicar posiciona o cursor (Alt+clique abre). Fora de edição: abre.
    if (!editingAtDown.current || e.altKey) {
      e.preventDefault();
      window.open(a.getAttribute("href") || "", "_blank", "noreferrer");
    }
  }

  const btn = (label: string, title: string, fn: () => void, cls = "") => (
    <button
      type="button"
      className={`rt-btn ${cls}`}
      title={title}
      onMouseDown={(e) => {
        e.preventDefault(); // mantém a seleção
        fn();
      }}
    >
      {label}
    </button>
  );

  return (
    <div className={`rich ${editing ? "editing" : ""}`} ref={wrapRef}>
      {editing && (
        <div className="rt-bar">
          {btn("B", "Negrito (Ctrl+B)", () => exec("bold"), "b")}
          {btn("I", "Itálico (Ctrl+I)", () => exec("italic"), "i")}
          {btn("U", "Sublinhado (Ctrl+U)", () => exec("underline"), "u")}
          {btn("S", "Riscado", () => exec("strikeThrough"), "s")}
          {btn("H", "Título", toggleH3)}
          {btn("•", "Lista", () => exec("insertUnorderedList"))}
          {btn("1.", "Lista numerada", () => exec("insertOrderedList"))}
          {btn("🔗", "Link", openLink)}
          {btn("⌫", "Limpar formatação", () => {
            exec("removeFormat");
            exec("formatBlock", "p");
          })}
          {linkOpen && (
            <span className="rt-link">
              <input
                className="input"
                autoFocus
                placeholder="https://…"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyLink();
                  }
                  if (e.key === "Escape") setLinkOpen(false);
                }}
              />
              <button type="button" className="btn btn-sm" onClick={applyLink}>
                OK
              </button>
            </span>
          )}
        </div>
      )}
      <div
        ref={ref}
        className="rt-body"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Anotações sobre o lead: o que você viu no anúncio, no Instagram, no site, a abordagem…"
        onFocus={() => setEditing(true)}
        onMouseDown={() => {
          editingAtDown.current = document.activeElement === ref.current;
        }}
        onClick={onClick}
        onInput={() => {
          dirty.current = true;
          latest.current = ref.current?.innerHTML || "";
        }}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
      />
      {editing && (
        <div className="rt-foot">
          <button
            type="button"
            className="btn btn-gold btn-sm"
            onMouseDown={(e) => {
              e.preventDefault();
              ref.current?.blur();
              stopEditing();
            }}
          >
            Salvar
          </button>
          <span className="muted small">Ctrl/Cmd + Enter salva · clicar fora também</span>
        </div>
      )}
    </div>
  );
}
