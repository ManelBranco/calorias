import { state, onChange, setProfileField, resetProfile, ACTIVITY_LEVELS, GOALS, MACRO_PLANS } from "./state.js";
import { calculateProfile, calculateMusclePotential } from "./tdee.js";
import { calculateMacroTargets } from "./macro.js";
import { updateSpendingChart, updateWeeklyAverageChart, setSpendingRange } from "./charts.js";
import { numberFormatter, formatCalories, parseDecimal } from "./utils.js";
import { generateShoppingList, calculateDailyCaloriesLast7Days } from "./calculations.js"; // Importar a função!
import { currencyFormatter } from "./utils.js"; // Para formatar o dinheiro


function renderSelectOptions() {
  document.querySelector("#activitySelect").innerHTML = Object.entries(ACTIVITY_LEVELS)
    .map(([key, a]) => `<option value="${key}">${a.label} — ${a.description}</option>`).join("");
}

function renderGoalButtons() {
  document.querySelector("#goalButtons").innerHTML = Object.entries(GOALS)
    .map(([key, goal]) => `<button class="goal-button" type="button" data-goal="${key}"><strong>${goal.label}</strong><small>${goal.description} (${goal.adjustment > 0 ? "+" : ""}${goal.adjustment} kcal)</small></button>`).join("");
  document.querySelector("#macroGoalTabs").innerHTML = Object.entries(GOALS)
    .map(([key, goal]) => `<button class="macro-tab" type="button" data-goal="${key}">${goal.macroLabel}</button>`).join("");
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
  const profile = calculateProfile(state.profile);
  document.querySelector("#bmrValue").textContent = formatCalories(profile.bmr);
  document.querySelector("#tdeeValue").textContent = formatCalories(profile.tdee);
  document.querySelector("#dailyGoalValue").textContent = formatCalories(profile.dailyGoal);
  document.querySelector("#activityHint").textContent = `${profile.activity.label} · mult ${profile.activity.multiplier}`;
  document.querySelector("#goalHint").textContent = `${profile.goal.label} · ${profile.goal.adjustment > 0 ? "+" : ""}${profile.goal.adjustment} kcal`;

  const potential = calculateMusclePotential(state.profile.height);
  document.querySelector("#potentialFive").textContent = `${numberFormatter.format(Math.round(potential.five))} kg`;
  document.querySelector("#potentialTen").textContent = `${numberFormatter.format(Math.round(potential.ten))} kg`;
  document.querySelector("#potentialFifteen").textContent = `${numberFormatter.format(Math.round(potential.fifteen))} kg`;

  const explanationHtml = `Baseado no teu objetivo de <strong>${formatCalories(profile.dailyGoal)}</strong>.`;
  const explanationEl = document.querySelector("#macroExplanation");
  explanationEl.innerHTML = window.DOMPurify ? window.DOMPurify.sanitize(explanationHtml) : explanationHtml;

  document.querySelector("#macroPlanGrid").innerHTML = Object.entries(MACRO_PLANS).map(([key, plan]) => {
    const m = calculateMacroTargets(profile.dailyGoal, key);
    return `<button class="macro-plan-card ${key === state.profile.macroPlan ? "active" : ""}" type="button" data-macro-plan="${key}"><span class="macro-badge">${plan.shortLabel}</span><div class="macro-row"><div><strong>${numberFormatter.format(Math.round(m.protein))}g</strong><span>proteína</span></div></div><div class="macro-row"><div><strong>${numberFormatter.format(Math.round(m.fat))}g</strong><span>gordura</span></div></div><div class="macro-row"><div><strong>${numberFormatter.format(Math.round(m.carbs))}g</strong><span>hidratos</span></div></div></button>`;
  }).join("");
}

function renderShoppingList() {
  const container = document.querySelector("#shoppingListContainer");
  if (!container) return;

  /// Filtramos apenas os últimos 7 dias para fazer a previsão
  const last7DaysDate = new Date();
  last7DaysDate.setDate(last7DaysDate.getDate() - 7);
  const recentItems = state.items.filter(item => new Date(item.date) >= last7DaysDate);

  // IMPORTANTE: Agora passamos os "recentItems" E os "state.favorites"!
  const list = generateShoppingList(recentItems, state.favorites);

  if (!list || list.length === 0) {
    container.innerHTML = "<p class='empty-state'>Ainda não consumiste alimentos suficientes para prever uma lista de compras.</p>";
    return;
  }

  let totalCost = 0;
  
  // Construir a tabela em HTML
  let html = `
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border);">
            <th style="padding: 8px; color: var(--text-muted);">Alimento</th>
            <th style="padding: 8px; color: var(--text-muted);">Qtd. Necessária</th>
            <th style="padding: 8px; color: var(--text-muted);">Custo Estimado</th>
          </tr>
        </thead>
        <tbody>
  `;

list.forEach(item => {
    // Evitamos mostrar alimentos em que não gastaste nada
    if (item.weeklyCost > 0) {
      totalCost += item.weeklyCost;
      html += `
        <tr style="border-bottom: 1px solid var(--surface-soft);">
          <td data-label="Alimento" style="padding: 10px 8px;"><strong>⭐ ${item.name}</strong></td>
          <td data-label="Qtd. Necessária" style="padding: 10px 8px;">${Math.round(item.weeklyQuantity)}g/ml</td>
          <td data-label="Custo Estimado" style="padding: 10px 8px;">${currencyFormatter.format(item.weeklyCost)}</td>
        </tr>
      `;
    }
  });

  html += `
        </tbody>
        <tfoot>
          <tr>
            <th style="padding: 16px 8px 8px 8px; text-align: right;" colspan="2">Total Estimado para 7 dias:</th>
            <th style="padding: 16px 8px 8px 8px; color: var(--primary); font-size: 1.1rem;">${currencyFormatter.format(totalCost)}</th>
          </tr>
        </tfoot>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

function render() {
  renderProfileForm();
  renderProfileSummary();
  updateSpendingChart(state.items);
  updateWeeklyAverageChart(calculateDailyCaloriesLast7Days(state.items, state.currentDate));
  renderShoppingList();
}

function bindEvents() {
  ["age", "weight", "height"].forEach(id => {
    document.querySelector(`#${id}Input`).addEventListener("input", e => setProfileField(id, parseDecimal(e.target.value)));
  });
  document.querySelector("#activitySelect").addEventListener("change", e => setProfileField("activity", e.target.value));
  document.querySelector("#resetProfileButton").addEventListener("click", () => resetProfile());

  document.addEventListener("click", e => {
    const genderBtn = e.target.closest("[data-gender]");
    if (genderBtn) setProfileField("gender", genderBtn.dataset.gender);
    const goalBtn = e.target.closest("[data-goal]");
    if (goalBtn) setProfileField("goal", goalBtn.dataset.goal);
    const macroPlanBtn = e.target.closest("[data-macro-plan]");
    if (macroPlanBtn) setProfileField("macroPlan", macroPlanBtn.dataset.macroPlan);
  });
  document.querySelector("#spendingTimeRange")?.addEventListener("click", e => {
    const btn = e.target.closest(".segment");
    if (!btn) return;

    document.querySelectorAll("#spendingTimeRange .segment").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    setSpendingRange(Number(btn.dataset.range));
    updateSpendingChart(state.items);
  });
}

export function init() {
  renderSelectOptions();
  renderGoalButtons();
  bindEvents();
  render();
  onChange(render);
}

