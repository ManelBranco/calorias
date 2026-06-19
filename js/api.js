export const OPEN_FOOD_FACTS_FIELDS = [
  "product_name", "generic_name", "brands", "quantity", "product_quantity", "serving_size", "nutriments", "nutrition_grades", "image_front_url"
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

const REQUEST_TIMEOUT_MS = 10000;

export function handleApiError(error) {
  if (error?.name === "AbortError") return "Falha na rede: o pedido demorou demasiado tempo.";
  if (error instanceof TypeError) return "Falha na rede. Verifica a tua ligação.";
  if (error?.status) return "API indisponível. Tenta novamente mais tarde.";
  return "Ocorreu um erro inesperado.";
}

async function fetchWithTimeout(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      const error = new Error("Resposta inválida da API.");
      error.status = response.status;
      throw error;
    }
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function isValidNutriments(nutriments) {
  return nutriments && typeof nutriments === "object";
}

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
    const data = await fetchWithTimeout(url);

    if (data && Array.isArray(data.products)) {
      apiMatches = data.products
        .filter(p => p && typeof p.product_name === "string" && isValidNutriments(p.nutriments))
        .map(p => {
          const nut = p.nutriments;
          return {
            name: p.product_name_pt || p.product_name || "Produto OFF",
            calories: Math.round(Number(nut["energy-kcal_100g"]) || (Number(nut["energy_100g"]) / 4.184) || 0),
            protein: Number(nut.proteins_100g || 0),
            fat: Number(nut.fat_100g || 0),
            carbs: Number(nut.carbohydrates_100g || 0),
            source: p.brands ? `OFF - ${p.brands}` : "Open Food Facts",
            isLocal: false,
            // Guardamos o valor numérico ou tentamos extrair o parseFloat da string como fallback
            packageQuantity: p.product_quantity ? Number(p.product_quantity) : (parseFloat(p.quantity) || null)
          };
        });
    }
  } catch (err) {
    console.warn(handleApiError(err), err);
  }
  // Combina resultados locais e da API, garantindo que os locais aparecem primeiro
  return [...localMatches, ...apiMatches];
}

export async function fetchProductByEan(barcode) {
  if (!barcode) return null;
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${OPEN_FOOD_FACTS_FIELDS}`;
  const data = await fetchWithTimeout(url);

  if (data?.status === 1 && data.product && isValidNutriments(data.product.nutriments)) {
    return data.product;
  }
  return null;
}
