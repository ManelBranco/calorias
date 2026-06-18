import { loadState } from './state.js';
import { initUI } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Carrega os dados antigos do utilizador a partir do LocalStorage
  loadState();
  
  // 2. Injeta os dados na UI, liga os eventos e gera os Gráficos
  initUI();
  
  console.log("Sistema Modular Iniciado: TCA Integrada + Chart.js Ativos.");
});