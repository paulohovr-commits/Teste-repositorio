export type Profile = {
  id: string;
  email: string;
  name: string;
  is_owner: boolean;
  role: string | null;
};

export type Board = { id: string; name: string; owner_id: string; created_at: string };

export type List = { id: string; board_id: string; title: string; position: number };

export type LeadFields = {
  phone: string | null;
  instagram: string | null;
  website: string | null;
  ad_url: string | null;
  maps_url: string | null;
  city: string | null;
  niche: string | null;
  source: string | null;
  deal_value: number | null;
};

export type Card = LeadFields & {
  id: string;
  list_id: string;
  title: string;
  position: number;
  created_at: string;
  description: string;
  due: string | null; // "Próximo contato"
  start_date: string | null;
  archived_at: string | null;
};

// O cartão como o quadro carrega: com os vínculos embutidos.
export type BoardCard = Card & {
  card_labels: { label_id: string }[];
  card_members: { user_id: string }[];
  checklists: { id: string; checklist_items: { done: boolean }[] }[];
};

export type Label = { id: string; board_id: string; name: string; color: string; position: number };

export type Checklist = { id: string; card_id: string; title: string; position: number };

export type ChecklistItem = {
  id: string;
  checklist_id: string;
  text: string;
  done: boolean;
  position: number;
};

export type Comment = {
  id: string;
  card_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  author: Pick<Profile, "id" | "name" | "email"> | null;
};

export type Notification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: "mention" | "comment" | "assigned";
  board_id: string | null;
  card_id: string | null;
  comment_id: string | null;
  body: string | null;
  created_at: string;
  read_at: string | null;
};
