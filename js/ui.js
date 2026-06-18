import { state, saveState, normalizeItem, ACTIVITY_LEVELS, GOALS, MACRO_PLANS, MEALS, createId } from './state.js';
import { searchFoodCombined, fetchProductByEan } from './api.js';
import { updateMacroDonut, updateWeightProgressChart, updateSpendingChart } from './charts.js';

let toastTimeout;
let scannerStream = null;
let scannerAnimationId = null;
let barcodeDetector = null;
let currentProductPer100g = null;

const currencyFormatter = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
const numberFormatter = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 });

function parseDecimal(value, fallback = 0) {
  const normalized = String(value ?? "").trim().replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function formatCalories(value) { return `${numberFormatter.format(Math.round(value))} kcal`; }
function formatGrams(value) { return `${decimalFormatter.format(Math.max(0, value))} g`; }
function decimalToInput(value) { return String(Math.round(Number(value || 0) * 10) / 10).replace(".", ","); }
function escapeHtml(value) { const div = document.createElement("div"); div.textContent = value; return div.innerHTML; }

function showToast(message) {
  const toast = document.querySelector("#toast");
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2600);
}

export function initUI() {
  renderSelectOptions();
  renderGoalButtons();
  bindEvents();
  renderAll();
}

function calculateProfile() {
  const profile = state.profile;
  const age = Math.max(0, parseDecimal(profile.age));
  const weight = Math.max(0, parseDecimal(profile.weight));
  const height = Math.max(0, parseDecimal(profile.height));
  const genderOffset = profile.gender === "female" ? -161 : 5;
  const bmr = 10 * weight + 6.25 * height - 5 * age + genderOffset;
  const activity = ACTIVITY_LEVELS[profile.activity] ?? ACTIVITY_LEVELS.sedentary;
  const goal = GOALS[profile.goal] ?? GOALS.maintain;
  const tdee = bmr * activity.multiplier;
  return { bmr, tdee, dailyGoal: Math.max(0, tdee + goal.adjustment), activity, goal };
}

function calculateMacroTargets(calories, macroPlanKey = state.profile.macroPlan) {
  const plan = MACRO_PLANS[macroPlanKey] ?? MACRO_PLANS.moderate;
  return { protein: (calories * plan.ratios.protein) / 100 / 4, fat: (calories * plan.ratios.fat) / 100 / 9, carbs: (calories * plan.ratios.carbs) / 100 / 4, plan };
}

function renderSelectOptions() {
  document.querySelector("#activitySelect").innerHTML = Object.entries(ACTIVITY_LEVELS)
    .map(([key, a]) => `<option value="${key}">${a.label} — ${a.description}</option>`).join("");
  document.querySelector("#itemMealSelect").innerHTML = Object.entries(MEALS)
    .map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
}

function renderGoalButtons() {
  document.querySelector("#goalButtons").innerHTML = Object.entries(GOALS)
    .map(([key, goal]) => `<button class="goal-button" type="button" data-goal="${key}"><strong>${goal.label}</strong><small>${goal.description} (${goal.adjustment > 0 ? "+" : ""}${goal.adjustment} kcal)</small></button>`).join("");
  document.querySelector("#macroGoalTabs").innerHTML = Object.entries(GOALS)
    .map(([key, goal]) => `<button class="macro-tab" type="button" data-goal="${key}">${goal.macroLabel}</button>`).join("");
}

function renderTheme() {
  document.documentElement.dataset.theme = state.theme;
  document.querySelector("#themeIcon").textContent = state.theme === "dark" ? "☀️" : "🌙";
}

function renderAll() {
  renderTheme();
  renderProfileForm();
  renderProfileSummary();
  renderDiary();
  updateWeightProgressChart(state.weightHistory);
}

function renderProfileForm() {
  document.querySelectorAll("[data-gender]").forEach(b => b.classList.toggle("active", b.dataset.gender === state.profile.gender));
  document.querySelectorAll("[data-goal]").forEach(b => b.classList.toggle("active", b.dataset.goal === state.profile.goal));
  document.querySelectorAll("[data-macro-plan]").forEach(b => b.classList.toggle("active", b.dataset.macroPlan === state.profile.macroPlan));
  document.querySelector("#ageInput").value = state.profile.age;
  document.querySelector("#weightInput").value = String(state.profile.weight).replace(".", ",");
  document.querySelector("#heightInput").value = String(state.profile.height).replace(".", ",");
  document.querySelector("#activitySelect").value = state.profile.activity;
}

function renderProfileSummary() {
  const profile = calculateProfile();
  document.querySelector("#bmrValue").textContent = formatCalories(profile.bmr);
  document.querySelector("#tdeeValue").textContent = formatCalories(profile.tdee);
  document.querySelector("#dailyGoalValue").textContent = formatCalories(profile.dailyGoal);
  document.querySelector("#activityHint").textContent = `${profile.activity.label} · mult ${profile.activity.multiplier}`;
  document.querySelector("#goalHint").textContent = `${profile.goal.label} · ${profile.goal.adjustment > 0 ? "+" : ""}${profile.goal.adjustment} kcal`;

  const height = Math.max(0, parseDecimal(state.profile.height));
  const fiveWeight = Math.max(0, height - 100);
  const estLean = fiveWeight * 0.95;
  document.querySelector("#potentialFive").textContent = `${numberFormatter.format(Math.round(fiveWeight))} kg`;
  document.querySelector("#potentialTen").textContent = `${numberFormatter.format(Math.round(estLean / 0.9))} kg`;
  document.querySelector("#potentialFifteen").textContent = `${numberFormatter.format(Math.round(estLean / 0.85))} kg`;

  // Macros Planner
  const target = calculateMacroTargets(profile.dailyGoal);
  document.querySelector("#macroExplanation").innerHTML = `Baseado no teu objetivo de <strong>${formatCalories(profile.dailyGoal)}</strong>.`;
  document.querySelector("#macroPlanGrid").innerHTML = Object.entries(MACRO_PLANS).map(([key, plan]) => {
    const m = calculateMacroTargets(profile.dailyGoal, key);
    return `<button class="macro-plan-card ${key === state.profile.macroPlan ? "active" : ""}" type="button" data-macro-plan="${key}"><span class="macro-badge">${plan.shortLabel}</span><div class="macro-row"><div><strong>${numberFormatter.format(Math.round(m.protein))}g</strong><span>proteína</span></div></div><div class="macro-row"><div><strong>${numberFormatter.format(Math.round(m.fat))}g</strong><span>gordura</span></div></div><div class="macro-row"><div><strong>${numberFormatter.format(Math.round(m.carbs))}g</strong><span>hidratos</span></div></div></button>`;
  }).join("");
}

function renderDiary() {
  const profile = calculateProfile();
  const totals = state.items.reduce(
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
  document.querySelector("#calorieProgress").style.width = `${progress}%`;
  document.querySelector("#progressPercent").textContent = `${Math.round(progress)}% usado`;
  document.querySelector("#totalSpent").textContent = currencyFormatter.format(totals.spent);

  const t = calculateMacroTargets(profile.dailyGoal);
  document.querySelector("#diaryMacroGrid").innerHTML = [
    { label: "Proteína", c: totals.protein, g: t.protein },
    { label: "Gordura", c: totals.fat, g: t.fat },
    { label: "Hidratos", c: totals.carbs, g: t.carbs },
  ].map(m => `<section class="diary-macro-item"><header><h4>${m.label}</h4><strong>${formatGrams(m.c)}</strong></header><footer><span>Meta ${formatGrams(m.g)}</span></footer></section>`).join("");
  
  updateMacroDonut(totals.protein, totals.fat, totals.carbs);
  updateSpendingChart(state.items);

  document.querySelector("#mealGrid").innerHTML = Object.entries(MEALS).map(([mealKey, label]) => {
    const mi = state.items.filter(i => i.meal === mealKey);
    const sum = mi.reduce((acc, i) => acc + i.calories, 0);
    const html = mi.length === 0 ? `<p class="empty-state">Vazio.</p>` : mi.map(i => `<div class="food-item"><div><strong>${escapeHtml(i.name)}</strong><span>${formatCalories(i.calories)}</span><span class="food-macros">P ${formatGrams(i.protein)} G ${formatGrams(i.fat)} H ${formatGrams(i.carbs)}</span></div><button class="delete-button" data-delete="${i.id}">×</button></div>`).join("");
    return `<article class="card meal-card"><div class="card-header"><div><p class="eyebrow">Refeição</p><h3>${label}</h3></div><span class="pill">${formatCalories(sum)}</span></div><div class="meal-list">${html}</div><button class="add-meal-button" data-add-meal="${mealKey}">+ Adicionar</button></article>`;
  }).join("");
}

// Lógica de UI - Scanner e Modais
function openModal(meal = "snacks") {
  currentProductPer100g = null;
  document.querySelector("#itemForm").reset();
  document.querySelector("#itemMealSelect").value = meal;
  document.querySelector("#itemQuantityInput").value = "100";
  document.querySelector("#itemPriceInput").value = "0,00";
  document.querySelector("#foodSearchInput").value = "";
  document.querySelector("#searchResults").classList.remove('active');
  document.querySelector("#itemModal").classList.add("open");
}

async function closeModal() {
  await stopBarcodeScanner();
  document.querySelector("#itemModal").classList.remove("open");
}

function updateItemNutritionFromProduct() {
  if (!currentProductPer100g) return;
  const factor = Math.max(0, parseDecimal(document.querySelector("#itemQuantityInput").value, 100)) / 100;

  const calories = currentProductPer100g.calories * factor;
  const protein = currentProductPer100g.protein * factor;
  const fat = currentProductPer100g.fat * factor;
  const carbs = currentProductPer100g.carbs * factor;

  // Se o produto trouxer um valor inválido/NaN, o campo fica a 0 em vez de "NaN"
  document.querySelector("#itemCaloriesInput").value = Number.isFinite(calories) ? Math.round(calories) : 0;
  document.querySelector("#itemProteinInput").value = decimalToInput(Number.isFinite(protein) ? protein : 0);
  document.querySelector("#itemFatInput").value = decimalToInput(Number.isFinite(fat) ? fat : 0);
  document.querySelector("#itemCarbsInput").value = decimalToInput(Number.isFinite(carbs) ? carbs : 0);
}

// Scanner (Mantém ZXing)
async function startBarcodeScanner() {
  const video = document.querySelector("#barcodeVideo");
  const frame = document.querySelector("#scannerFrame");
  if ('BarcodeDetector' in window) {
    try {
      barcodeDetector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a'] });
      scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }});
      video.srcObject = scannerStream;
      video.play();
      frame.classList.add('scanning');
      document.querySelector("#stopCameraButton").hidden = false;
      scanBarcodeFrame(); 
      return;
    } catch(e) { console.warn('Fallback para ZXing.'); }
  }
  try {
    if (typeof ZXing === 'undefined') { await import('https://unpkg.com/@zxing/library@0.20.0/umd/index.min.js'); }
    video.setAttribute('playsinline', 'true'); video.muted = true;
    frame.classList.add('scanning');
    document.querySelector("#stopCameraButton").hidden = false;
    const reader = new ZXing.BrowserMultiFormatReader();
    window.__zxingReader = reader;
    await reader.decodeFromVideoDevice(undefined, video, (res) => {
      if (res && res.getText()) { stopBarcodeScanner(); lookupBarcode(res.getText()); }
    });
  } catch (e) { showToast('Câmara indisponível.'); }
}

async function scanBarcodeFrame() {
  if (!scannerStream) return;
  try {
    const codes = await barcodeDetector.detect(document.querySelector("#barcodeVideo"));
    if (codes[0]) { stopBarcodeScanner(); lookupBarcode(codes[0].rawValue); return; }
  } catch(e){}
  scannerAnimationId = requestAnimationFrame(scanBarcodeFrame);
}

async function stopBarcodeScanner() {
  cancelAnimationFrame(scannerAnimationId);
  if (window.__zxingReader) await window.__zxingReader.reset();
  if (scannerStream) scannerStream.getTracks().forEach(t => t.stop());
  document.querySelector("#scannerFrame").classList.remove('scanning');
  document.querySelector("#stopCameraButton").hidden = true;
}

async function lookupBarcode(raw = document.querySelector("#barcodeInput").value) {
  const ean = String(raw).replace(/[^\d]/g, "");
  if (!ean) return;
  document.querySelector("#barcodeInput").value = ean;
  document.querySelector("#scannerStatus").textContent = "A pesquisar...";
  try {
    const product = await fetchProductByEan(ean);
    if(product) {
      const nut = product.nutriments || {};
      const cal = Number(nut['energy-kcal_100g'] || 0);
      const p = Number(nut.proteins_100g || 0);
      const f = Number(nut.fat_100g || 0);
      const c = Number(nut.carbohydrates_100g || 0);
      
      document.querySelector("#itemNameInput").value = product.product_name || "Produto OFF";
      document.querySelector("#itemQuantityInput").value = "100";
      currentProductPer100g = { calories: cal, protein: p, fat: f, carbs: c };
      updateItemNutritionFromProduct();
      showToast("Macros preenchidos.");
      document.querySelector("#scannerStatus").textContent = "Encontrado!";
    } else throw new Error();
  } catch(e) { showToast("Não encontrado."); document.querySelector("#scannerStatus").textContent = "EAN não encontrado."; }
}

function bindEvents() {
  // Theme & Views
  document.querySelector("#themeToggle").addEventListener("click", () => { state.theme = state.theme === "dark" ? "light" : "dark"; saveState(); renderTheme(); });
  document.querySelectorAll("[data-view]").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === btn.dataset.view));
    document.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n === btn));
  }));
  document.querySelector("#goToDiaryButton").addEventListener("click", () => document.querySelector("[data-view='diaryView']").click());

  // Perfil Inputs
  ["age", "weight", "height"].forEach(id => {
    document.querySelector(`#${id}Input`).addEventListener("input", e => { state.profile[id] = parseDecimal(e.target.value); saveState(); renderAll(); });
  });
  document.querySelector("#activitySelect").addEventListener("change", e => { state.profile.activity = e.target.value; saveState(); renderAll(); });
  document.addEventListener("click", e => {
    if(e.target.closest("[data-gender]")) { state.profile.gender = e.target.closest("[data-gender]").dataset.gender; saveState(); renderAll(); }
    if(e.target.closest("[data-goal]")) { state.profile.goal = e.target.closest("[data-goal]").dataset.goal; saveState(); renderAll(); }
    if(e.target.closest("[data-macro-plan]")) { state.profile.macroPlan = e.target.closest("[data-macro-plan]").dataset.macroPlan; saveState(); renderAll(); }
    if(e.target.closest("[data-add-meal]")) openModal(e.target.closest("[data-add-meal]").dataset.addMeal);
    if(e.target.closest("[data-delete]")) { state.items = state.items.filter(i => i.id !== e.target.closest("[data-delete]").dataset.delete); saveState(); renderAll(); }
  });

  // Modal & Formulário
  document.querySelector("#quickAddButton").addEventListener("click", () => openModal("snacks"));
  document.querySelector("#closeModalButton").addEventListener("click", closeModal);
  document.querySelector("#itemQuantityInput").addEventListener("input", updateItemNutritionFromProduct);
  document.querySelector("#itemForm").addEventListener("submit", e => {
    e.preventDefault();
    state.items.push(normalizeItem({
      name: document.querySelector("#itemNameInput").value,
      quantity: parseDecimal(document.querySelector("#itemQuantityInput").value),
      calories: Math.round(parseDecimal(document.querySelector("#itemCaloriesInput").value)),
      protein: parseDecimal(document.querySelector("#itemProteinInput").value),
      fat: parseDecimal(document.querySelector("#itemFatInput").value),
      carbs: parseDecimal(document.querySelector("#itemCarbsInput").value),
      price: parseDecimal(document.querySelector("#itemPriceInput").value),
      meal: document.querySelector("#itemMealSelect").value,
      date: new Date().toISOString() // Data de criação, usada depois para agrupar o gráfico de gastos por dia
    }));
    saveState(); renderAll(); closeModal(); showToast("Guardado!");
  });

  document.querySelector("#clearDiaryButton").addEventListener("click", () => { if(confirm("Limpar o diário hoje?")) { state.items = []; saveState(); renderAll(); }});
  
  // Scanner
  document.querySelector("#startCameraButton").addEventListener("click", startBarcodeScanner);
  document.querySelector("#stopCameraButton").addEventListener("click", stopBarcodeScanner);
  document.querySelector("#lookupBarcodeButton").addEventListener("click", () => lookupBarcode());

  // PESQUISA EM TEMPO REAL COMBINADA (INSA + OFF)
  let searchTimer;
  document.querySelector("#foodSearchInput").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    const query = e.target.value;
    const resultList = document.querySelector("#searchResults");
    
    if (query.length < 2) { resultList.classList.remove('active'); return; }

    searchTimer = setTimeout(async () => {
      document.querySelector("#scannerStatus").textContent = "A pesquisar no INSA e Open Food Facts...";
      const results = await searchFoodCombined(query);
      if (results.length === 0) {
        resultList.innerHTML = `<li class="search-result-item">Sem resultados.</li>`;
      } else {
        resultList.innerHTML = results.map((food, idx) => `
          <li class="search-result-item" data-idx="${idx}">
            <div><strong>${escapeHtml(food.name)}</strong><small>${food.calories} kcal/100g</small></div>
            <span class="source-tag ${food.isLocal ? 'insa' : 'off'}">${food.source}</span>
          </li>
        `).join("");
      }
      resultList.classList.add('active');
      
      // Ligar cliques nos resultados
      resultList.querySelectorAll("li[data-idx]").forEach(li => {
        li.addEventListener("click", () => {
          const food = results[li.dataset.idx];
          document.querySelector("#itemNameInput").value = food.name;
          document.querySelector("#itemQuantityInput").value = "100";
          currentProductPer100g = { calories: food.calories, protein: food.protein, fat: food.fat, carbs: food.carbs };
          updateItemNutritionFromProduct();
          resultList.classList.remove('active');
          document.querySelector("#foodSearchInput").value = "";
          showToast("Alimento selecionado.");
        });
      });
    }, 400);
  });

  // REGISTO DE PESO CORPORAL
  document.querySelector("#weightLogDate").value = new Date().toISOString().split('T')[0];
  document.querySelector("#addWeightLogButton").addEventListener("click", () => {
    const d = document.querySelector("#weightLogDate").value;
    const w = parseFloat(document.querySelector("#weightLogValue").value);
    if(d && w) {
      state.weightHistory = state.weightHistory.filter(entry => entry.date !== d);
      state.weightHistory.push({ date: d, weight: w });
      state.weightHistory.sort((a,b) => new Date(a.date) - new Date(b.date));
      saveState();
      document.querySelector("#weightLogValue").value = "";
      renderAll();
      showToast("Peso guardado no histórico.");
    }
  });
}