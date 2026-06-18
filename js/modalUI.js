import { addItem, updateItem, MEALS } from "./state.js";
import { searchFoodCombined, fetchProductByEan, handleApiError } from "./api.js";
import * as scanner from "./scanner.js";
import { parseDecimal, decimalToInput, showToast } from "./utils.js";

let currentProductPer100g = null;
let editingItem = null;
let lastFocusedElement = null;
let searchTimer;

function renderMealSelectOptions() {
  document.querySelector("#itemMealSelect").innerHTML = Object.entries(MEALS)
    .map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
}

function getFocusableElements() {
  const modal = document.querySelector("#itemModal .modal");
  return Array.from(modal.querySelectorAll("input, select, button, textarea, [href]"))
    .filter(el => !el.disabled && el.offsetParent !== null);
}

function handleModalKeydown(e) {
  if (e.key === "Escape") {
    closeModal();
    return;
  }
  if (e.key !== "Tab") return;
  const focusable = getFocusableElements();
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

export function openModal(meal = "snacks", editItem_ = null) {
  lastFocusedElement = document.activeElement;
  currentProductPer100g = null;
  editingItem = editItem_;

  document.querySelector("#itemForm").reset();
  document.querySelector("#foodSearchInput").value = "";
  const resultList = document.querySelector("#searchResults");
  resultList.innerHTML = "";
  resultList.classList.remove("active");

  const submitButton = document.querySelector("#itemForm button[type='submit']");

  if (editingItem) {
    document.querySelector("#modalTitle").textContent = "Editar alimento";
    submitButton.textContent = "Atualizar";
    document.querySelector("#itemNameInput").value = editingItem.name;
    document.querySelector("#packageQuantityInput").value = editingItem.packageQuantity ? decimalToInput(editingItem.packageQuantity) : "";
    document.querySelector("#packagePriceInput").value = editingItem.packagePrice ? decimalToInput(editingItem.packagePrice) : "";
    document.querySelector("#itemQuantityInput").value = decimalToInput(editingItem.quantity || 100);
    document.querySelector("#itemCaloriesInput").value = Math.round(editingItem.calories);
    document.querySelector("#itemProteinInput").value = decimalToInput(editingItem.protein);
    document.querySelector("#itemFatInput").value = decimalToInput(editingItem.fat);
    document.querySelector("#itemCarbsInput").value = decimalToInput(editingItem.carbs);
    document.querySelector("#itemPriceInput").value = decimalToInput(editingItem.price);
    document.querySelector("#itemMealSelect").value = editingItem.meal;
  } else {
    document.querySelector("#modalTitle").textContent = "Adicionar alimento";
    submitButton.textContent = "Guardar alimento";
    document.querySelector("#itemMealSelect").value = meal;
    document.querySelector("#packageQuantityInput").value = "";
    document.querySelector("#packagePriceInput").value = "";
    document.querySelector("#itemQuantityInput").value = "100";
    document.querySelector("#itemPriceInput").value = "0,00";
  }

  if (editingItem) {
    document.querySelector("#modalTitle").textContent = "Editar alimento";
    submitButton.textContent = "Atualizar";
    document.querySelector("#itemNameInput").value = editingItem.name;
    document.querySelector("#itemQuantityInput").value = decimalToInput(editingItem.quantity || 100);
    document.querySelector("#itemCaloriesInput").value = Math.round(editingItem.calories);
    document.querySelector("#itemProteinInput").value = decimalToInput(editingItem.protein);
    document.querySelector("#itemFatInput").value = decimalToInput(editingItem.fat);
    document.querySelector("#itemCarbsInput").value = decimalToInput(editingItem.carbs);
    document.querySelector("#itemPriceInput").value = decimalToInput(editingItem.price);
    document.querySelector("#itemMealSelect").value = editingItem.meal;
  } else {
    document.querySelector("#modalTitle").textContent = "Adicionar alimento";
    submitButton.textContent = "Guardar alimento";
    document.querySelector("#itemMealSelect").value = meal;
    document.querySelector("#itemQuantityInput").value = "100";
    document.querySelector("#itemPriceInput").value = "0,00";
  }

  const modal = document.querySelector("#itemModal");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.addEventListener("keydown", handleModalKeydown);
  document.querySelector("#foodSearchInput").focus();
}

async function closeModal() {
  document.removeEventListener("keydown", handleModalKeydown);
  try {
    await scanner.stop();
  } catch {
    // libertação da câmara falhou - o modal fecha de qualquer forma
  }
  const modal = document.querySelector("#itemModal");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  editingItem = null;
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") lastFocusedElement.focus();
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

async function lookupBarcode(raw) {
  const rawValue = raw ?? document.querySelector("#barcodeInput").value;
  const ean = String(rawValue).replace(/[^\d]/g, "");
  if (!ean) return;
  document.querySelector("#barcodeInput").value = ean;
  const statusEl = document.querySelector("#scannerStatus");
  statusEl.textContent = "A pesquisar...";
  try {
    const product = await fetchProductByEan(ean);
    if (!product) {
      showToast("Não encontrado.");
      statusEl.textContent = "EAN não encontrado.";
      return;
    }
    const nut = product.nutriments || {};
    document.querySelector("#itemNameInput").value = product.product_name || "Produto OFF";
    document.querySelector("#itemQuantityInput").value = "100";
    currentProductPer100g = {
      calories: Number(nut["energy-kcal_100g"] || 0),
      protein: Number(nut.proteins_100g || 0),
      fat: Number(nut.fat_100g || 0),
      carbs: Number(nut.carbohydrates_100g || 0),
    };
    updateItemNutritionFromProduct();
    showToast("Macros preenchidos.");
    statusEl.textContent = "Encontrado!";
  } catch (err) {
    showToast(handleApiError(err));
    statusEl.textContent = "Falha na pesquisa.";
  }
}

function renderSearchResults(results) {
  const resultList = document.querySelector("#searchResults");
  resultList.innerHTML = "";

  if (results.length === 0) {
    const li = document.createElement("li");
    li.className = "search-result-item";
    li.textContent = "Sem resultados.";
    resultList.append(li);
    resultList.classList.add("active");
    return;
  }

  results.forEach(food => {
    const li = document.createElement("li");
    li.className = "search-result-item";

    const info = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = food.name;
    const small = document.createElement("small");
    small.textContent = `${food.calories} kcal/100g`;
    info.append(strong, small);

    const tag = document.createElement("span");
    tag.className = `source-tag ${food.isLocal ? "insa" : "off"}`;
    tag.textContent = food.source;

    li.append(info, tag);
    li.addEventListener("click", () => {
      document.querySelector("#itemNameInput").value = food.name;
      document.querySelector("#itemQuantityInput").value = "100";
      currentProductPer100g = { calories: food.calories, protein: food.protein, fat: food.fat, carbs: food.carbs };
      updateItemNutritionFromProduct();
      resultList.classList.remove("active");
      document.querySelector("#foodSearchInput").value = "";
      showToast("Alimento selecionado.");
    });
    resultList.append(li);
  });
  resultList.classList.add("active");
}

function bindSearch() {
  document.querySelector("#foodSearchInput").addEventListener("input", e => {
    clearTimeout(searchTimer);
    const query = e.target.value;
    const resultList = document.querySelector("#searchResults");
    if (query.length < 2) {
      resultList.classList.remove("active");
      return;
    }
    searchTimer = setTimeout(async () => {
      document.querySelector("#scannerStatus").textContent = "A pesquisar no INSA e Open Food Facts...";
      try {
        const results = await searchFoodCombined(query);
        renderSearchResults(results);
      } catch (err) {
        showToast(handleApiError(err));
      }
    }, 400);
  });
}

function bindForm() {
  document.querySelector("#packageQuantityInput").addEventListener("input", updateCalculatedPrice);
  document.querySelector("#packagePriceInput").addEventListener("input", updateCalculatedPrice);
  
  document.querySelector("#itemQuantityInput").addEventListener("input", () => {
    updateItemNutritionFromProduct();
    updateCalculatedPrice();
  });

  document.querySelector("#itemForm").addEventListener("submit", e => {
    e.preventDefault();
    const data = {
      name: document.querySelector("#itemNameInput").value,
      packageQuantity: parseDecimal(document.querySelector("#packageQuantityInput").value),
      packagePrice: parseDecimal(document.querySelector("#packagePriceInput").value),
      quantity: parseDecimal(document.querySelector("#itemQuantityInput").value),
      calories: Math.round(parseDecimal(document.querySelector("#itemCaloriesInput").value)),
      protein: parseDecimal(document.querySelector("#itemProteinInput").value),
      fat: parseDecimal(document.querySelector("#itemFatInput").value),
      carbs: parseDecimal(document.querySelector("#itemCarbsInput").value),
      price: parseDecimal(document.querySelector("#itemPriceInput").value),
      meal: document.querySelector("#itemMealSelect").value,
    };

    if (editingItem) {
      updateItem(editingItem.id, { ...data, date: editingItem.date, barcode: editingItem.barcode });
      showToast("Atualizado!");
    } else {
      addItem({ ...data, date: new Date().toISOString() });
      showToast("Guardado!");
    }
    closeModal();
  });
}

function bindModalChrome() {
  document.querySelector("#closeModalButton").addEventListener("click", closeModal);
  document.querySelector("#lookupBarcodeButton").addEventListener("click", () => lookupBarcode());
}

export function init() {
  renderMealSelectOptions();
  scanner.init();
  scanner.onDetected(code => lookupBarcode(code));
  bindModalChrome();
  bindSearch();
  bindForm();
}

function updateCalculatedPrice() {
  const packQtd = parseDecimal(document.querySelector("#packageQuantityInput").value);
  const packPrice = parseDecimal(document.querySelector("#packagePriceInput").value);
  const itemQtd = parseDecimal(document.querySelector("#itemQuantityInput").value);

  // Regra de 3 simples se os campos da embalagem existirem
  if (packQtd > 0 && packPrice > 0 && itemQtd > 0) {
    const finalPrice = (packPrice / packQtd) * itemQtd;
    document.querySelector("#itemPriceInput").value = decimalToInput(finalPrice);
  }
}