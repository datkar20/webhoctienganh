import { VIETNAMESE_FILLER_WORDS } from "@/data/stop-words";

export function normalizeAnswer(answer: string) {
  return answer
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function meaningfulTokens(value: string) {
  return normalizeAnswer(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !VIETNAMESE_FILLER_WORDS.has(token));
}

export function checkAnswer(userAnswer: string, correctAnswer: string) {
  const user = normalizeAnswer(userAnswer);
  const correct = normalizeAnswer(correctAnswer);

  if (!user || !correct) return false;
  if (user === correct) return true;

  const longEnough = user.length >= 4;
  if (longEnough && correct.includes(user)) return true;
  if (correct.length >= 4 && user.includes(correct)) return true;

  const correctParts = correct
    .split(/\s*(?:,|;|\/|\bor\b|\band\b|\bhoac\b|\bva\b)\s*/u)
    .filter(Boolean);
  if (correctParts.some((part) => longEnough && part.includes(user))) return true;

  const userTokens = meaningfulTokens(userAnswer);
  const correctTokens = new Set(meaningfulTokens(correctAnswer));
  const matchedTokens = userTokens.filter((token) => correctTokens.has(token));

  return matchedTokens.length > 0 && matchedTokens.join(" ").length >= 4;
}
