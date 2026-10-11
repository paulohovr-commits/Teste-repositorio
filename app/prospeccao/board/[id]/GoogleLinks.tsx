"use client";

import { urlsInHtml } from "@/lib/html";

type Kind = { name: string; color: string; letter: string };

function classify(u: string): Kind | null {
  let url: URL;
  try {
    url = new URL(u);
  } catch {
    return null;
  }
  const h = url.hostname;
  const p = url.pathname;
  if (h === "docs.google.com") {
    if (p.startsWith("/document")) return { name: "Documento Google", color: "#4285F4", letter: "D" };
    if (p.startsWith("/spreadsheets")) return { name: "Planilha Google", color: "#0F9D58", letter: "S" };
    if (p.startsWith("/presentation")) return { name: "Apresentação Google", color: "#F4B400", letter: "P" };
    if (p.startsWith("/forms")) return { name: "Formulário Google", color: "#7248B9", letter: "F" };
  }
  if (h === "forms.gle") return { name: "Formulário Google", color: "#7248B9", letter: "F" };
  if (h === "drive.google.com") return { name: "Google Drive", color: "#1FA463", letter: "▲" };
  return null;
}

// Não existe anexo: link do Google colado na descrição vira cartão de preview.
export default function GoogleLinks({ html }: { html: string }) {
  const items = urlsInHtml(html || "")
    .map((u) => ({ u, k: classify(u) }))
    .filter((x): x is { u: string; k: Kind } => !!x.k);
  if (!items.length) return null;
  return (
    <div className="glinks">
      {items.map(({ u, k }) => (
        <a key={u} className="glink" href={u} target="_blank" rel="noreferrer">
          <svg width="28" height="34" viewBox="0 0 28 34" aria-hidden>
            <path d="M0 3a3 3 0 0 1 3-3h15l10 10v21a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3z" fill={k.color} />
            <path d="M18 0l10 10h-7a3 3 0 0 1-3-3z" fill="rgba(255,255,255,.45)" />
            <text x="14" y="25" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">
              {k.letter}
            </text>
          </svg>
          <span className="glink-text">
            <strong>{k.name}</strong>
            <span className="muted small">{u.replace(/^https?:\/\//, "").slice(0, 60)}</span>
          </span>
          <span className="glink-open">Abrir ↗</span>
        </a>
      ))}
    </div>
  );
}
