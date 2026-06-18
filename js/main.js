import { loadState, state, onChange, setTheme } from "./state.js";
import { init as initModalUI } from "./modalUI.js";
import { init as initProfileUI } from "./profileUI.js";
import { init as initDiaryUI } from "./diaryUI.js";
import { init as initWeightUI } from "./weightUI.js";
import { initToast } from "./utils.js";

function renderTheme() {
  document.documentElement.dataset.theme = state.theme;
  document.querySelector("#themeIcon").textContent = state.theme === "dark" ? "☀️" : "🌙";
}

function bindShell() {
  document.querySelector("#themeToggle").addEventListener("click", () => {
    setTheme(state.theme === "dark" ? "light" : "dark");
  });

  document.querySelectorAll("[data-view]").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === btn.dataset.view));
    document.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n === btn));
  }));

  document.querySelector("#goToDiaryButton").addEventListener("click", () => {
    document.querySelector("[data-view='diaryView']").click();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  bindShell();
  renderTheme();
  onChange(renderTheme);
  initToast();
  initModalUI();
  initProfileUI();
  initDiaryUI();
  initWeightUI();
  console.log("Sistema Modular Iniciado: TCA Integrada + Chart.js Ativos.");
});
