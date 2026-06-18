import { state, onChange, addWeightEntry } from "./state.js";
import { updateWeightProgressChart } from "./charts.js";
import { showToast } from "./utils.js";

function render() {
  updateWeightProgressChart(state.weightHistory);
}

function bindEvents() {
  document.querySelector("#weightLogDate").value = new Date().toISOString().split("T")[0];
  document.querySelector("#addWeightLogButton").addEventListener("click", () => {
    const date = document.querySelector("#weightLogDate").value;
    const weight = parseFloat(document.querySelector("#weightLogValue").value);
    if (!date || !Number.isFinite(weight)) return;
    addWeightEntry({ date, weight });
    document.querySelector("#weightLogValue").value = "";
    showToast("Peso guardado no histórico.");
  });
}

export function init() {
  bindEvents();
  render();
  onChange(render);
}
