import { state, onChange, setProfileField, resetProfile, ACTIVITY_LEVELS, GOALS, MACRO_PLANS } from "./state.js";
import { calculateProfile, calculateMusclePotential } from "./tdee.js";
import { calculateMacroTargets } from "./macro.js";
import { updateSpendingChart } from "./charts.js";
import { numberFormatter, formatCalories, parseDecimal } from "./utils.js";

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

function render() {
  renderProfileForm();
  renderProfileSummary();
  updateSpendingChart(state.items);
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
}

export function init() {
  renderSelectOptions();
  renderGoalButtons();
  bindEvents();
  render();
  onChange(render);
}
