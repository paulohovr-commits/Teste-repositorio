// Paleta fixa das faixas das etapas e dos quadros.
export const PALETTE = [
  "#FEC212", "#E07C0A", "#ef6a5a", "#e879b9", "#a371f7",
  "#6aa8ff", "#2dd4bf", "#5FD08A", "#a3e635", "#9a9488",
];

// Cor automática e estável pelo id, para nada mudar de cor a cada recarga.
export function autoColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export const LABEL_COLORS = [
  "#e5484d", "#f0a83c", "#FEC212", "#5FD08A", "#2dd4bf",
  "#4c9aff", "#a371f7", "#e879b9", "#8d99ae", "#172b4d",
];
