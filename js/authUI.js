import { signIn, signUp, translateAuthError } from "./auth.js";

let mode = "signin";

function setMode(nextMode) {
  mode = nextMode;
  document.querySelectorAll("#authModeToggle [data-mode]").forEach(btn =>
    btn.classList.toggle("active", btn.dataset.mode === mode)
  );
  document.querySelector("#authSubmitButton").textContent = mode === "signin" ? "Entrar" : "Criar conta";
  hideError();
}

function showError(message) {
  const el = document.querySelector("#authError");
  el.textContent = message;
  el.hidden = false;
}

function hideError() {
  document.querySelector("#authError").hidden = true;
}

export function showAuthScreen() {
  document.querySelector("#authScreen").hidden = false;
  document.querySelector("#appShell").hidden = true;
}

export function hideAuthScreen() {
  document.querySelector("#authScreen").hidden = true;
  document.querySelector("#appShell").hidden = false;
}

export function init(onAuthenticated) {
  document.querySelector("#authModeToggle").addEventListener("click", e => {
    const btn = e.target.closest("[data-mode]");
    if (btn) setMode(btn.dataset.mode);
  });

  document.querySelector("#continueOfflineButton").addEventListener("click", () => {
    onAuthenticated(null);
  });

  document.querySelector("#authForm").addEventListener("submit", async e => {
    e.preventDefault();
    hideError();
    const email = document.querySelector("#authEmail").value.trim();
    const password = document.querySelector("#authPassword").value;
    const submitButton = document.querySelector("#authSubmitButton");
    submitButton.disabled = true;

    try {
      const result = mode === "signin" ? await signIn(email, password) : await signUp(email, password);
      if (mode === "signup" && !result.session) {
        showError("Conta criada! Confirma o teu email antes de entrares.");
        return;
      }
      onAuthenticated(result.session);
    } catch (err) {
      showError(translateAuthError(err));
    } finally {
      submitButton.disabled = false;
    }
  });
}