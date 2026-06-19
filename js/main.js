import { loadState, state, onChange, setTheme, setUserId, mergeRemoteState } from "./state.js";
import { init as initModalUI } from "./modalUI.js";
import { init as initProfileUI } from "./profileUI.js";
import { init as initDiaryUI } from "./diaryUI.js";
import { init as initWeightUI } from "./weightUI.js";
import { initToast, showToast } from "./utils.js";
import { getSession, signOut } from "./auth.js";
import { init as initAuthUI, showAuthScreen, hideAuthScreen } from "./authUI.js";
import { fetchRemoteState, flushOutbox } from "./supabase/dataService.js";

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

  document.querySelector("#signOutButton").addEventListener("click", async () => {
    await signOut();
    // Forma mais simples e segura de garantir que nada de uma sessão fica
    // misturado com a próxima: recarrega a app limpa, a pedir login outra vez.
    window.location.reload();
  });
}

// Liga-se ao Supabase em segundo plano: vai buscar o que já está na cloud,
// junta com o que existe localmente e esvazia a fila de mutações pendentes.
// A app nunca espera por isto — já está utilizável com os dados locais.
async function connectToSupabase(userId) {
  setUserId(userId);
  document.querySelector("#signOutButton").hidden = false;
  try {
    const remote = await fetchRemoteState(userId);
    mergeRemoteState(remote);
    await flushOutbox();
  } catch (err) {
    console.warn("Não foi possível sincronizar com o Supabase agora:", err);
    showToast("Sem ligação à cloud — a usar dados locais.");
  }
}

function startApp() {
  bindShell();
  renderTheme();
  onChange(renderTheme);
  initToast();
  initModalUI();
  initProfileUI();
  initDiaryUI();
  initWeightUI();

  // Sincroniza só ao fechar/sair da app (conforme decidido) — best effort.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && state) flushOutbox();
  });

  console.log("Sistema Modular Iniciado: TCA Integrada + Chart.js Ativos.");
}

document.addEventListener("DOMContentLoaded", async () => {
  loadState();
  startApp();

  let session = null;
  try {
    session = await getSession();
  } catch {
    // Sem ligação ou Supabase mal configurado — segue para o ecrã de login,
    // onde "Continuar sem conta" garante que a app continua usável offline.
  }

  initAuthUI(async authSession => {
    hideAuthScreen();
    if (authSession?.user) await connectToSupabase(authSession.user.id);
  });

  if (session?.user) {
    hideAuthScreen();
    await connectToSupabase(session.user.id);
  } else {
    showAuthScreen();
  }
});