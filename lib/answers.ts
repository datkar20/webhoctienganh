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

function levenshteinDistance(a: string, b: string) {
  const matrix = Array.from({ length: a.length + 1 }, (_, index) => [index]);

  for (let column = 1; column <= b.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function similarity(a: string, b: string) {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - levenshteinDistance(a, b) / longest;
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

  if (matchedTokens.length > 0 && matchedTokens.join(" ").length >= 4) return true;

  const correctTokenList = Array.from(correctTokens);
  if (userTokens.length > 0 && correctTokenList.length > 0) {
    const similarTokens = userTokens.filter((userToken) =>
      correctTokenList.some((correctToken) => similarity(userToken, correctToken) >= 0.72)
    );
    const coverage = similarTokens.length / Math.max(userTokens.length, correctTokenList.length);
    if (similarTokens.length > 0 && coverage >= 0.45) return true;
  }

  return user.length >= 5 && correct.length >= 5 && similarity(user, correct) >= 0.68;
}
