const ACTIVITY_LEVELS = {
  sedentary: {
    label: "Sedentário",
    description: "Pouco ou nenhum exercício",
    multiplier: 1.2,
  },
  light: {
    label: "Ligeiramente ativo",
    description: "Exercício leve 1–3 dias/semana",
    multiplier: 1.375,
  },
  moderate: {
    label: "Moderadamente ativo",
    description: "Exercício moderado 3–5 dias/semana",
    multiplier: 1.55,
  },
  very: {
    label: "Muito ativo",
    description: "Exercício intenso 6–7 dias/semana",
    multiplier: 1.725,
  },
  athlete: {
    label: "Atleta",
    description: "Treino físico muito exigente",
    multiplier: 1.9,
  },
};

const GOALS = {
  maintain: {
    label: "Manter peso",
    macroLabel: "Manutenção",
    description: "Calorias de manutenção",
    adjustment: 0,
  },
  cutting: {
    label: "Perder gordura",
    macroLabel: "Cutting",
    description: "Défice moderado",
    adjustment: -500,
  },
  bulking: {
    label: "Ganhar massa",
    macroLabel: "Bulking",
    description: "Superavit controlado",
    adjustment: 500,
  },
};

const MACRO_PLANS = {
  moderate: {
    label: "Hidratos moderados",
    shortLabel: "Moderado",
    ratioLabel: "30/35/35",
    ratios: { protein: 30, fat: 35, carbs: 35 },
  },
  lower: {
    label: "Baixo em hidratos",
    shortLabel: "Baixo carb",
    ratioLabel: "40/40/20",
    ratios: { protein: 40, fat: 40, carbs: 20 },
  },
  higher: {
    label: "Alto em hidratos",
    shortLabel: "Alto carb",
    ratioLabel: "30/20/50",
    ratios: { protein: 30, fat: 20, carbs: 50 },
  },
};

const MEALS = {
  breakfast: "Pequeno-almoço",
  lunch: "Almoço",
  dinner: "Jantar",
  snacks: "Snacks",
};

const PORTUGAL_SAMPLES = [
  {
    name: "Peito de Frango Continente",
    calories: 248,
    protein: 46,
    fat: 5,
    carbs: 0,
    price: 3.49,
    quantity: 200,
    meal: "lunch",
  },
  {
    name: "Iogurte Proteico Pingo Doce",
    calories: 142,
    protein: 20,
    fat: 0.5,
    carbs: 13,
    price: 0.89,
    quantity: 200,
    meal: "snacks",
  },
  {
    name: "Sopa de Legumes Mercadona",
    calories: 118,
    protein: 5,
    fat: 3,
    carbs: 18,
    price: 1.79,
    quantity: 300,
    meal: "dinner",
  },
  {
    name: "Aveia Nacional com Banana",
    calories: 336,
    protein: 12,
    fat: 7,
    carbs: 56,
    price: 0.72,
    quantity: 100,
    meal: "breakfast",
  },
];

const DEFAULT_PROFILE = {
  gender: "male",
  age: 30,
  weight: 78,
  height: 178,
  activity: "moderate",
  goal: "maintain",
  macroPlan: "moderate",
};

const STORAGE_KEY = "calorias-orcamento-state-v2";
const OPEN_FOOD_FACTS_FIELDS = [
  "product_name",
  "generic_name",
  "brands",
  "quantity",
  "serving_size",
  "nutriments",
  "nutrition_grades",
  "image_front_url",
].join(",");

const currencyFormatter = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("pt-PT", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("pt-PT", {
  maximumFractionDigits: 1,
});

const createId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

let state = loadState();
let toastTimeout;
let scannerStream = null;
let scannerAnimationId = null;
let barcodeDetector = null;
let currentProductPer100g = null;

const refs = {
  html: document.documentElement,
  themeToggle: document.querySelector("#themeToggle"),
  themeIcon: document.querySelector("#themeIcon"),
  profileForm: document.querySelector("#profileForm"),
  ageInput: document.querySelector("#ageInput"),
  weightInput: document.querySelector("#weightInput"),
  heightInput: document.querySelector("#heightInput"),
  activitySelect: document.querySelector("#activitySelect"),
  goalButtons: document.querySelector("#goalButtons"),
  resetProfileButton: document.querySelector("#resetProfileButton"),
  goToDiaryButton: document.querySelector("#goToDiaryButton"),
  bmrValue: document.querySelector("#bmrValue"),
  tdeeValue: document.querySelector("#tdeeValue"),
  dailyGoalValue: document.querySelector("#dailyGoalValue"),
  activityHint: document.querySelector("#activityHint"),
  goalHint: document.querySelector("#goalHint"),
  potentialText: document.querySelector("#potentialText"),
  potentialFive: document.querySelector("#potentialFive"),
  potentialTen: document.querySelector("#potentialTen"),
  potentialFifteen: document.querySelector("#potentialFifteen"),
  potentialNote: document.querySelector("#potentialNote"),
  macroGoalTabs: document.querySelector("#macroGoalTabs"),
  macroExplanation: document.querySelector("#macroExplanation"),
  macroPlanGrid: document.querySelector("#macroPlanGrid"),
  goalCalories: document.querySelector("#goalCalories"),
  consumedCalories: document.querySelector("#consumedCalories"),
  remainingCalories: document.querySelector("#remainingCalories"),
  remainingStatus: document.querySelector("#remainingStatus"),
  calorieProgress: document.querySelector("#calorieProgress"),
  progressPercent: document.querySelector("#progressPercent"),
  totalSpent: document.querySelector("#totalSpent"),
  diaryMacroTitle: document.querySelector("#diaryMacroTitle"),
  diaryMacroPlan: document.querySelector("#diaryMacroPlan"),
  diaryMacroGrid: document.querySelector("#diaryMacroGrid"),
  mealGrid: document.querySelector("#mealGrid"),
  clearDiaryButton: document.querySelector("#clearDiaryButton"),
  quickAddButton: document.querySelector("#quickAddButton"),
  modal: document.querySelector("#itemModal"),
  closeModalButton: document.querySelector("#closeModalButton"),
  scannerFrame: document.querySelector("#scannerFrame"),
  scannerStatus: document.querySelector("#scannerStatus"),
  barcodeVideo: document.querySelector("#barcodeVideo"),
  startCameraButton: document.querySelector("#startCameraButton"),
  sampleProductButton: document.querySelector("#sampleProductButton"),
  stopCameraButton: document.querySelector("#stopCameraButton"),
  barcodeInput: document.querySelector("#barcodeInput"),
  lookupBarcodeButton: document.querySelector("#lookupBarcodeButton"),
  itemForm: document.querySelector("#itemForm"),
  itemNameInput: document.querySelector("#itemNameInput"),
  itemQuantityInput: document.querySelector("#itemQuantityInput"),
  itemCaloriesInput: document.querySelector("#itemCaloriesInput"),
  itemProteinInput: document.querySelector("#itemProteinInput"),
  itemFatInput: document.querySelector("#itemFatInput"),
  itemCarbsInput: document.querySelector("#itemCarbsInput"),
  itemPriceInput: document.querySelector("#itemPriceInput"),
  itemMealSelect: document.querySelector("#itemMealSelect"),
  toast: document.querySelector("#toast"),
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function loadState() {
  const fallbackTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.profile && Array.isArray(saved?.items)) {
      return {
        profile: { ...DEFAULT_PROFILE, ...saved.profile },
        items: saved.items.map(normalizeItem),
        theme: saved.theme || fallbackTheme,
      };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    profile: { ...DEFAULT_PROFILE },
    items: [],
    theme: fallbackTheme,
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeItem(item) {
  return {
    id: item.id || createId(),
    name: item.name || "Alimento",
    calories: Number(item.calories || 0),
    protein: Number(item.protein || 0),
    fat: Number(item.fat || 0),
    carbs: Number(item.carbs || 0),
    price: Number(item.price || 0),
    quantity: Number(item.quantity || 0),
    barcode: item.barcode || "",
    meal: MEALS[item.meal] ? item.meal : "snacks",
  };
}

function parseDecimal(value, fallback = 0) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCalories(value) {
  return `${numberFormatter.format(Math.round(value))} kcal`;
}

function formatGrams(value) {
  return `${decimalFormatter.format(Math.max(0, value))} g`;
}

function calculateProfile(profile = state.profile, goalKey = profile.goal) {
  const age = Math.max(0, parseDecimal(profile.age));
  const weight = Math.max(0, parseDecimal(profile.weight));
  const height = Math.max(0, parseDecimal(profile.height));
  const genderOffset = profile.gender === "female" ? -161 : 5;
  const bmr = 10 * weight + 6.25 * height - 5 * age + genderOffset;
  const activity = ACTIVITY_LEVELS[profile.activity] ?? ACTIVITY_LEVELS.sedentary;
  const goal = GOALS[goalKey] ?? GOALS.maintain;
  const tdee = bmr * activity.multiplier;
  const dailyGoal = Math.max(0, tdee + goal.adjustment);

  return {
    bmr,
    tdee,
    dailyGoal,
    activity,
    goal,
    goalKey,
  };
}

function calculateMacroTargets(calories, macroPlanKey = state.profile.macroPlan) {
  const plan = MACRO_PLANS[macroPlanKey] ?? MACRO_PLANS.moderate;
  return {
    protein: (calories * plan.ratios.protein) / 100 / 4,
    fat: (calories * plan.ratios.fat) / 100 / 9,
    carbs: (calories * plan.ratios.carbs) / 100 / 4,
    plan,
  };
}

function calculateMuscularPotential() {
  const height = Math.max(0, parseDecimal(state.profile.height));
  const fivePercentWeight = Math.max(0, height - 100);
  const estimatedLeanMass = fivePercentWeight * 0.95;

  return {
    five: fivePercentWeight,
    ten: estimatedLeanMass / 0.9,
    fifteen: estimatedLeanMass / 0.85,
  };
}

function getDiaryTotals() {
  return state.items.reduce(
    (totals, item) => ({
      calories: totals.calories + Number(item.calories || 0),
      protein: totals.protein + Number(item.protein || 0),
      fat: totals.fat + Number(item.fat || 0),
      carbs: totals.carbs + Number(item.carbs || 0),
      spent: totals.spent + Number(item.price || 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0, spent: 0 },
  );
}

function renderSelectOptions() {
  refs.activitySelect.innerHTML = Object.entries(ACTIVITY_LEVELS)
    .map(
      ([key, activity]) =>
        `<option value="${key}">${activity.label} — ${activity.description}</option>`,
    )
    .join("");

  refs.itemMealSelect.innerHTML = Object.entries(MEALS)
    .map(([key, label]) => `<option value="${key}">${label}</option>`)
    .join("");
}

function renderGoalButtons() {
  refs.goalButtons.innerHTML = Object.entries(GOALS)
    .map(
      ([key, goal]) => `
        <button class="goal-button" type="button" data-goal="${key}">
          <strong>${goal.label}</strong>
          <small>${goal.description} (${goal.adjustment > 0 ? "+" : ""}${goal.adjustment} kcal)</small>
        </button>
      `,
    )
    .join("");

  refs.macroGoalTabs.innerHTML = Object.entries(GOALS)
    .map(
      ([key, goal]) => `
        <button class="macro-tab" type="button" data-goal="${key}">
          ${goal.macroLabel}
        </button>
      `,
    )
    .join("");
}

function renderProfileForm() {
  const { profile } = state;

  document.querySelectorAll("[data-gender]").forEach((button) => {
    button.classList.toggle("active", button.dataset.gender === profile.gender);
  });

  document.querySelectorAll("[data-goal]").forEach((button) => {
    button.classList.toggle("active", button.dataset.goal === profile.goal);
  });

  document.querySelectorAll("[data-macro-plan]").forEach((button) => {
    button.classList.toggle("active", button.dataset.macroPlan === profile.macroPlan);
  });

  refs.ageInput.value = profile.age;
  refs.weightInput.value = String(profile.weight).replace(".", ",");
  refs.heightInput.value = String(profile.height).replace(".", ",");
  refs.activitySelect.value = profile.activity;
}

function renderProfileSummary() {
  const profile = calculateProfile();
  const potential = calculateMuscularPotential();

  refs.bmrValue.textContent = formatCalories(profile.bmr);
  refs.tdeeValue.textContent = formatCalories(profile.tdee);
  refs.dailyGoalValue.textContent = formatCalories(profile.dailyGoal);
  refs.activityHint.textContent = `${profile.activity.label} · multiplicador ${profile.activity.multiplier}`;
  refs.goalHint.textContent = `${profile.goal.label} · ${
    profile.goal.adjustment > 0 ? "+" : ""
  }${profile.goal.adjustment} kcal`;

  refs.potentialFive.textContent = `${numberFormatter.format(Math.round(potential.five))} kg`;
  refs.potentialTen.textContent = `${numberFormatter.format(Math.round(potential.ten))} kg`;
  refs.potentialFifteen.textContent = `${numberFormatter.format(Math.round(potential.fifteen))} kg`;
  refs.potentialText.innerHTML = `Segundo a fórmula de Martin Berkhan, o teu potencial máximo estimado seria <strong>${numberFormatter.format(
    Math.round(potential.five),
  )} kg</strong> a cerca de 5% de gordura corporal. Como quase ninguém quer viver a 5%, objetivos mais realistas seriam <strong>${numberFormatter.format(
    Math.round(potential.ten),
  )} kg</strong> a 10% e <strong>${numberFormatter.format(Math.round(potential.fifteen))} kg</strong> a 15%.`;
  refs.potentialNote.textContent =
    state.profile.gender === "female"
      ? "Nota: esta fórmula foi proposta para homens naturais; para mulheres é apenas uma referência muito aproximada."
      : "Nota: isto é uma estimativa para atletas naturais, não uma prescrição médica nem um alvo obrigatório.";

  renderMacroPlanner();
}

function renderMacroPlanner() {
  const selectedProfile = calculateProfile();
  const maintenanceCalories = selectedProfile.tdee;
  const selectedGoal = selectedProfile.goal;
  const selectedCalories = selectedProfile.dailyGoal;

  if (selectedGoal.adjustment === 0) {
    refs.macroExplanation.innerHTML = `Estes macronutrientes refletem as tuas calorias de manutenção: <strong>${numberFormatter.format(
      Math.round(selectedCalories),
    )} kcal</strong> por dia.`;
  } else {
    const direction = selectedGoal.adjustment < 0 ? "um défice" : "um superavit";
    refs.macroExplanation.innerHTML = `Estes macronutrientes refletem as tuas calorias de ${selectedGoal.macroLabel.toLowerCase()}: <strong>${numberFormatter.format(
      Math.round(selectedCalories),
    )} kcal</strong> por dia, ${direction} de <strong>${Math.abs(
      selectedGoal.adjustment,
    )} kcal</strong> face à manutenção de <strong>${numberFormatter.format(
      Math.round(maintenanceCalories),
    )} kcal</strong>.`;
  }

  refs.macroPlanGrid.innerHTML = Object.entries(MACRO_PLANS)
    .map(([key, plan]) => {
      const macros = calculateMacroTargets(selectedCalories, key);
      return `
        <button class="macro-plan-card ${
          key === state.profile.macroPlan ? "active" : ""
        }" type="button" data-macro-plan="${key}">
          <span class="macro-badge">${plan.shortLabel} (${plan.ratioLabel})</span>
          <div class="macro-row">
            <div>
              <strong>${numberFormatter.format(Math.round(macros.protein))}g</strong>
              <span>proteína</span>
            </div>
          </div>
          <div class="macro-row">
            <div>
              <strong>${numberFormatter.format(Math.round(macros.fat))}g</strong>
              <span>gordura</span>
            </div>
          </div>
          <div class="macro-row">
            <div>
              <strong>${numberFormatter.format(Math.round(macros.carbs))}g</strong>
              <span>hidratos</span>
            </div>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderDiary() {
  const profile = calculateProfile();
  const totals = getDiaryTotals();
  const remaining = profile.dailyGoal - totals.calories;
  const progress = profile.dailyGoal > 0 ? (totals.calories / profile.dailyGoal) * 100 : 0;
  const cappedProgress = Math.min(progress, 100);
  const isOverGoal = remaining < 0;

  refs.goalCalories.textContent = numberFormatter.format(Math.round(profile.dailyGoal));
  refs.consumedCalories.textContent = numberFormatter.format(Math.round(totals.calories));
  refs.remainingCalories.textContent = numberFormatter.format(Math.round(remaining));
  refs.remainingCalories.style.color = isOverGoal ? "var(--danger)" : "var(--green)";
  refs.remainingStatus.textContent = isOverGoal ? "Acima do objetivo" : "Restantes";
  refs.remainingStatus.classList.toggle("green", !isOverGoal);
  refs.remainingStatus.classList.toggle("red", isOverGoal);
  refs.calorieProgress.style.width = `${cappedProgress}%`;
  refs.calorieProgress.classList.toggle("over", isOverGoal);
  refs.progressPercent.textContent = `${Math.round(progress)}% usado`;
  refs.totalSpent.textContent = currencyFormatter.format(totals.spent);

  renderDiaryMacros(profile, totals);

  refs.mealGrid.innerHTML = Object.entries(MEALS)
    .map(([mealKey, mealLabel]) => renderMealCard(mealKey, mealLabel))
    .join("");
}

function renderDiaryMacros(profile, totals) {
  const target = calculateMacroTargets(profile.dailyGoal);
  const plan = target.plan;
  const macroLabels = {
    protein: "Proteína",
    fat: "Gordura",
    carbs: "Hidratos",
  };

  refs.diaryMacroTitle.textContent = `${profile.goal.macroLabel} · ${formatCalories(
    profile.dailyGoal,
  )}`;
  refs.diaryMacroPlan.textContent = `${plan.shortLabel} (${plan.ratioLabel})`;

  refs.diaryMacroGrid.innerHTML = ["protein", "fat", "carbs"]
    .map((key) => {
      const consumed = totals[key];
      const goal = target[key];
      const remaining = Math.max(0, goal - consumed);
      const percentage = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0;

      return `
        <section class="diary-macro-item">
          <header>
            <h4>${macroLabels[key]}</h4>
            <strong>${formatGrams(consumed)}</strong>
          </header>
          <div class="macro-mini-progress" aria-label="Progresso de ${macroLabels[key]}">
            <span style="width: ${percentage}%"></span>
          </div>
          <footer>
            <span>Meta ${formatGrams(goal)}</span>
            <span>Faltam ${formatGrams(remaining)}</span>
          </footer>
        </section>
      `;
    })
    .join("");
}

function renderMealCard(mealKey, mealLabel) {
  const mealItems = state.items.filter((item) => item.meal === mealKey);
  const mealCalories = mealItems.reduce((total, item) => total + Number(item.calories || 0), 0);
  const mealSpent = mealItems.reduce((total, item) => total + Number(item.price || 0), 0);
  const mealProtein = mealItems.reduce((total, item) => total + Number(item.protein || 0), 0);
  const mealFat = mealItems.reduce((total, item) => total + Number(item.fat || 0), 0);
  const mealCarbs = mealItems.reduce((total, item) => total + Number(item.carbs || 0), 0);
  const listMarkup =
    mealItems.length === 0
      ? `<p class="empty-state">Ainda sem alimentos nesta refeição.</p>`
      : mealItems
          .map(
            (item) => `
              <div class="food-item">
                <div>
                  <strong>${escapeHtml(item.name)}</strong>
                  <span>${formatCalories(item.calories)} · ${currencyFormatter.format(item.price)}${
                    item.quantity ? ` · ${formatGrams(item.quantity)}` : ""
                  }</span>
                  <span class="food-macros">P ${formatGrams(item.protein)} · G ${formatGrams(
                    item.fat,
                  )} · H ${formatGrams(item.carbs)}</span>
                </div>
                <button class="delete-button" type="button" data-delete-item="${item.id}" aria-label="Remover ${escapeHtml(
                  item.name,
                )}">
                  ×
                </button>
              </div>
            `,
          )
          .join("");

  return `
    <article class="card meal-card">
      <div class="card-header">
        <div>
          <p class="eyebrow">Refeição</p>
          <h3>${mealLabel}</h3>
        </div>
        <div class="meal-total">
          <span>${formatCalories(mealCalories)}</span>
          <span>P ${formatGrams(mealProtein)}</span>
          <span>G ${formatGrams(mealFat)}</span>
          <span>H ${formatGrams(mealCarbs)}</span>
          <span>${currencyFormatter.format(mealSpent)}</span>
        </div>
      </div>
      <div class="meal-list">${listMarkup}</div>
      <button class="add-meal-button" type="button" data-add-meal="${mealKey}">
        + Adicionar item
      </button>
    </article>
  `;
}

function renderTheme() {
  refs.html.dataset.theme = state.theme;
  refs.themeIcon.textContent = state.theme === "dark" ? "☀️" : "🌙";
}

function renderAll() {
  renderTheme();
  renderProfileForm();
  renderProfileSummary();
  renderDiary();
}

function setProfileField(field, value) {
  state.profile = {
    ...state.profile,
    [field]: value,
  };
  saveState();
  renderProfileSummary();
  renderDiary();
}

function switchView(viewId) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === viewId);
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openModal(meal = "snacks") {
  currentProductPer100g = null;
  refs.itemForm.reset();
  refs.barcodeInput.value = "";
  refs.itemMealSelect.value = meal;
  refs.itemQuantityInput.value = "100";
  refs.itemPriceInput.value = "0,00";
  refs.scannerStatus.textContent =
    "Usa a câmara quando o browser suportar BarcodeDetector, ou pesquisa o EAN manualmente.";
  refs.modal.classList.add("open");
  refs.modal.setAttribute("aria-hidden", "false");
  setTimeout(() => refs.itemNameInput.focus(), 80);
}

async function closeModal() {
  await stopBarcodeScanner();
  refs.modal.classList.remove("open");
  refs.modal.setAttribute("aria-hidden", "true");
}

function addItemFromForm(event) {
  event.preventDefault();

  const name = refs.itemNameInput.value.trim();
  const quantity = parseDecimal(refs.itemQuantityInput.value);
  const calories = Math.round(parseDecimal(refs.itemCaloriesInput.value));
  const protein = parseDecimal(refs.itemProteinInput.value);
  const fat = parseDecimal(refs.itemFatInput.value);
  const carbs = parseDecimal(refs.itemCarbsInput.value);
  const price = parseDecimal(refs.itemPriceInput.value);
  const barcode = refs.barcodeInput.value.trim();
  const meal = refs.itemMealSelect.value;

  if (!name || calories < 0 || protein < 0 || fat < 0 || carbs < 0 || price < 0 || !MEALS[meal]) {
    showToast("Confirma o nome, calorias, macros, preço e refeição.");
    return;
  }

  state.items = [
    ...state.items,
    normalizeItem({
      id: createId(),
      name,
      calories,
      protein,
      fat,
      carbs,
      price,
      quantity,
      barcode,
      meal,
    }),
  ];

  saveState();
  renderDiary();
  closeModal();
  switchView("diaryView");
  showToast(`${name} adicionado ao diário.`);
}

async function startBarcodeScanner() {
  // --- Tentativa 1: BarcodeDetector nativo (se disponível) ---
  if ('BarcodeDetector' in window) {
    try {
      barcodeDetector = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
      });
      scannerStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      refs.barcodeVideo.srcObject = scannerStream;
      await refs.barcodeVideo.play();
      refs.scannerFrame.classList.add('scanning');
      refs.stopCameraButton.hidden = false;
      refs.startCameraButton.disabled = true;
      refs.scannerStatus.textContent = 'Aponta a câmara para o código de barras.';
      scanBarcodeFrame(); // inicia o loop com requestAnimationFrame
      return;
    } catch (error) {
      console.warn('BarcodeDetector falhou, a usar fallback ZXing.', error);
      // Se falhar (ex: permissão negada), continua para o fallback
    }
  }

  // --- Fallback com ZXing (funciona em qualquer browser com getUserMedia) ---
  try {
    // Carregar a biblioteca ZXing se ainda não estiver disponível
    if (typeof ZXing === 'undefined') {
      await loadScript('https://unpkg.com/@zxing/library@0.20.0/umd/index.min.js');
      await loadScript('https://unpkg.com/@zxing/browser@0.1.0/umd/index.min.js');
    }

    const video = refs.barcodeVideo;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });
    video.srcObject = stream;
    await video.play();
    refs.scannerFrame.classList.add('scanning');
    refs.stopCameraButton.hidden = false;
    refs.startCameraButton.disabled = true;
    refs.scannerStatus.textContent = 'Scanner ZXing ativo – aponta para o código.';

    // Criar o leitor ZXing
    const reader = new ZXing.BrowserMultiFormatReader();
    reader.decodeFromVideoElement(video, (result, error) => {
      if (result) {
        const barcode = result.getText();
        if (barcode) {
          navigator.vibrate?.(60);
          refs.barcodeInput.value = barcode;
          refs.scannerStatus.textContent = `Código detetado: ${barcode}`;
          stopBarcodeScanner(); // para a câmara e o leitor
          lookupBarcode(barcode);
        }
      }
      // Ignoramos erros (são normais enquanto não há código)
    });

    // Guardar referência para conseguir parar depois
    window.__zxingReader = reader;

  } catch (error) {
    refs.scannerStatus.textContent = 'Não foi possível aceder à câmara. Usa a entrada manual.';
    showToast('Câmara indisponível neste dispositivo.');
    console.error(error);
  }
}

async function scanBarcodeFrame() {
  if (!scannerStream || !barcodeDetector) {
    return;
  }

  try {
    const barcodes = await barcodeDetector.detect(refs.barcodeVideo);
    const barcode = barcodes.find((entry) => entry.rawValue)?.rawValue;
    if (barcode) {
      navigator.vibrate?.(60);
      refs.barcodeInput.value = barcode;
      refs.scannerStatus.textContent = `Código detetado: ${barcode}. A consultar a base de dados...`;
      await stopBarcodeScanner();
      lookupBarcode(barcode);
      return;
    }
  } catch {
    refs.scannerStatus.textContent =
      "A leitura falhou neste frame. Continua a apontar para o código ou usa a pesquisa manual.";
  }

  scannerAnimationId = requestAnimationFrame(scanBarcodeFrame);
}

async function stopBarcodeScanner() {
  // Cancelar o loop do BarcodeDetector (se estiver ativo)
  if (scannerAnimationId) {
    cancelAnimationFrame(scannerAnimationId);
    scannerAnimationId = null;
  }

  // Parar o leitor ZXing (se estiver ativo)
  if (window.__zxingReader) {
    try {
      await window.__zxingReader.reset();
      window.__zxingReader = null;
    } catch (e) { /* ignorar */ }
  }

  // Parar o stream de vídeo
  if (scannerStream) {
    scannerStream.getTracks().forEach(track => track.stop());
    scannerStream = null;
  }

  refs.barcodeVideo.pause();
  refs.barcodeVideo.srcObject = null;
  refs.scannerFrame.classList.remove('scanning');
  refs.stopCameraButton.hidden = true;
  refs.startCameraButton.disabled = false;
}

async function lookupBarcode(rawBarcode = refs.barcodeInput.value) {
  const barcode = String(rawBarcode ?? "").replace(/[^\d]/g, "");

  if (!barcode) {
    showToast("Introduz um código de barras válido.");
    return;
  }

  refs.barcodeInput.value = barcode;
  refs.lookupBarcodeButton.disabled = true;
  refs.lookupBarcodeButton.textContent = "A pesquisar...";
  refs.scannerStatus.textContent = "A consultar a Open Food Facts...";

  try {
    const endpoint = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
      barcode,
    )}.json?fields=${encodeURIComponent(OPEN_FOOD_FACTS_FIELDS)}`;
    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error("Resposta inválida da API.");
    }

    const data = await response.json();
    if (data.status !== 1 || !data.product) {
      currentProductPer100g = null;
      refs.scannerStatus.textContent =
        "Produto não encontrado. Podes preencher manualmente e, mais tarde, contribuir para a Open Food Facts.";
      showToast("Produto não encontrado na Open Food Facts.");
      return;
    }

    fillProductFromOpenFoodFacts(data.product, barcode);
    showToast("Produto encontrado e macros preenchidos.");
  } catch (error) {
    refs.scannerStatus.textContent =
      "Não foi possível consultar a Open Food Facts. Verifica a ligação e tenta novamente.";
    showToast("Erro de rede ao pesquisar código de barras.");
  } finally {
    refs.lookupBarcodeButton.disabled = false;
    refs.lookupBarcodeButton.textContent = "Pesquisar na Open Food Facts";
  }
}

function fillProductFromOpenFoodFacts(product, barcode) {
  const nutriments = product.nutriments || {};
  const productName =
    product.product_name || product.generic_name || product.brands || `Produto ${barcode}`;
  const calories = readNutriment(nutriments, "energy-kcal");
  const protein = readNutriment(nutriments, "proteins");
  const fat = readNutriment(nutriments, "fat");
  const carbs = readNutriment(nutriments, "carbohydrates");

  refs.itemNameInput.value = productName;
  refs.itemQuantityInput.value = "100";
  currentProductPer100g = { calories, protein, fat, carbs };
  updateItemNutritionFromProduct();
  refs.scannerStatus.textContent = `${productName} encontrado. Valores preenchidos por 100 g/ml; ajusta a quantidade e o preço pago.`;
}

function readNutriment(nutriments, key) {
  return Number(
    nutriments[`${key}_100g`] ??
      nutriments[key] ??
      nutriments[`${key}_serving`] ??
      nutriments[`${key}_value`] ??
      0,
  );
}

function updateItemNutritionFromProduct() {
  if (!currentProductPer100g) {
    return;
  }

  const factor = Math.max(0, parseDecimal(refs.itemQuantityInput.value, 100)) / 100;
  refs.itemCaloriesInput.value = Math.round(currentProductPer100g.calories * factor);
  refs.itemProteinInput.value = decimalToInput(currentProductPer100g.protein * factor);
  refs.itemFatInput.value = decimalToInput(currentProductPer100g.fat * factor);
  refs.itemCarbsInput.value = decimalToInput(currentProductPer100g.carbs * factor);
}

function fillSampleProduct() {
  const sample = PORTUGAL_SAMPLES[Math.floor(Math.random() * PORTUGAL_SAMPLES.length)];
  refs.itemNameInput.value = sample.name;
  refs.itemQuantityInput.value = decimalToInput(sample.quantity);
  refs.itemCaloriesInput.value = sample.calories;
  refs.itemProteinInput.value = decimalToInput(sample.protein);
  refs.itemFatInput.value = decimalToInput(sample.fat);
  refs.itemCarbsInput.value = decimalToInput(sample.carbs);
  refs.itemPriceInput.value = decimalToInput(sample.price);
  refs.itemMealSelect.value = sample.meal;
  refs.scannerStatus.textContent = "Exemplo português preenchido. Podes guardar ou editar.";
  showToast("Exemplo português preenchido.");
}

function decimalToInput(value) {
  return String(Math.round(Number(value || 0) * 10) / 10).replace(".", ",");
}

function deleteItem(id) {
  const item = state.items.find((entry) => entry.id === id);
  state.items = state.items.filter((entry) => entry.id !== id);
  saveState();
  renderDiary();
  showToast(item ? `${item.name} removido.` : "Item removido.");
}

function clearDiary() {
  if (!state.items.length) {
    showToast("O diário já está vazio.");
    return;
  }

  const confirmed = window.confirm("Queres limpar todos os alimentos do diário de hoje?");
  if (!confirmed) {
    return;
  }

  state.items = [];
  saveState();
  renderDiary();
  showToast("Diário limpo.");
}

function resetProfile() {
  state.profile = { ...DEFAULT_PROFILE };
  saveState();
  renderAll();
  showToast("Perfil reposto para valores de exemplo.");
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  saveState();
  renderTheme();
}

function showToast(message) {
  clearTimeout(toastTimeout);
  refs.toast.textContent = message;
  refs.toast.classList.add("show");
  toastTimeout = setTimeout(() => refs.toast.classList.remove("show"), 2600);
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function bindEvents() {
  refs.themeToggle.addEventListener("click", toggleTheme);
  refs.resetProfileButton.addEventListener("click", resetProfile);
  refs.goToDiaryButton.addEventListener("click", () => switchView("diaryView"));
  refs.clearDiaryButton.addEventListener("click", clearDiary);
  refs.quickAddButton.addEventListener("click", () => openModal("snacks"));
  refs.closeModalButton.addEventListener("click", closeModal);
  refs.startCameraButton.addEventListener("click", startBarcodeScanner);
  refs.sampleProductButton.addEventListener("click", fillSampleProduct);
  refs.stopCameraButton.addEventListener("click", stopBarcodeScanner);
  refs.lookupBarcodeButton.addEventListener("click", () => lookupBarcode());
  refs.barcodeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      lookupBarcode();
    }
  });
  refs.itemQuantityInput.addEventListener("input", updateItemNutritionFromProduct);
  refs.itemForm.addEventListener("submit", addItemFromForm);

  refs.ageInput.addEventListener("input", (event) => {
    setProfileField("age", Math.round(parseDecimal(event.target.value, state.profile.age)));
  });

  refs.weightInput.addEventListener("input", (event) => {
    setProfileField("weight", parseDecimal(event.target.value, state.profile.weight));
  });

  refs.heightInput.addEventListener("input", (event) => {
    setProfileField("height", parseDecimal(event.target.value, state.profile.height));
  });

  refs.activitySelect.addEventListener("change", (event) => {
    setProfileField("activity", event.target.value);
  });

  document.addEventListener("click", (event) => {
    const genderButton = event.target.closest("[data-gender]");
    const goalButton = event.target.closest("[data-goal]");
    const macroPlanButton = event.target.closest("[data-macro-plan]");
    const navButton = event.target.closest("[data-view]");
    const addMealButton = event.target.closest("[data-add-meal]");
    const deleteButton = event.target.closest("[data-delete-item]");

    if (genderButton) {
      setProfileField("gender", genderButton.dataset.gender);
      renderProfileForm();
    }

    if (goalButton) {
      setProfileField("goal", goalButton.dataset.goal);
      renderProfileForm();
    }

    if (macroPlanButton) {
      setProfileField("macroPlan", macroPlanButton.dataset.macroPlan);
      renderProfileForm();
    }

    if (navButton) {
      switchView(navButton.dataset.view);
    }

    if (addMealButton) {
      openModal(addMealButton.dataset.addMeal);
    }

    if (deleteButton) {
      deleteItem(deleteButton.dataset.deleteItem);
    }
  });

  refs.modal.addEventListener("click", (event) => {
    if (event.target === refs.modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && refs.modal.classList.contains("open")) {
      closeModal();
    }
  });
}

renderSelectOptions();
renderGoalButtons();
bindEvents();
renderAll();
