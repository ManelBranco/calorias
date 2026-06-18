import { MACRO_PLANS } from "./state.js";

export const MACRO_COLORS = {
  protein: "#1043af",
  fat: "#ff8f00",
  carbs: "#2e7d32",
};

export function calculateMacroTargets(calories, macroPlanKey) {
  const plan = MACRO_PLANS[macroPlanKey] ?? MACRO_PLANS.moderate;
  return {
    protein: (calories * plan.ratios.protein) / 100 / 4,
    fat: (calories * plan.ratios.fat) / 100 / 9,
    carbs: (calories * plan.ratios.carbs) / 100 / 4,
    plan,
  };
}
