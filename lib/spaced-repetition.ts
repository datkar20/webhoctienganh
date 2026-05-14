import type { FlashcardRating, MasteryLevel, VocabularyItem } from "@/types";

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function nextReviewDate(level: MasteryLevel) {
  if (level === "mastered") return addDays(30);
  if (level === "familiar") return addDays(7);
  return addDays(2);
}

export function updateVocabularyAfterAnswer(
  vocabulary: VocabularyItem,
  isCorrect: boolean,
  flashcardRating?: FlashcardRating
) {
  const currentCorrect = vocabulary.correctCount ?? 0;
  const currentWrong = vocabulary.wrongCount ?? 0;

  if (!isCorrect || flashcardRating === "forgot") {
    return {
      correctCount: currentCorrect,
      wrongCount: currentWrong + 1,
      masteryLevel: "weak" as MasteryLevel,
      lastReviewedAt: new Date(),
      nextReviewAt: addDays(1)
    };
  }

  const correctCount = currentCorrect + (flashcardRating === "mastered" ? 2 : 1);
  let masteryLevel: MasteryLevel = "learning";

  if (flashcardRating === "mastered" || (correctCount >= 5 && currentWrong <= 1)) {
    masteryLevel = "mastered";
  } else if (flashcardRating === "remembered" || correctCount >= 2) {
    masteryLevel = "familiar";
  } else {
    masteryLevel = "learning";
  }

  if (flashcardRating === "almost") {
    masteryLevel = "learning";
  }

  return {
    correctCount,
    wrongCount: currentWrong,
    masteryLevel,
    lastReviewedAt: new Date(),
    nextReviewAt: nextReviewDate(masteryLevel)
  };
}
