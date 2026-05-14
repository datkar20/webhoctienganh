export function vocabularyProgressWeight(item: { masteryLevel: string; correctCount?: number; wrongCount?: number }) {
  if (item.masteryLevel === "mastered") return 100;
  if (item.masteryLevel === "familiar") return 70;
  if (item.masteryLevel === "learning") return 40;
  if (item.masteryLevel === "weak") return 15;
  const correct = item.correctCount ?? 0;
  const wrong = item.wrongCount ?? 0;
  if (correct + wrong > 0) return Math.min(35, correct * 12);
  return 0;
}

export function vocabularyProgressPercent(items: Array<{ masteryLevel: string; correctCount?: number; wrongCount?: number }>) {
  if (items.length === 0) return 0;
  const points = items.reduce((sum, item) => sum + vocabularyProgressWeight(item), 0);
  return Math.round(points / items.length);
}
