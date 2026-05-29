import { supabase } from "./supabaseClient";

export interface TemplateRecord {
  id: number;
  template_name: string;
  mjml: string;
  html: string;
  created_at: string;
}

export async function saveTemplate(template_name: string, mjml: string, html: string): Promise<TemplateRecord | null> {
  const { data, error } = await supabase
    .from("MJML_HTML")
    .insert([{ template_name, mjml, html }])
    .select()
    .single();

  if (error) {
    console.error("Error saving template:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function getTemplates(): Promise<TemplateRecord[]> {
  const { data, error } = await supabase
    .from("MJML_HTML")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching templates:", error);
    throw new Error(error.message);
  }

  return data || [];
}

export async function updateTemplate(id: number, template_name: string, mjml: string, html: string): Promise<TemplateRecord | null> {
  const { data, error } = await supabase
    .from("MJML_HTML")
    .update({ template_name, mjml, html })
    .match({ id })
    .select()
    .single();

  if (error) {
    console.error("Error updating template:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function deleteTemplate(id: number): Promise<boolean> {
  const { error } = await supabase
    .from("MJML_HTML")
    .delete()
    .match({ id });

  if (error) {
    console.error("Error deleting template:", error);
    throw new Error(error.message);
  }

  return true;
}

export async function getTemplateById(id: number): Promise<TemplateRecord | null> {
  const { data, error } = await supabase
    .from("MJML_HTML")
    .select("*")
    .match({ id })
    .single();

  if (error) {
    console.error("Error fetching template by ID:", error);
    throw new Error(error.message);
  }

  return data;
}

