import { debounce, readJSON, writeJSON } from "./storage.js";

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
  favorites: [], // NOVO: Guarda os alimentos favoritos 
  history: [],   // NOVO: Guarda o histórico dos últimos alimentos adicionados 
  currentDate: new Date().toISOString().split("T")[0], // NOVO: Máquina do Tempo 
  theme: "light",
};

const listeners = [];
export function onChange(listener) {
  listeners.push(listener);
}
function notify() {
  listeners.forEach(listener => listener(state));
}

const persistDebounced = debounce(() => writeJSON(STORAGE_KEY, state), 300);
function commit(nextState) {
  state = nextState;
  persistDebounced();
  notify();
}

export const createId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Converte qualquer valor para um número finito; devolve o fallback (0) para undefined, "", texto inválido ou NaN.
export function toSafeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function validateProfile(raw) {
  const p = raw && typeof raw === "object" ? raw : {};
  const age = toSafeNumber(p.age, DEFAULT_PROFILE.age);
  const weight = toSafeNumber(p.weight, DEFAULT_PROFILE.weight);
  const height = toSafeNumber(p.height, DEFAULT_PROFILE.height);
  return {
    gender: p.gender === "female" ? "female" : "male",
    age: age > 0 ? age : DEFAULT_PROFILE.age,
    weight: weight > 0 ? weight : DEFAULT_PROFILE.weight,
    height: height > 0 ? height : DEFAULT_PROFILE.height,
    activity: ACTIVITY_LEVELS[p.activity] ? p.activity : DEFAULT_PROFILE.activity,
    goal: GOALS[p.goal] ? p.goal : DEFAULT_PROFILE.goal,
    macroPlan: MACRO_PLANS[p.macroPlan] ? p.macroPlan : DEFAULT_PROFILE.macroPlan,
  };
}

function validateWeightHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(entry => entry && typeof entry.date === "string" && Number.isFinite(Number(entry.weight)))
    .map(entry => ({ date: entry.date, weight: Number(entry.weight) }));
}

export function normalizeItem(item) {
  const source = item && typeof item === "object" ? item : {};
  return {
    id: source.id || createId(),
    name: typeof source.name === "string" && source.name.trim() ? source.name.trim() : "Alimento",
    calories: toSafeNumber(source.calories),
    protein: toSafeNumber(source.protein),
    fat: toSafeNumber(source.fat),
    carbs: toSafeNumber(source.carbs),
    price: toSafeNumber(source.price),
    quantity: toSafeNumber(source.quantity),
    packageQuantity: toSafeNumber(source.packageQuantity), // NOVO
    packagePrice: toSafeNumber(source.packagePrice), // NOVO
    barcode: typeof source.barcode === "string" ? source.barcode : "",
    date: typeof source.date === "string" ? source.date : new Date().toISOString(),
    meal: source.meal && MEALS[source.meal] ? source.meal : "snacks",
  };
}

export function loadState() {
  const fallbackTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const saved = readJSON(STORAGE_KEY);
  if (saved && typeof saved === "object") {
    state = {
      profile: validateProfile(saved.profile),
      items: Array.isArray(saved.items) ? saved.items.map(normalizeItem) : [],
      weightHistory: validateWeightHistory(saved.weightHistory),
      favorites: Array.isArray(saved.favorites) ? saved.favorites : [],
      history: Array.isArray(saved.history) ? saved.history : [],
      currentDate: saved.currentDate || new Date().toISOString().split("T")[0],
      theme: saved.theme === "dark" || saved.theme === "light" ? saved.theme : fallbackTheme,
    };
  } else {
    state = { 
      profile: { ...DEFAULT_PROFILE }, 
      items: [], 
      weightHistory: [], 
      favorites: [], 
      history: [], 
      currentDate: new Date().toISOString().split("T")[0], 
      theme: fallbackTheme 
    };
  }
}

// Função auxiliar para gerir o Histórico Inteligente
function addToHistory(itemData) {
  // Guardamos apenas o "molde" do alimento para não acumular IDs únicos
  const template = { 
    name: itemData.name, calories: itemData.calories, protein: itemData.protein, 
    fat: itemData.fat, carbs: itemData.carbs, price: itemData.price, 
    packageQuantity: itemData.packageQuantity, packagePrice: itemData.packagePrice, 
    barcode: itemData.barcode 
  };
  // Removemos se já existir para o colocar no topo e mantemos apenas os últimos 30
  const filtered = state.history.filter(h => h.name !== template.name);
  return [template, ...filtered].slice(0, 30);
}

export function setProfileField(key, value) {
  commit({ ...state, profile: { ...state.profile, [key]: value } });
}

export function resetProfile() {
  commit({ ...state, profile: { ...DEFAULT_PROFILE } });
}

export function setTheme(theme) {
  commit({ ...state, theme });
}

export function addItem(itemData) {
  const newItem = normalizeItem(itemData);
  // A MÁQUINA DO TEMPO EM AÇÃO: Força o item a ter a data que o utilizador escolheu
  newItem.date = state.currentDate; 
  
  const nextHistory = addToHistory(newItem);
  commit({ ...state, items: [...state.items, newItem], history: nextHistory });
}

export function updateItem(id, itemData) {
  commit({ ...state, items: state.items.map(i => (i.id === id ? normalizeItem({ ...itemData, id }) : i)) });
}

export function removeItem(id) {
  commit({ ...state, items: state.items.filter(i => i.id !== id) });
}

export function clearItems() {
  commit({ ...state, items: [] });
}

export function addWeightEntry(entry) {
  const filtered = state.weightHistory.filter(e => e.date !== entry.date);
  const next = [...filtered, entry].sort((a, b) => new Date(a.date) - new Date(b.date));
  commit({ ...state, weightHistory: next });
}

export function setCurrentDate(dateString) {
  commit({ ...state, currentDate: dateString });
}

export function toggleFavorite(foodTemplate) {
  const isFavorite = state.favorites.some(f => f.name === foodTemplate.name);
  let nextFavorites;
  
  if (isFavorite) {
    nextFavorites = state.favorites.filter(f => f.name !== foodTemplate.name);
  } else {
    nextFavorites = [...state.favorites, foodTemplate];
  }
  
  commit({ ...state, favorites: nextFavorites });
}