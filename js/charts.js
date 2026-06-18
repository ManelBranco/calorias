import { debounce } from "./storage.js";

let macroChartInstance = null;
let weightChartInstance = null;
let spendingChartInstance = null;

const dayMonthFormatter = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit" });

function formatDayLabel(isoDate) {
  const parts = String(isoDate || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return String(isoDate || "");
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return dayMonthFormatter.format(date);
}

const updateMacroDonutInternal = debounce((protein, fat, carbs) => {
  const canvas = document.getElementById("macroDonutChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (macroChartInstance) {
    macroChartInstance.data.datasets[0].data = [protein, fat, carbs];
    macroChartInstance.update();
    return;
  }

  macroChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Proteína", "Gordura", "Hidratos"],
      datasets: [{
        data: [protein, fat, carbs],
        backgroundColor: ["#1043af", "#ff8f00", "#2e7d32"],
        borderWidth: 2,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: false,
      cutout: "72%",
      plugins: { legend: { display: false } }
    }
  });
}, 150);

export function updateMacroDonut(protein, fat, carbs) {
  updateMacroDonutInternal(protein, fat, carbs);
}

const updateWeightProgressChartInternal = debounce((weightHistory) => {
  const canvas = document.getElementById("weightProgressChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const labels = weightHistory.map(entry => formatDayLabel(entry.date));
  const data = weightHistory.map(entry => entry.weight);

  if (weightChartInstance) {
    weightChartInstance.data.labels = labels;
    weightChartInstance.data.datasets[0].data = data;
    weightChartInstance.update();
    return;
  }

  weightChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Peso (kg)",
        data: data,
        borderColor: "#2e7d32",
        backgroundColor: "rgba(46, 125, 50, 0.1)",
        tension: 0.3,
        fill: true,
        borderWidth: 3,
        pointBackgroundColor: "#2e7d32"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: false }
      }
    }
  });
}, 150);

export function updateWeightProgressChart(weightHistory) {
  updateWeightProgressChartInternal(weightHistory);
}

const updateSpendingChartInternal = debounce((items) => {
  const canvas = document.getElementById("spendingChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Agrupa o preço dos itens por data (YYYY-MM-DD)
  const totalsByDay = {};
  (items || []).forEach(item => {
    const day = String(item.date || "").slice(0, 10);
    if (!day) return;
    totalsByDay[day] = (totalsByDay[day] || 0) + Number(item.price || 0);
  });

  const sortedDays = Object.keys(totalsByDay).sort();
  const labels = sortedDays.map(formatDayLabel);
  const data = sortedDays.map(day => Math.round(totalsByDay[day] * 100) / 100);

  if (spendingChartInstance) {
    spendingChartInstance.data.labels = labels;
    spendingChartInstance.data.datasets[0].data = data;
    spendingChartInstance.update();
    return;
  }

  spendingChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Gasto (€)",
        data: data,
        backgroundColor: "#1043af",
        borderRadius: 6,
        maxBarThickness: 36
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}, 150);

export function updateSpendingChart(items) {
  updateSpendingChartInternal(items);
}
