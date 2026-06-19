import { supabase } from "./supabase/supabaseClient.js";

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(callback) {
  supabase.auth.onAuthStateChange((_event, session) => callback(session));
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Traduz os erros mais comuns do Supabase Auth para PT-PT
export function translateAuthError(error) {
  const msg = String(error?.message || "");
  if (msg.includes("Invalid login credentials")) return "Email ou palavra-passe incorretos.";
  if (msg.includes("User already registered")) return "Já existe uma conta com este email.";
  if (msg.includes("Password should be at least")) return "A palavra-passe precisa de pelo menos 6 caracteres.";
  if (msg.includes("Email not confirmed")) return "Confirma o teu email antes de entrares (verifica a caixa de entrada).";
  return "Ocorreu um erro. Tenta novamente.";
}