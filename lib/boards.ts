import { supabase } from "./supabase";
import { DEFAULT_LABELS, DEFAULT_LISTS } from "./config";

// Quadro novo nasce povoado: as etapas do funil e as etiquetas de prospecção.
export async function createBoard(name: string, ownerId: string, lists = DEFAULT_LISTS) {
  const { data: board, error } = await supabase
    .from("boards")
    .insert({ name, owner_id: ownerId })
    .select()
    .single();
  if (error || !board) throw error || new Error("Não foi possível criar o quadro.");
  const [l, lb] = await Promise.all([
    supabase.from("lists").insert(lists.map((title, position) => ({ board_id: board.id, title, position }))),
    supabase.from("labels").insert(DEFAULT_LABELS.map((x, position) => ({ ...x, board_id: board.id, position }))),
  ]);
  if (l.error) throw l.error;
  if (lb.error) throw lb.error;
  return board as { id: string; name: string };
}
