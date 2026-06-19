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