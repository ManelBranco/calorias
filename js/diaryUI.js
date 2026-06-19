import { state, onChange, removeItem, clearItems, MEALS, setCurrentDate } from "./state.js"; // <-- setCurrentDate adicionado
import { calculateProfile } from "./tdee.js";
import { calculateMacroTargets, MACRO_COLORS } from "./macro.js";
import { updateMacroDonut } from "./charts.js";
import { numberFormatter, currencyFormatter, formatCalories, formatGrams, showToast } from "./utils.js";
import { openModal } from "./modalUI.js";

function buildFoodItemNode(item) {
  const wrapper = document.createElement("div");
  wrapper.className = "food-item";
  wrapper.dataset.edit = item.id;

  const info = document.createElement("div");
  const nameEl = document.createElement("strong");
  // Se for favorito, adicionamos uma estrela visual
  const isFav = state.favorites && state.favorites.some(f => f.name === item.name);
  nameEl.textContent = isFav ? `⭐ ${item.name}` : item.name;
  
  const calEl = document.createElement("span");
  calEl.textContent = formatCalories(item.calories);
  const macroEl = document.createElement("span");
  macroEl.className = "food-macros";
  macroEl.textContent = `P ${formatGrams(item.protein)} G ${formatGrams(item.fat)} H ${formatGrams(item.carbs)}`;
  info.append(nameEl, calEl, macroEl);

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.dataset.delete = item.id;
  deleteButton.textContent = "×";

  wrapper.append(info, deleteButton);
  return wrapper;
}

// Alterado para receber apenas os items do dia (dailyItems)
function renderMealGrid(dailyItems) {
  const mealGrid = document.querySelector("#mealGrid");
  mealGrid.innerHTML = "";
  Object.entries(MEALS).forEach(([mealKey, label]) => {
    const items = dailyItems.filter(i => i.meal === mealKey);
    const sum = items.reduce((acc, i) => acc + i.calories, 0);

    const card = document.createElement("article");
    card.className = "card meal-card";

    const header = document.createElement("div");
    header.className = "card-header";
    const titleWrap = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "Refeição";
    const title = document.createElement("h3");
    title.textContent = label;
    titleWrap.append(eyebrow, title);
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = formatCalories(sum);
    header.append(titleWrap, pill);

    const list = document.createElement("div");
    list.className = "meal-list";
    if (items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Vazio.";
      list.append(empty);
    } else {
      items.forEach(item => list.append(buildFoodItemNode(item)));
    }

    const addButton = document.createElement("button");
    addButton.className = "add-meal-button";
    addButton.dataset.addMeal = mealKey;
    addButton.textContent = "+ Adicionar";

    card.append(header, list, addButton);
    mealGrid.append(card);
  });
}

function renderMacroGrid(totals, targets) {
  const grid = document.querySelector("#diaryMacroGrid");
  grid.innerHTML = "";
  [
    { key: "protein", label: "Proteína", consumed: totals.protein, target: targets.protein },
    { key: "fat", label: "Gordura", consumed: totals.fat, target: targets.fat },
    { key: "carbs", label: "Hidratos", consumed: totals.carbs, target: targets.carbs },
  ].forEach(macro => {
    const section = document.createElement("section");
    section.className = "diary-macro-item";
    section.style.setProperty("--macro-color", MACRO_COLORS[macro.key]);

    const header = document.createElement("header");
    const h4 = document.createElement("h4");
    h4.textContent = macro.label;
    const strong = document.createElement("strong");
    strong.textContent = formatGrams(macro.consumed);
    header.append(h4, strong);

    const footer = document.createElement("footer");
    const meta = document.createElement("span");
    meta.textContent = `Meta ${formatGrams(macro.target)}`;
    footer.append(meta);

    section.append(header, footer);
    grid.append(section);
  });
}

function updateDateDisplay() {
  const todayDate = new Date();
  const currentDate = new Date(state.currentDate);
  
  // Zera as horas para comparar apenas os dias
  todayDate.setHours(0, 0, 0, 0);
  currentDate.setHours(0, 0, 0, 0);
  
  const diffTime = currentDate.getTime() - todayDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  let title = "";
  if (diffDays === 0) title = "Hoje";
  else if (diffDays === -1) title = "Ontem";
  else if (diffDays === 1) title = "Amanhã";
  else title = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(currentDate);

  document.querySelector("#diaryTitle").textContent = title;
}

function render() {
  // A MÁQUINA DO TEMPO: Filtramos apenas os alimentos da data selecionada
  const dailyItems = state.items.filter(i => {
    const itemDate = String(i.date || new Date().toISOString()).split("T")[0];
    return itemDate === state.currentDate;
  });

  updateDateDisplay();

  const profile = calculateProfile(state.profile);
  const totals = dailyItems.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      protein: acc.protein + i.protein,
      fat: acc.fat + i.fat,
      carbs: acc.carbs + i.carbs,
      spent: acc.spent + i.price,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0, spent: 0 },
  );
  
  const remaining = profile.dailyGoal - totals.calories;
  const progress = profile.dailyGoal > 0 ? Math.min((totals.calories / profile.dailyGoal) * 100, 100) : 0;

  document.querySelector("#goalCalories").textContent = numberFormatter.format(Math.round(profile.dailyGoal));
  document.querySelector("#consumedCalories").textContent = numberFormatter.format(Math.round(totals.calories));
  document.querySelector("#remainingCalories").textContent = numberFormatter.format(Math.round(remaining));
  document.querySelector("#progressPercent").textContent = `${Math.round(progress)}% usado`;
  document.querySelector("#totalSpent").textContent = currencyFormatter.format(totals.spent);

  requestAnimationFrame(() => {
    document.querySelector("#calorieProgress").style.width = `${progress}%`;
  });

  const targets = calculateMacroTargets(profile.dailyGoal, state.profile.macroPlan);
  renderMacroGrid(totals, targets);
  updateMacroDonut(totals.protein, totals.fat, totals.carbs);
  
  // Passamos a lista filtrada para as refeições
  renderMealGrid(dailyItems);
}

function changeDate(offsetDays) {
  const current = new Date(state.currentDate);
  current.setDate(current.getDate() + offsetDays);
  setCurrentDate(current.toISOString().split("T")[0]);
}

function bindEvents() {
  document.querySelector("#prevDayBtn").addEventListener("click", () => changeDate(-1));
  document.querySelector("#nextDayBtn").addEventListener("click", () => changeDate(1));

  document.querySelector("#clearDiaryButton").addEventListener("click", () => {
    if (window.confirm("Limpar os alimentos deste dia?")) {
      // Em vez de limpar tudo, removemos só os do dia atual
      state.items.forEach(i => {
        const itemDate = String(i.date).split("T")[0];
        if (itemDate === state.currentDate) removeItem(i.id);
      });
      showToast("Diário limpo para este dia.");
    }
  });

  document.querySelector("#quickAddButton").addEventListener("click", () => openModal("snacks"));

  document.addEventListener("click", e => {
    const addMealBtn = e.target.closest("[data-add-meal]");
    if (addMealBtn) {
      openModal(addMealBtn.dataset.addMeal);
      return;
    }

    const deleteBtn = e.target.closest("[data-delete]");
    if (deleteBtn) {
      removeItem(deleteBtn.dataset.delete);
      showToast("Removido.");
      return;
    }

    const editTarget = e.target.closest("[data-edit]");
    if (editTarget) {
      const item = state.items.find(i => i.id === editTarget.dataset.edit);
      if (item) openModal(item.meal, item);
    }
  });
}

export function init() {
  bindEvents();
  render();
  onChange(render);
}