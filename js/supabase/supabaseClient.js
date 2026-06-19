// supabaseClient.js
// Substitui o uso direto de localStorage em storage.js para dados que
// precisam de sincronizar entre dispositivos. O cache local (localStorage)
// mantém-se como camada de leitura instantânea / suporte offline.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Substitui pelos valores do teu projeto Supabase (Settings > API)
const SUPABASE_URL = "https://agmoetqqqucrtmzuuluv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_rlxHz8txXHldW8ut5EFezQ__bfrFE9h";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getCurrentUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}
