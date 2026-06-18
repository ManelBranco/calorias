import { ACTIVITY_LEVELS, GOALS } from "./state.js";

export function calculateProfile(profile) {
  const age = Math.max(0, Number(profile.age) || 0);
  const weight = Math.max(0, Number(profile.weight) || 0);
  const height = Math.max(0, Number(profile.height) || 0);
  const genderOffset = profile.gender === "female" ? -161 : 5;
  const bmr = 10 * weight + 6.25 * height - 5 * age + genderOffset;
  const activity = ACTIVITY_LEVELS[profile.activity] ?? ACTIVITY_LEVELS.sedentary;
  const goal = GOALS[profile.goal] ?? GOALS.maintain;
  const tdee = bmr * activity.multiplier;
  return { bmr, tdee, dailyGoal: Math.max(0, tdee + goal.adjustment), activity, goal };
}

export function calculateMusclePotential(height) {
  const safeHeight = Math.max(0, Number(height) || 0);
  const fiveWeight = Math.max(0, safeHeight - 100);
  const estLean = fiveWeight * 0.95;
  return {
    five: fiveWeight,
    ten: estLean / 0.9,
    fifteen: estLean / 0.85,
  };
}
