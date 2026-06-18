export const ACTIVITY_LEVELS = {
  sedentary: { label: "Sedentário", description: "Pouco ou nenhum exercício", multiplier: 1.2 },
  light: { label: "Ligeiramente ativo", description: "Exercício leve 1–3 dias/semana", multiplier: 1.375 },
  moderate: { label: "Moderadamente ativo", description: "Exercício moderado 3–5 dias/semana", multiplier: 1.55 },
  very: { label: "Muito ativo", description: "Exercício intenso 6–7 dias/semana", multiplier: 1.725 },
  athlete: { label: "Atleta", description: "Treino físico muito exigente", multiplier: 1.9 },
};

export const GOALS = {
  maintain: { label: "Manter peso", macroLabel: "Manutenção", description: "Calorias de manutenção", adjustment: 0 },
  cutting: { label: "Perder gordura", macroLabel: "Cutting", description: "Défice moderado", adjustment: -500 },
  bulking: { label: "Ganhar massa", macroLabel: "Bulking", description: "Superavit controlado", adjustment: 500 },
};

export const MACRO_PLANS = {
  moderate: { label: "Hidratos moderados", shortLabel: "Moderado", ratioLabel: "30/35/35", ratios: { protein: 30, fat: 35, carbs: 35 } },
  lower: { label: "Baixo em hidratos", shortLabel: "Baixo carb", ratioLabel: "40/40/20", ratios: { protein: 40, fat: 40, carbs: 20 } },
  higher: { label: "Alto em hidratos", shortLabel: "Alto carb", ratioLabel: "30/20/50", ratios: { protein: 30, fat: 20, carbs: 50 } },
};

export const MEALS = {
  breakfast: "Pequeno-almoço",
  lunch: "Almoço",
  dinner: "Jantar",
  snacks: "Snacks",
};

const DEFAULT_PROFILE = { gender: "male", age: 30, weight: 78, height: 178, activity: "moderate", goal: "maintain", macroPlan: "moderate" };
const STORAGE_KEY = "calorias-orcamento-state-v2";

export let state = {
  profile: { ...DEFAULT_PROFILE },
  items: [],
  weightHistory: [],
  theme: "light",
};

export const createId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Converte qualquer valor para um número finito; devolve o fallback (0) para undefined, "", texto inválido ou NaN.
export function toSafeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function loadState() {
  const fallbackTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      state.profile = { ...DEFAULT_PROFILE, ...saved.profile };
      state.items = (saved.items || []).map(normalizeItem);
      state.weightHistory = saved.weightHistory || [];
      state.theme = saved.theme || fallbackTheme;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function normalizeItem(item) {
  return {
    id: item.id || createId(),
    name: item.name || "Alimento",
    calories: toSafeNumber(item.calories),
    protein: toSafeNumber(item.protein),
    fat: toSafeNumber(item.fat),
    carbs: toSafeNumber(item.carbs),
    price: toSafeNumber(item.price),
    quantity: toSafeNumber(item.quantity),
    barcode: item.barcode || "",
    date: item.date || new Date().toISOString(), // Garante sempre uma data ISO, mesmo em itens antigos sem este campo
    meal: item.meal && MEALS[item.meal] ? item.meal : "snacks", // Fix aqui
  };
}