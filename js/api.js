export const OPEN_FOOD_FACTS_FIELDS = [
  "product_name", "generic_name", "brands", "quantity", "serving_size", "nutriments", "nutrition_grades", "image_front_url"
].join(",");

// Base de Dados Local - Valores de Referência (por 100g/100ml) Baseados no INSA
const LOCAL_TCA = [
  { name: "Peito de Frango (Cru)", calories: 110, protein: 23, fat: 1.2, carbs: 0, source: "TCA INSA" },
  { name: "Peito de Frango (Grelhado)", calories: 165, protein: 31, fat: 3.6, carbs: 0, source: "TCA INSA" },
  { name: "Carne de Vaca Magra", calories: 130, protein: 22, fat: 4.5, carbs: 0, source: "TCA INSA" },
  { name: "Ovo Inteiro Cozido", calories: 155, protein: 13, fat: 11, carbs: 1.1, source: "TCA INSA" },
  { name: "Clara de Ovo", calories: 52, protein: 11, fat: 0.2, carbs: 0.7, source: "TCA INSA" },
  { name: "Arroz Branco Cozido", calories: 130, protein: 2.7, fat: 0.3, carbs: 28, source: "TCA INSA" },
  { name: "Arroz Basmati Cozido", calories: 120, protein: 3.5, fat: 0.4, carbs: 25, source: "TCA INSA" },
  { name: "Massa Esparguete Cozida", calories: 158, protein: 5.8, fat: 0.9, carbs: 31, source: "TCA INSA" },
  { name: "Batata Doce Cozida", calories: 86, protein: 1.6, fat: 0.1, carbs: 20, source: "TCA INSA" },
  { name: "Azeite Virgem Extra", calories: 884, protein: 0, fat: 100, carbs: 0, source: "TCA INSA" },
  { name: "Atum em Água (Lata)", calories: 116, protein: 26, fat: 1, carbs: 0, source: "TCA INSA" },
  { name: "Salmão Grelhado", calories: 206, protein: 22, fat: 12, carbs: 0, source: "TCA INSA" },
  { name: "Aveia em Flocos", calories: 389, protein: 16.9, fat: 6.9, carbs: 66, source: "TCA INSA" },
  { name: "Maçã", calories: 52, protein: 0.3, fat: 0.2, carbs: 14, source: "TCA INSA" },
  { name: "Banana", calories: 89, protein: 1.1, fat: 0.3, carbs: 23, source: "TCA INSA" }
];

export async function searchFoodCombined(query) {
  if (!query || query.trim().length < 2) return [];
  const cleanQuery = query.toLowerCase().trim();

  // 1. Pesquisa na Base Local (TCA)
  const localMatches = LOCAL_TCA.filter(food => 
    food.name.toLowerCase().includes(cleanQuery)
  ).map(item => ({ ...item, isLocal: true }));

  // 2. Pesquisa na Open Food Facts
  let apiMatches = [];
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(cleanQuery)}&search_simple=1&action=process&json=1&page_size=8&fields=${OPEN_FOOD_FACTS_FIELDS}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.products) {
      apiMatches = data.products
        .filter(p => p.product_name && p.nutriments)
        .map(p => {
          const nut = p.nutriments;
          return {
            name: p.product_name_pt || p.product_name || "Produto OFF",
            calories: Math.round(nut['energy-kcal_100g'] || (nut['energy_100g'] / 4.184) || 0),
            protein: Number(nut.proteins_100g || 0),
            fat: Number(nut.fat_100g || 0),
            carbs: Number(nut.carbohydrates_100g || 0),
            source: p.brands ? `OFF - ${p.brands}` : "Open Food Facts",
            isLocal: false
          };
        });
    }
  } catch (err) {
    console.warn("Falha ao ligar à API do OFF.", err);
  }

  // Devolve TCA primeiro, depois OFF
  return [...localMatches, ...apiMatches];
}

export async function fetchProductByEan(barcode) {
  if (!barcode) return null;
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${OPEN_FOOD_FACTS_FIELDS}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Resposta inválida da API.");
  const data = await response.json();
  
  if (data.status === 1 && data.product) {
    return data.product;
  }
  return null;
}