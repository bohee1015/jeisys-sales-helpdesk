import { createClient } from "./supabase/server";

export type Faq = {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
};

type FaqRow = {
  id: string;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
};

function fromRow(row: FaqRow): Faq {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listFaqs(): Promise<Faq[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("helpdesk")
    .from("faqs")
    .select("*")
    .order("question", { ascending: true });

  if (error) throw error;
  return (data as FaqRow[]).map(fromRow);
}

export async function createFaq(question: string, answer: string): Promise<Faq> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("helpdesk")
    .from("faqs")
    .insert({ question, answer })
    .select("*")
    .single();

  if (error) throw error;
  return fromRow(data as FaqRow);
}

export async function updateFaq(
  id: string,
  patch: { question?: string; answer?: string }
): Promise<Faq | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("helpdesk")
    .from("faqs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data ? fromRow(data as FaqRow) : null;
}

export async function deleteFaq(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error, count } = await supabase
    .schema("helpdesk")
    .from("faqs")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) throw error;
  return (count ?? 0) > 0;
}
