export const currencyFormatter = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
export const numberFormatter = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 });
export const decimalFormatter = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 });

let toastTimeout;

export function parseDecimal(value, fallback = 0) {
  const normalized = String(value ?? "").trim().replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatCalories(value) {
  return `${numberFormatter.format(Math.round(value))} kcal`;
}

export function formatGrams(value) {
  return `${decimalFormatter.format(Math.max(0, value))} g`;
}

export function decimalToInput(value) {
  return String(Math.round(Number(value || 0) * 10) / 10).replace(".", ",");
}

export function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 4000);
}

export function initToast() {
  const toast = document.querySelector("#toast");
  toast?.addEventListener("click", () => {
    clearTimeout(toastTimeout);
    toast.classList.remove("show");
  });
}
