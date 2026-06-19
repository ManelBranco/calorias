import { ACTIVITY_LEVELS, GOALS } from "./state.js";
import { getDatesForLast7Days } from "./utils.js"; // NOVO IMPORT

// Cálculos para o Gráfico e Card de Média Semanal
export function calculateWeeklyStats(items, referenceDateStr) {
   const last7Days = getDatesForLast7Days(referenceDateStr);
   
   // Filtra apenas os itens consumidos nestes 7 dias
   const weeklyItems = items.filter(item => {
       const itemDate = item.date.split("T")[0];
       return last7Days.includes(itemDate);
   });

   const totalCalories = weeklyItems.reduce((sum, item) => sum + (item.calories || 0), 0);
   const totalSpent = weeklyItems.reduce((sum, item) => sum + (item.price || 0), 0);
   
   return {
       averageCalories: Math.round(totalCalories / 7),
       totalSpent: totalSpent,
       weeklyItems: weeklyItems // Retornamos os itens para usar na lista de compras
   };
}

// Calorias dia-a-dia dos últimos 7 dias (para o gráfico de barras + linha de média)
export function calculateDailyCaloriesLast7Days(items, referenceDateStr) {
  const last7Days = getDatesForLast7Days(referenceDateStr);
  const totalsByDay = Object.fromEntries(last7Days.map(d => [d, 0]));

  items.forEach(item => {
    const itemDate = String(item.date || "").split("T")[0];
    if (totalsByDay[itemDate] !== undefined) {
      totalsByDay[itemDate] += item.calories || 0;
    }
  });

  const values = last7Days.map(d => Math.round(totalsByDay[d]));
  const average = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  return { labels: last7Days, values, average };
}

// O Motor da Lista de Compras / Despensa (O teu "Masterplan")
export function generateShoppingList(weeklyItems, favorites) {
   const list = favorites.map(fav => {
       // Procura todos os consumos deste favorito na última semana
       const consumed = weeklyItems.filter(i => i.name === fav.name);
       
       const totalQuantity = consumed.reduce((sum, i) => sum + (i.quantity || 0), 0);
       const totalCost = consumed.reduce((sum, i) => sum + (i.price || 0), 0);
       
       return {
           ...fav, // Mantém os dados base (preço do pacote, calorias, etc)
           weeklyQuantity: totalQuantity,
           weeklyCost: totalCost
       };
   });
   
   // Ordena do alimento em que gastas mais dinheiro para o que gastas menos
   return list.sort((a, b) => b.weeklyCost - a.weeklyCost);
}