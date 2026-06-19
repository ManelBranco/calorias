// dataService.js
// Camada que substitui storage.js para os dados que vivem no Supabase.
// Mantém o app 100% utilizável offline: cada mutação aplica-se primeiro
// localmente (otimista) e é colocada numa fila ("outbox") que é
// processada assim que a rede volta.

import { supabase, getCurrentUserId } from "./supabaseClient.js";
import { readJSON, writeJSON } from "../storage.js";

const OUTBOX_KEY = "calorias-orcamento-outbox-v1";

function readOutbox() {
  return readJSON(OUTBOX_KEY) || [];
}

function writeOutbox(queue) {
  writeJSON(OUTBOX_KEY, queue);
}

// Adiciona uma mutação pendente à fila. table/operation/payload descrevem
// exatamente a chamada Supabase que falta fazer. A fila só é esvaziada
// quando flushOutbox() é chamado explicitamente (ver main.js: arranque e
// fecho da app) — sem polling nem listeners automáticos de "online".
export function enqueueMutation(table, operation, payload) {
  const queue = readOutbox();
  queue.push({ id: crypto.randomUUID(), table, operation, payload, queuedAt: Date.now() });
  writeOutbox(queue);
}

async function applyMutation(mutation) {
  const { table, operation, payload } = mutation;
  if (operation === "upsert") {
    const { error } = await supabase.from(table).upsert(payload);
    if (error) throw error;
  } else if (operation === "delete") {
    const { error } = await supabase.from(table).delete().eq("id", payload.id);
    if (error) throw error;
  }
}

let isFlushing = false;
export async function flushOutbox() {
  if (isFlushing || !navigator.onLine) return;
  isFlushing = true;
  const queue = readOutbox();
  const remaining = [];

  for (const mutation of queue) {
    try {
      await applyMutation(mutation);
    } catch (err) {
      // Falha de rede ou conflito: mantém na fila para tentar mais tarde
      remaining.push(mutation);
    }
  }

  writeOutbox(remaining);
  isFlushing = false;
}

// ---------- Operações de alto nível usadas pelo state.js ----------

export async function syncItemUpsert(item, userId) {
  const payload = {
    id: item.id,
    user_id: userId,
    name: item.name,
    calories: item.calories,
    protein: item.protein,
    fat: item.fat,
    carbs: item.carbs,
    price: item.price,
    quantity: item.quantity,
    package_quantity: item.packageQuantity,
    package_price: item.packagePrice,
    barcode: item.barcode,
    meal: item.meal,
    consumed_date: item.date.split("T")[0],
  };
  enqueueMutation("items", "upsert", payload);
}

export async function syncItemDelete(id) {
  enqueueMutation("items", "delete", { id });
}

export async function syncWeightUpsert(entry, userId) {
  enqueueMutation("weight_history", "upsert", {
    user_id: userId,
    log_date: entry.date,
    weight: entry.weight,
  });
}

export async function syncProfileUpsert(profile, userId) {
  enqueueMutation("profiles", "upsert", { id: userId, ...profile });
}

// ---------- Leitura inicial (usada uma vez no arranque, online) ----------

export async function fetchRemoteState(userId) {
  const [{ data: items }, { data: profile }, { data: weightHistory }] = await Promise.all([
    supabase.from("items").select("*").eq("user_id", userId),
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("weight_history").select("*").eq("user_id", userId),
  ]);
  return { items, profile, weightHistory };
}

export { getCurrentUserId };