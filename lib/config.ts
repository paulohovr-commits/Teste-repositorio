// TROQUE AQUI: o nome que aparece no cabeçalho e na aba do navegador.
export const APP_NAME = "Prospecção";

// Etapas com que todo quadro novo nasce. A ordem é o funil.
export const DEFAULT_LISTS = [
  "Leads novos",
  "Pesquisando",
  "1º contato feito",
  "Follow-up",
  "Reunião / Proposta",
  "Fechado ✅",
  "Perdido",
];

// Etiquetas com que todo quadro novo nasce: temperatura e o que você viu no lead.
export const DEFAULT_LABELS: { name: string; color: string }[] = [
  { name: "Quente", color: "#e5484d" },
  { name: "Morno", color: "#f0a83c" },
  { name: "Frio", color: "#4c9aff" },
  { name: "Anuncia no Google", color: "#5FD08A" },
  { name: "Sem site", color: "#a371f7" },
  { name: "Instagram fraco", color: "#e879b9" },
];

// Roteiro que pode nascer junto com cada lead (opção no "Colar leads").
export const PROSPECT_CHECKLIST = {
  title: "Roteiro de prospecção",
  items: [
    "Ver o anúncio",
    "Analisar o Instagram",
    "Analisar o site",
    "Mandar a 1ª mensagem",
    "Follow-up em 2 dias",
    "Follow-up em 7 dias",
  ],
};
