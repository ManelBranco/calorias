// supabaseClient.js
// Substitui o uso direto de localStorage em storage.js para dados que
// precisam de sincronizar entre dispositivos. O cache local (localStorage)
// mantém-se como camada de leitura instantânea / suporte offline.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Substitui pelos valores do teu projeto Supabase (Settings > API)
const SUPABASE_URL = "https://agmoetqqqucrtmzuuluv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnbW9ldHFxcXVjcnRtenV1bHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NTY5MzQsImV4cCI6MjA5NzQzMjkzNH0.rT3L0C2Fjg4UTFJoEisNZJkg9RV-11qJ828W7jsWavg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getCurrentUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}
